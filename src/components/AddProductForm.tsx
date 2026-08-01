"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddProductForm() {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", description: "", price: "", imageUrl: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const priceCents = Math.round(parseFloat(form.price) * 100);
    const res = await fetch("/api/shop/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        priceCents,
        imageUrl: form.imageUrl,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not add product.");
      return;
    }
    setForm({ title: "", description: "", price: "", imageUrl: "" });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-4 space-y-2">
      <h3 className="font-semibold text-sm">Add a product manually</h3>
      <input required placeholder="Title" value={form.title} onChange={update("title")} className="w-full border rounded px-3 py-2 text-sm" />
      <textarea placeholder="Description" value={form.description} onChange={update("description")} rows={2} className="w-full border rounded px-3 py-2 text-sm resize-none" />
      <div className="flex gap-2">
        <input required type="number" step="0.01" min="0.01" placeholder="Price (USD)" value={form.price} onChange={update("price")} className="w-1/2 border rounded px-3 py-2 text-sm" />
        <input placeholder="Image URL" value={form.imageUrl} onChange={update("imageUrl")} className="w-1/2 border rounded px-3 py-2 text-sm" />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" disabled={loading} className="bg-brand-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-brand-700 disabled:opacity-60">
        {loading ? "Adding…" : "Add product"}
      </button>
    </form>
  );
}
