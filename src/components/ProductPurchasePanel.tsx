"use client";

import { useState } from "react";
import { useCart } from "@/components/CartContext";
import { formatCents } from "@/lib/money";

type Variant = {
  id: string;
  label: string;
  priceCents: number;
  currency: string;
  isAvailable: boolean;
};

export default function ProductPurchasePanel({
  product,
  variants,
}: {
  product: { id: string; title: string; imageUrl: string | null };
  variants: Variant[];
}) {
  const { addItem } = useCart();
  const [selectedId, setSelectedId] = useState(
    variants.find((v) => v.isAvailable)?.id ?? variants[0].id
  );
  const [added, setAdded] = useState(false);

  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];

  function handleAdd() {
    if (!selected.isAvailable) return;
    addItem({
      productId: product.id,
      variantId: selected.id,
      variantLabel: selected.label,
      title: product.title,
      priceCents: selected.priceCents,
      imageUrl: product.imageUrl,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div>
      <p className="text-xl font-semibold mt-3">{formatCents(selected.priceCents, selected.currency)}</p>

      <div className="mt-3">
        <label className="text-sm font-medium text-gray-700 block mb-1">Options</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="block w-full border rounded px-3 py-2 text-sm"
        >
          {variants.map((v) => (
            <option key={v.id} value={v.id} disabled={!v.isAvailable}>
              {v.label}
              {!v.isAvailable ? " (out of stock)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <button
          onClick={handleAdd}
          disabled={!selected.isAvailable}
          className="bg-brand-600 text-white px-5 py-2 rounded-full font-medium hover:bg-brand-700 disabled:opacity-60"
        >
          {!selected.isAvailable ? "Out of stock" : added ? "Added ✓" : "Add to cart"}
        </button>
      </div>
    </div>
  );
}
