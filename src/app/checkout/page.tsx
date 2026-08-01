"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartContext";
import { formatCents } from "@/lib/money";

export default function CheckoutPage() {
  const { items, totalCents, clear } = useCart();
  const router = useRouter();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function placeOrder() {
    setPlacing(true);
    setError(null);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
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

  if (items.length === 0) {
    return <p className="text-center text-gray-500 mt-12">Your cart is empty.</p>;
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow p-6">
      <h1 className="text-xl font-bold mb-4">Checkout</h1>
      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3 mb-4">
        This is a prototype checkout — no real payment is processed. Clicking
        &quot;Place order&quot; simulates a successful payment.
      </p>
      <ul className="text-sm space-y-1 mb-4">
        {items.map((i) => (
          <li key={i.productId} className="flex justify-between">
            <span>{i.title} × {i.quantity}</span>
            <span>{formatCents(i.priceCents * i.quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="flex justify-between font-semibold border-t pt-2 mb-4">
        <span>Total</span>
        <span>{formatCents(totalCents)}</span>
      </div>
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
      <button
        onClick={placeOrder}
        disabled={placing}
        className="w-full bg-brand-600 text-white rounded py-2 font-medium hover:bg-brand-700 disabled:opacity-60"
      >
        {placing ? "Placing order…" : "Place order (simulated)"}
      </button>
    </div>
  );
}
