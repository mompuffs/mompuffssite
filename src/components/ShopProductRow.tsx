"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCents } from "@/lib/money";
import CategoryPicker, { Category } from "@/components/CategoryPicker";

export default function ShopProductRow({
  product,
  categories,
}: {
  product: {
    id: string;
    title: string;
    priceCents: number;
    currency: string;
    source: string;
    categories: { id: string; name: string }[];
  };
  categories: Category[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState(product.categories.map((c) => c.id));
  const [saving, setSaving] = useState(false);

  async function handleDelete() {
    if (!confirm(`Remove "${product.title}"?`)) return;
    await fetch(`/api/shop/products/${product.id}`, { method: "DELETE" });
    router.refresh();
  }

  async function saveCategories() {
    setSaving(true);
    await fetch(`/api/shop/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryIds: selectedIds }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="border-b py-2 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{product.title}</p>
          <p className="text-gray-500 text-xs">
            {product.source}
            {product.categories.length > 0 && ` · ${product.categories.map((c) => c.name).join(", ")}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span>{formatCents(product.priceCents, product.currency)}</span>
          <button onClick={() => setEditing((e) => !e)} className="text-brand-600 hover:underline">
            {editing ? "Cancel" : "Categories"}
          </button>
          <button onClick={handleDelete} className="text-red-500 hover:underline">
            Remove
          </button>
        </div>
      </div>
      {editing && (
        <div className="mt-2">
          <CategoryPicker categories={categories} selectedIds={selectedIds} onChange={setSelectedIds} />
          <button
            onClick={saveCategories}
            disabled={saving}
            className="mt-2 bg-brand-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save categories"}
          </button>
        </div>
      )}
    </div>
  );
}
