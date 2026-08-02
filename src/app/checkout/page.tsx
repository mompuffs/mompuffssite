"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart, cartLineKey } from "@/components/CartContext";
import { formatCents } from "@/lib/money";
import PayPalCheckoutButton from "@/components/PayPalCheckoutButton";
import StripeCheckoutForm from "@/components/StripeCheckoutForm";

type AppliedCoupon = {
  code: string;
  type: "PERCENT" | "FIXED";
  amount: number;
  shopId: string;
  shopName: string;
  discountCents: number;
};

export default function CheckoutPage() {
  const { items, totalCents, clear } = useCart();
  const router = useRouter();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [couponInput, setCouponInput] = useState("");
  const [applying, setApplying] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  const [paypalClientId, setPaypalClientId] = useState<string | null>(null);
  const [stripePublishableKey, setStripePublishableKey] = useState<string | null>(null);

  const discountCents = appliedCoupon?.discountCents ?? 0;
  const finalTotalCents = Math.max(0, totalCents - discountCents);

  // Real-payment checkout only supports one shop's items at a time (a single
  // order pays into a single connected account).
  const shopIds = Array.from(new Set(items.map((i) => i.shopId)));
  const singleShopId = shopIds.length === 1 ? shopIds[0] : null;

  useEffect(() => {
    if (!singleShopId) {
      setPaypalClientId(null);
      return;
    }
    fetch(`/api/checkout/paypal/config?shopId=${encodeURIComponent(singleShopId)}`)
      .then((r) => r.json())
      .then((data) => setPaypalClientId(data.available ? data.clientId : null));
  }, [singleShopId]);

  useEffect(() => {
    if (!singleShopId) {
      setStripePublishableKey(null);
      return;
    }
    fetch(`/api/checkout/stripe/config?shopId=${encodeURIComponent(singleShopId)}`)
      .then((r) => r.json())
      .then((data) => setStripePublishableKey(data.available ? data.publishableKey : null));
  }, [singleShopId]);

  const hasRealPayment = Boolean(paypalClientId || stripePublishableKey);

  async function applyCoupon() {
    if (!couponInput.trim()) return;
    setApplying(true);
    setCouponError(null);
    const res = await fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: couponInput, items }),
    });
    const data = await res.json();
    setApplying(false);
    if (!res.ok || !data.valid) {
      setCouponError(data.error ?? "Could not apply that code.");
      setAppliedCoupon(null);
      return;
    }
    setAppliedCoupon(data);
    setCouponInput("");
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponError(null);
  }

  async function placeSimulatedOrder() {
    setPlacing(true);
    setError(null);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, couponCode: appliedCoupon?.code }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not place order.");
      setPlacing(false);
      return;
    }
    clear();
    router.push("/orders");
  }

  function handlePaymentSuccess() {
    clear();
    router.push("/orders");
  }

  if (items.length === 0) {
    return <p className="text-center text-gray-500 mt-12">Your cart is empty.</p>;
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow p-6">
      <h1 className="text-xl font-bold mb-4">Checkout</h1>
      <ul className="text-sm space-y-1 mb-4">
        {items.map((i) => (
          <li key={cartLineKey(i)} className="flex justify-between">
            <span>
              {i.title}
              {i.variantLabel ? ` (${i.variantLabel})` : ""} × {i.quantity}
            </span>
            <span>{formatCents(i.priceCents * i.quantity)}</span>
          </li>
        ))}
      </ul>

      {shopIds.length > 1 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-4">
          Your cart has items from multiple shops. Real payment checkout supports one shop at a time -- you can
          still place a simulated order, or remove items so only one shop remains.
        </p>
      )}

      <div className="mb-4">
        {appliedCoupon ? (
          <div className="flex items-center justify-between text-sm bg-green-50 border border-green-200 rounded p-2">
            <span>
              Code <span className="font-medium">{appliedCoupon.code}</span> applied ({appliedCoupon.shopName})
            </span>
            <button onClick={removeCoupon} className="text-red-500 hover:underline">
              Remove
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              placeholder="Promo code"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              className="flex-1 border rounded px-3 py-1.5 text-sm"
            />
            <button
              onClick={applyCoupon}
              disabled={applying || !couponInput.trim()}
              className="bg-gray-100 border rounded px-3 py-1.5 text-sm font-medium hover:bg-gray-200 disabled:opacity-60"
            >
              {applying ? "Checking…" : "Apply"}
            </button>
          </div>
        )}
        {couponError && <p className="text-red-600 text-xs mt-1">{couponError}</p>}
      </div>

      <div className="space-y-1 mb-4">
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span>{formatCents(totalCents)}</span>
        </div>
        {discountCents > 0 && (
          <div className="flex justify-between text-sm text-green-700">
            <span>Discount</span>
            <span>-{formatCents(discountCents)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold border-t pt-2">
          <span>Total</span>
          <span>{formatCents(finalTotalCents)}</span>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

      {stripePublishableKey && (
        <StripeCheckoutForm
          items={items}
          couponCode={appliedCoupon?.code}
          publishableKey={stripePublishableKey}
          amountCents={finalTotalCents}
          onSuccess={handlePaymentSuccess}
          onError={setError}
        />
      )}

      {paypalClientId && stripePublishableKey && (
        <div className="flex items-center gap-2 my-3">
          <div className="flex-1 border-t" />
          <span className="text-xs text-gray-400">or</span>
          <div className="flex-1 border-t" />
        </div>
      )}

      {paypalClientId && (
        <PayPalCheckoutButton
          items={items}
          couponCode={appliedCoupon?.code}
          clientId={paypalClientId}
          onSuccess={handlePaymentSuccess}
          onError={setError}
        />
      )}

      {hasRealPayment && (
        <div className="flex items-center gap-2 my-3">
          <div className="flex-1 border-t" />
          <span className="text-xs text-gray-400">or</span>
          <div className="flex-1 border-t" />
        </div>
      )}

      <button
        onClick={placeSimulatedOrder}
        disabled={placing}
        className="w-full bg-brand-600 text-white rounded py-2 font-medium hover:bg-brand-700 disabled:opacity-60"
      >
        {placing ? "Placing order…" : hasRealPayment ? "Place order (simulated, no real payment)" : "Place order (simulated)"}
      </button>
      {!hasRealPayment && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mt-3">
          No real payment processor connected for this order yet -- this simulates a successful payment.
        </p>
      )}
    </div>
  );
}
