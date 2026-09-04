"use client";

import { useState } from "react";
import Link from "next/link";

type TaxRate = {
  id: string;
  countryCode: string;
  stateCode: string;
  postcode: string;
  city: string;
  rate: number;
  taxName: string;
  priority: number;
  compound: boolean;
  shipping: boolean;
};

export default function TaxRatesTable({ initial }: { initial: TaxRate[] }) {
  const [rows, setRows] = useState<TaxRate[]>(initial);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [inserting, setInserting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function patchRow(id: string, patch: Partial<TaxRate>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const res = await fetch(`/api/shop/tax/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not save that change.");
    } else {
      setError(null);
    }
  }

  async function insertRow() {
    setInserting(true);
    setError(null);
    const res = await fetch("/api/shop/tax", { method: "POST" });
    setInserting(false);
    if (!res.ok) {
      setError("Could not add a new row.");
      return;
    }
    const row = await res.json();
    setRows((prev) => [...prev, row]);
  }

  async function removeSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Remove ${selected.size} tax rate${selected.size === 1 ? "" : "s"}?`)) return;
    setRemoving(true);
    setError(null);
    await Promise.all(Array.from(selected).map((id) => fetch(`/api/shop/tax/${id}`, { method: "DELETE" })));
    setRemoving(false);
    setRows((prev) => prev.filter((r) => !selected.has(r.id)));
    setSelected(new Set());
  }

  const textCell = "w-full border-0 bg-transparent px-2 py-1.5 text-sm focus:outline-none focus:bg-brand-50 rounded";

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">Sales Tax</h1>
        <Link href="/dashboard/shop" className="text-sm text-brand-600 hover:underline">
          ← Back to shop
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Rates apply by destination address at checkout. Leave a field as <span className="font-mono">*</span> to match anything.
      </p>
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[820px]">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs text-gray-500">
              <th className="w-8 px-2 py-2"></th>
              <th className="px-1 py-2">Country code</th>
              <th className="px-1 py-2">State code</th>
              <th className="px-1 py-2">Postcode / ZIP</th>
              <th className="px-1 py-2">City</th>
              <th className="px-1 py-2">Rate %</th>
              <th className="px-1 py-2">Tax name</th>
              <th className="px-1 py-2">Priority</th>
              <th className="px-1 py-2 text-center">Compound</th>
              <th className="px-1 py-2 text-center">Shipping</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-gray-400">
                  No tax rates yet. Click "Insert row" to add one.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="px-2 py-1 text-center">
                    <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleSelected(row.id)} />
                  </td>
                  <td>
                    <input className={textCell} defaultValue={row.countryCode} onBlur={(e) => e.target.value !== row.countryCode && patchRow(row.id, { countryCode: e.target.value })} />
                  </td>
                  <td>
                    <input className={textCell} defaultValue={row.stateCode} onBlur={(e) => e.target.value !== row.stateCode && patchRow(row.id, { stateCode: e.target.value })} />
                  </td>
                  <td>
                    <input className={textCell} defaultValue={row.postcode} onBlur={(e) => e.target.value !== row.postcode && patchRow(row.id, { postcode: e.target.value })} />
                  </td>
                  <td>
                    <input className={textCell} defaultValue={row.city} onBlur={(e) => e.target.value !== row.city && patchRow(row.id, { city: e.target.value })} />
                  </td>
                  <td>
                    <input type="number" step="0.0001" min="0" className={`${textCell} w-20`} defaultValue={row.rate} onBlur={(e) => { const v = Number(e.target.value); if (isFinite(v) && v !== row.rate) patchRow(row.id, { rate: v }); }} />
                  </td>
                  <td>
                    <input className={textCell} defaultValue={row.taxName} onBlur={(e) => e.target.value !== row.taxName && patchRow(row.id, { taxName: e.target.value })} />
                  </td>
                  <td>
                    <input type="number" min="1" className={`${textCell} w-16`} defaultValue={row.priority} onBlur={(e) => { const v = Math.round(Number(e.target.value)); if (isFinite(v) && v >= 1 && v !== row.priority) patchRow(row.id, { priority: v }); }} />
                  </td>
                  <td className="text-center">
                    <input type="checkbox" checked={row.compound} onChange={(e) => patchRow(row.id, { compound: e.target.checked })} />
                  </td>
                  <td className="text-center">
                    <input type="checkbox" checked={row.shipping} onChange={(e) => patchRow(row.id, { shipping: e.target.checked })} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={insertRow} disabled={inserting} className="border border-brand-600 text-brand-600 rounded px-3 py-1.5 text-sm font-medium hover:bg-brand-50 disabled:opacity-60">
          {inserting ? "Adding…" : "Insert row"}
        </button>
        <button onClick={removeSelected} disabled={removing || selected.size === 0} className="border border-red-300 text-red-600 rounded px-3 py-1.5 text-sm font-medium hover:bg-red-50 disabled:opacity-40">
          {removing ? "Removing…" : "Remove selected row(s)"}
        </button>
      </div>
    </div>
  );
}
