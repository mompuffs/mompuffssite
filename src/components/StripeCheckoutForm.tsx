"use client";

import { useEffect, useRef, useState } from "react";

export default function StripeCheckoutForm({
  items,
  couponCode,
  publishableKey,
  amountCents,
  billing,
  shipping,
  contactPhone,
  onSuccess,
  onError,
}: {
  items: any[];
  couponCode?: string;
  publishableKey: string;
  amountCents: number;
  billing?: { name?: string; address1?: string; address2?: string; city?: string; state?: string; zip?: string; country?: string };
  shipping?: Record<string, string | undefined>;
  contactPhone?: string;
  onSuccess: (order: any) => void;
  onError: (message: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<any>(null);
  const elementsRef = useRef<any>(null);
  const [sdkReady, setSdkReady] = useState(Boolean((window as any).Stripe));
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if ((window as any).Stripe) {
      setSdkReady(true);
      return;
    }
    const existing = document.getElementById("stripe-sdk") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => setSdkReady(true));
      return;
    }
    const script = document.createElement("script");
    script.id = "stripe-sdk";
    script.src = "https://js.stripe.com/v3/";
    script.onload = () => setSdkReady(true);
    script.onerror = () => onError("Could not load Stripe.");
    document.body.appendChild(script);
  }, [onError]);

  useEffect(() => {
    setClientSecret(null);
    setPaymentIntentId(null);
    setReady(false);
    fetch("/api/checkout/stripe/create-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, couponCode, shipping }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          onError(data.error ?? "Could not start Stripe checkout.");
          return;
        }
        setClientSecret(data.clientSecret);
        setPaymentIntentId(data.paymentIntentId);
      })
      .catch(() => onError("Could not start Stripe checkout."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items), couponCode, JSON.stringify(shipping)]);

  async function finishOrder(confirmedPaymentIntentId: string) {
    const res = await fetch("/api/checkout/stripe/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentIntentId: confirmedPaymentIntentId,
        items,
        couponCode,
        billing,
        shipping,
        contactPhone,
      }),
    });
    const order = await res.json();
    if (!res.ok) {
      onError(order.error ?? "Payment could not be completed.");
      return;
    }
    onSuccess(order);
  }

  useEffect(() => {
    if (!sdkReady) return;
    const params = new URLSearchParams(window.location.search);
    const returnedSecret = params.get("payment_intent_client_secret");
    if (!returnedSecret) return;

    const stripe = (window as any).Stripe(publishableKey);
    stripe.retrievePaymentIntent(returnedSecret).then(({ paymentIntent }: any) => {
      window.history.replaceState(null, "", window.location.pathname);
      if (paymentIntent?.status === "succeeded") {
        finishOrder(paymentIntent.id);
      } else if (paymentIntent?.status) {
        onError(`Payment not completed (status: ${paymentIntent.status}).`);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkReady]);

  useEffect(() => {
    if (!sdkReady || !clientSecret || !containerRef.current || !(window as any).Stripe) return;
    const stripe = (window as any).Stripe(publishableKey);
    const elements = stripe.elements({ clientSecret });
    const paymentElement = elements.create("payment");
    paymentElement.mount(containerRef.current);
    paymentElement.on("ready", () => setReady(true));
    stripeRef.current = stripe;
    elementsRef.current = elements;

    return () => {
      try {
        paymentElement.unmount();
      } catch {
        // already unmounted
      }
    };
  }, [sdkReady, clientSecret, publishableKey]);

  async function handlePay() {
    if (!stripeRef.current || !elementsRef.current || !paymentIntentId) return;
    setPaying(true);
    const { error, paymentIntent } = await stripeRef.current.confirmPayment({
      elements: elementsRef.current,
      confirmParams: {
        return_url: window.location.href,
        ...(billing?.name
          ? {
              payment_method_data: {
                billing_details: {
                  name: billing.name,
                  phone: contactPhone || undefined,
                  address: {
                    line1: billing.address1 || undefined,
                    line2: billing.address2 || undefined,
                    city: billing.city || undefined,
                    state: billing.state || undefined,
                    postal_code: billing.zip || undefined,
                    country: billing.country || undefined,
                  },
                },
              },
            }
          : {}),
      },
      redirect: "if_required",
    });
    setPaying(false);
    if (error) {
      onError(error.message ?? "Payment failed.");
      return;
    }
    if (paymentIntent?.status === "succeeded") {
      finishOrder(paymentIntent.id);
    } else if (paymentIntent?.status) {
      onError(`Payment not completed (status: ${paymentIntent.status}).`);
    }
  }

  return (
    <div className="mt-2">
      <div ref={containerRef} />
      {clientSecret && (
        <button
          onClick={handlePay}
          disabled={!ready || paying}
          className="w-full mt-3 bg-[#635bff] text-white rounded py-2 font-medium hover:opacity-90 disabled:opacity-60"
        >
          {paying
            ? "Processing…"
            : `Pay ${(amountCents / 100).toLocaleString(undefined, { style: "currency", currency: "USD" })} with card`}
        </button>
      )}
    </div>
  );
}
