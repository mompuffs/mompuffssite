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

type AddressForm = {
  name: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

const EMPTY_ADDRESS: AddressForm = {
  name: "",
  phone: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  zip: "",
  country: "US",
};

function addressPayload(a: AddressForm) {
  return {
    name: a.name,
    address1: a.address1,
    address2: a.address2 || undefined,
    city: a.city,
    state: a.state,
    zip: a.zip,
    country: a.country,
  };
}

function isAddressComplete(a: AddressForm) {
  return Boolean(a.name.trim() && a.address1.trim() && a.city.trim() && a.state.trim() && a.zip.trim() && a.country.trim());
}

export default function CheckoutPage() {
  const { items, totalCents, clear } = useCart();
  const router = useRouter();
  const [step, setStep] = useState<"address" | "review">("address");

  const [billing, setBilling] = useState<AddressForm>(EMPTY_ADDRESS);
  const [shipToBilling, setShipToBilling] = useState(true);
  const [shippingAddr, setShippingAddr] = useState<AddressForm>(EMPTY_ADDRESS);
  const [addressError, setAddressError] = useState<string | null>(null);

  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [couponInput, setCouponInput] = useState("");
  const [applying, setApplying] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  const [paypalClientId, setPaypalClientId] = useState<string | null>(null);
  const [stripePublishableKey, setStripePublishableKey] = useState<string | null>(null);
  const [shippingCents, setShippingCents] = useState(0);

  const discountCents = appliedCoupon?.discountCents ?? 0;
  const finalTotalCents = Math.max(0, totalCents - discountCents) + shippingCents;

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

  useEffect(() => {
    if (items.length === 0) {
      setShippingCents(0);
      return;
    }
    fetch("/api/checkout/shipping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    })
      .then((r) => r.json())
      .then((data) => setShippingCents(data.shippingCents ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items)]);

  const hasRealPayment = Boolean(paypalClientId || stripePublishableKey);

  const effectiveShipping = shipToBilling ? billing : shippingAddr;

  function updateBilling(field: keyof AddressForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setBilling((b) => ({ ...b, [field]: e.target.value }));
  }
  function updateShippingAddr(field: keyof AddressForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setShippingAddr((s) => ({ ...s, [field]: e.target.value }));
  }

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    setAddressError(null);
    if (!isAddressComplete(billing)) {
      setAddressError("Please fill in your billing name and address.");
      return;
    }
    if (!shipToBilling && !isAddressComplete(shippingAddr)) {
      setAddressError("Please fill in the shipping name and address.");
      return;
    }
    setStep("review");
  }

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
      body: JSON.stringify({
        items,
        couponCode: appliedCoupon?.code,
        billing: addressPayload(billing),
        shipping: addressPayload(effectiveShipping),
        contactPhone: billing.phone || undefined,
      }),
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

  if (step === "address") {
    return (
      <div className="max-w-md mx-auto bg-white rounded-xl shadow p-6">
        <h1 className="text-xl font-bold mb-4">Shipping & billing</h1>
        <form onSubmit={handleContinue} className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold mb-2">Billing information</h2>
            <div className="space-y-2">
              <input
                required
                placeholder="Full name"
                value={billing.name}
                onChange={updateBilling("name")}
                className="w-full border rounded px-3 py-2 text-sm"
              />
              <input
                placeholder="Phone (optional)"
                value={billing.phone}
                onChange={updateBilling("phone")}
                className="w-full border rounded px-3 py-2 text-sm"
              />
              <input
                required
                placeholder="Address line 1"
                value={billing.address1}
                onChange={updateBilling("address1")}
                className="w-full border rounded px-3 py-2 text-sm"
              />
              <input
                placeholder="Address line 2 (optional)"
                value={billing.address2}
                onChange={updateBilling("address2")}
                className="w-full border rounded px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  required
                  placeholder="City"
                  value={billing.city}
                  onChange={updateBilling("city")}
                  className="border rounded px-3 py-2 text-sm"
                />
                <input
                  required
                  placeholder="State"
                  value={billing.state}
                  onChange={updateBilling("state")}
                  className="border rounded px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  required
                  placeholder="ZIP / postal code"
                  value={billing.zip}
                  onChange={updateBilling("zip")}
                  className="border rounded px-3 py-2 text-sm"
                />
                <input
                  required
                  placeholder="Country (e.g. US)"
                  value={billing.country}
                  onChange={updateBilling("country")}
                  className="border rounded px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={shipToBilling} onChange={(e) => setShipToBilling(e.target.checked)} />
            Ship to this address
          </label>

          {!shipToBilling && (
            <div>
              <h2 className="text-sm font-semibold mb-2">Shipping information</h2>
              <div className="space-y-2">
                <input
                  required
                  placeholder="Full name"
                  value={shippingAddr.name}
                  onChange={updateShippingAddr("name")}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
                <input
                  required
                  placeholder="Address line 1"
                  value={shippingAddr.address1}
                  onChange={updateShippingAddr("address1")}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
                <input
                  placeholder="Address line 2 (optional)"
                  value={shippingAddr.address2}
                  onChange={updateShippingAddr("address2")}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    required
                    placeholder="City"
                    value={shippingAddr.city}
                    onChange={updateShippingAddr("city")}
                    className="border rounded px-3 py-2 text-sm"
                  />
                  <input
                    required
                    placeholder="State"
                    value={shippingAddr.state}
                    onChange={updateShippingAddr("state")}
                    className="border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    required
                    placeholder="ZIP / postal code"
                    value={shippingAddr.zip}
                    onChange={updateShippingAddr("zip")}
                    className="border rounded px-3 py-2 text-sm"
                  />
                  <input
                    required
                    placeholder="Country (e.g. US)"
                    value={shippingAddr.country}
                    onChange={updateShippingAddr("country")}
                    className="border rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {addressError && <p className="text-red-600 text-sm">{addressError}</p>}

          <button
            type="submit"
            className="w-full bg-brand-600 text-white rounded py-2 font-medium hover:bg-brand-700"
          >
            Continue to review
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Review your order</h1>
        <button onClick={() => setStep("address")} className="text-sm text-brand-600 hover:underline">
          ← Edit address
        </button>
      </div>

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

      <div className="text-xs text-gray-500 mb-4 border rounded p-2">
        <p className="font-medium text-gray-700">Shipping to</p>
        <p>{effectiveShipping.name}</p>
        <p>
          {effectiveShipping.address1}
          {effectiveShipping.address2 ? `, ${effectiveShipping.address2}` : ""}
        </p>
        <p>
          {effectiveShipping.city}, {effectiveShipping.state} {effectiveShipping.zip}
        </p>
        <p>{effectiveShipping.country}</p>
      </div>

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
        <div className="flex justify-between text-sm">
          <span>Shipping</span>
          <span>{shippingCents > 0 ? formatCents(shippingCents) : "Free"}</span>
        </div>
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
          billing={addressPayload(billing)}
          shipping={addressPayload(effectiveShipping)}
          contactPhone={billing.phone || undefined}
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
          billing={addressPayload(billing)}
          shipping={addressPayload(effectiveShipping)}
          contactPhone={billing.phone || undefined}
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
