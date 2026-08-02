"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCents } from "@/lib/money";

type Coupon = {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  amount: number;
  isActive: boolean;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  minOrderCents: number | null;
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [form, setForm] = useState({ code: "", type: "PERCENT", amount: "", maxUses: "", expiresAt: "", minOrder: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    fetch("/api/shop/coupons")
      .then((r) => r.json())
      .then(setCoupons);
  }

  useEffect(load, []);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/shop/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: form.code,
        type: form.type,
        amount: form.amount,
        maxUses: form.maxUses || undefined,
        expiresAt: form.expiresAt || undefined,
        minOrderCents: form.minOrder || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not create coupon.");
      return;
    }
    setForm({ code: "", type: "PERCENT", amount: "", maxUses: "", expiresAt: "", minOrder: "" });
    load();
  }

  async function toggleActive(coupon: Coupon) {
    await fetch(`/api/shop/coupons/${coupon.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !coupon.isActive }),
    });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this coupon?")) return;
    await fetch(`/api/shop/coupons/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">Coupons</h1>
        <Link href="/dashboard/shop" className="text-sm text-brand-600 hover:underline">
          ← Back to shop
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Discount codes only apply to your own shop's items in a buyer's cart.
      </p>

      <form onSubmit={handleCreate} className="bg-white rounded-xl shadow p-4 space-y-2 mb-4">
        <h3 className="font-semibold text-sm">New coupon</h3>
        <input
          required
          placeholder="Code (e.g. SUMMER20)"
          value={form.code}
          onChange={update("code")}
          className="w-full border rounded px-3 py-2 text-sm uppercase"
        />
        <div className="flex gap-2">
          <select value={form.type} onChange={update("type")} className="w-1/2 border rounded px-3 py-2 text-sm">
            <option value="PERCENT">% off</option>
            <option value="FIXED">$ off</option>
          </select>
          <input
            required
            type="number"
            step={form.type === "PERCENT" ? "1" : "0.01"}
            min="0.01"
            max={form.type === "PERCENT" ? "100" : undefined}
            placeholder={form.type === "PERCENT" ? "Percent (e.g. 20)" : "Amount (e.g. 5.00)"}
            value={form.amount}
            onChange={update("amount")}
            className="w-1/2 border rounded px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            placeholder="Max uses (optional)"
            value={form.maxUses}
            onChange={update("maxUses")}
            className="w-1/2 border rounded px-3 py-2 text-sm"
          />
          <input
            type="date"
            placeholder="Expires (optional)"
            value={form.expiresAt}
            onChange={update("expiresAt")}
            className="w-1/2 border rounded px-3 py-2 text-sm"
          />
        </div>
        <input
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Minimum order total (optional)"
          value={form.minOrder}
          onChange={update("minOrder")}
          className="w-full border rounded px-3 py-2 text-sm"
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="bg-brand-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? "Creating…" : "Create coupon"}
        </button>
      </form>

      {!coupons ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : coupons.length === 0 ? (
        <p className="text-sm text-gray-500">No coupons yet.</p>
      ) : (
        <div className="bg-white rounded-xl shadow divide-y">
          {coupons.map((c) => (
            <div key={c.id} className="p-4 flex items-center justify-between text-sm">
              <div>
                <p className="font-semibold">
                  {c.code}{" "}
                  <span className="text-gray-500 font-normal">
                    ({c.type === "PERCENT" ? `${c.amount}% off` : `${formatCents(c.amount)} off`})
                  </span>
                </p>
                <p className="text-xs text-gray-500">
                  {c.usedCount} used{c.maxUses ? ` / ${c.maxUses} max` : ""}
                  {c.expiresAt ? ` · expires ${new Date(c.expiresAt).toLocaleDateString()}` : ""}
                  {c.minOrderCents ? ` · min ${formatCents(c.minOrderCents)}` : ""}
                  {!c.isActive ? " · inactive" : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => toggleActive(c)} className="text-brand-600 hover:underline">
                  {c.isActive ? "Deactivate" : "Activate"}
                </button>
                <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:underline">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
