"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ShippingSettingsPage() {
  const [flatRate, setFlatRate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/shop/shipping")
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.flatShippingCents === "number") {
          setFlatRate((data.flatShippingCents / 100).toFixed(2));
        }
        setLoading(false);
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const cents = Math.round(parseFloat(flatRate || "0") * 100);
    const res = await fetch("/api/shop/shipping", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flatShippingCents: cents }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not save.");
      return;
    }
    setSaved(true);
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">Shipping</h1>
        <Link href="/dashboard/shop" className="text-sm text-brand-600 hover:underline">
          ← Back to shop
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Set your shop's default flat-rate shipping charge here. Any product can instead be given its own
        shipping cost from the product list -- edit each one under "Shipping".
      </p>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <form onSubmit={handleSave} className="bg-white rounded-xl shadow p-4 space-y-2">
          <h3 className="font-semibold text-sm">Flat rate shipping</h3>
          <p className="text-xs text-gray-500">
            Charged once per order for any products still set to "Flat rate" shipping (the default).
          </p>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={flatRate}
            onChange={(e) => setFlatRate(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {saved && <p className="text-green-700 text-sm">Saved.</p>}
          <button
            type="submit"
            disabled={saving}
            className="bg-brand-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
      )}
    </div>
  );
}
