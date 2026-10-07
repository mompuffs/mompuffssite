"use client";

import { useEffect, useRef, useState } from "react";

// PayPal subscription checkout for directory premium. Renders PayPal's own
// button plus a separate "Debit or Credit Card" button, so buyers without a
// PayPal account can pay by card (PayPal processes the card; the money lands
// in the MomPuffs PayPal account).
//
// Loaded under its own namespace: the store checkout loads PayPal's SDK
// with one-time-capture options, and the two can't share one script.
const NAMESPACE = "paypalSubscriptions";

function useSubscriptionSdk(clientId: string) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if ((window as any)[NAMESPACE]) {
      setReady(true);
      return;
    }
    const id = "paypal-sdk-subscriptions";
    let script = document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = id;
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&vault=true&intent=subscription&currency=USD&enable-funding=card`;
      script.setAttribute("data-namespace", NAMESPACE);
      document.body.appendChild(script);
    }
    const onLoad = () => setReady(true);
    const onError = () => setFailed(true);
    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);
    return () => {
      script?.removeEventListener("load", onLoad);
      script?.removeEventListener("error", onError);
    };
  }, [clientId]);
  return { ready, failed };
}

export default function PayPalSubscribeButtons({
  clientId,
  planId,
  getCustomId,
  beforeOpen,
  onApproved,
  onError,
}: {
  clientId: string;
  planId: string;
  // The listing ID the subscription is for. May create it first (submit flow).
  getCustomId: () => Promise<string>;
  // Return false to stop before PayPal opens (e.g. the form is incomplete).
  beforeOpen?: () => boolean;
  onApproved: (subscriptionId: string) => Promise<void> | void;
  onError: (message: string) => void;
}) {
  const paypalRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const { ready, failed } = useSubscriptionSdk(clientId);
  const [cardEligible, setCardEligible] = useState<boolean | null>(null);

  // Latest callbacks without re-rendering PayPal's iframes on every keystroke.
  const cb = useRef({ getCustomId, beforeOpen, onApproved, onError });
  cb.current = { getCustomId, beforeOpen, onApproved, onError };

  useEffect(() => {
    const paypal = (window as any)[NAMESPACE];
    if (!ready || !paypal || !paypalRef.current || !cardRef.current) return;

    const shared = {
      onClick: (_data: any, actions: any) => (cb.current.beforeOpen?.() === false ? actions.reject() : actions.resolve()),
      createSubscription: async (_data: any, actions: any) => {
        try {
          const customId = await cb.current.getCustomId();
          return actions.subscription.create({ plan_id: planId, custom_id: customId });
        } catch (err: any) {
          cb.current.onError(err?.message ?? "Couldn't start checkout.");
          throw err;
        }
      },
      onApprove: async (data: any) => {
        await cb.current.onApproved(data.subscriptionID);
      },
      onError: () => cb.current.onError("PayPal ran into a problem. Please try again."),
    };

    paypalRef.current.innerHTML = "";
    cardRef.current.innerHTML = "";
    const rendered: any[] = [];

    const ppButton = paypal.Buttons({
      ...shared,
      fundingSource: paypal.FUNDING.PAYPAL,
      style: { label: "subscribe", shape: "pill", height: 42 },
    });
    if (ppButton.isEligible()) {
      ppButton.render(paypalRef.current);
      rendered.push(ppButton);
    }

    const cardButton = paypal.Buttons({
      ...shared,
      fundingSource: paypal.FUNDING.CARD,
      style: { shape: "pill", height: 42 },
    });
    const eligible = cardButton.isEligible();
    setCardEligible(eligible);
    if (eligible) {
      cardButton.render(cardRef.current);
      rendered.push(cardButton);
    }

    return () => {
      for (const b of rendered) {
        try {
          b.close();
        } catch {
          // already torn down
        }
      }
    };
  }, [ready, planId]);

  if (failed) return <p className="text-sm text-red-600">Couldn&apos;t load PayPal. Check your connection and refresh.</p>;

  return (
    <div className="max-w-sm space-y-2">
      {!ready && <p className="text-sm text-gray-500">Loading payment options…</p>}
      <div ref={paypalRef} />
      <div ref={cardRef} />
      {ready && cardEligible && (
        <p className="text-xs text-gray-500">Pay with your PayPal account, or with any debit or credit card. No PayPal account needed.</p>
      )}
      {ready && cardEligible === false && (
        <p className="text-xs text-amber-700">Card payments aren&apos;t available right now; please use PayPal.</p>
      )}
    </div>
  );
}
