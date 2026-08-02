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
    description: string | null;
    priceCents: number;
    currency: string;
    source: string;
    shippingMode: string;
    shippingCents: number;
    categories: { id: string; name: string }[];
  };
  categories: Category[];
}) {
  const router = useRouter();
  const [editingCategories, setEditingCategories] = useState(false);
  const [selectedIds, setSelectedIds] = useState(product.categories.map((c) => c.id));
  const [savingCategories, setSavingCategories] = useState(false);

  const [editingDescription, setEditingDescription] = useState(false);
  const [description, setDescription] = useState(product.description ?? "");
  const [savingDescription, setSavingDescription] = useState(false);

  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(product.title);
  const [savingTitle, setSavingTitle] = useState(false);

  const [editingShipping, setEditingShipping] = useState(false);
  const [shippingMode, setShippingMode] = useState(product.shippingMode);
  const [shippingCost, setShippingCost] = useState(
    product.shippingCents ? (product.shippingCents / 100).toFixed(2) : ""
  );
  const [savingShipping, setSavingShipping] = useState(false);

  async function handleDelete() {
    if (!confirm(`Remove "${product.title}"?`)) return;
    await fetch(`/api/shop/products/${product.id}`, { method: "DELETE" });
    router.refresh();
  }

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/shop/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  }

  async function saveCategories() {
    setSavingCategories(true);
    await patch({ categoryIds: selectedIds });
    setSavingCategories(false);
    setEditingCategories(false);
    router.refresh();
  }

  async function saveDescription() {
    setSavingDescription(true);
    await patch({ description });
    setSavingDescription(false);
    setEditingDescription(false);
    router.refresh();
  }

  async function saveTitle() {
    if (!title.trim()) return;
    setSavingTitle(true);
    await patch({ title });
    setSavingTitle(false);
    setEditingTitle(false);
    router.refresh();
  }

  async function saveShipping() {
    setSavingShipping(true);
    await patch({
      shippingMode,
      shippingCents: shippingMode === "PRODUCT" ? Math.round(parseFloat(shippingCost || "0") * 100) : 0,
    });
    setSavingShipping(false);
    setEditingShipping(false);
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
          <button onClick={() => setEditingTitle((e) => !e)} className="text-brand-600 hover:underline">
            {editingTitle ? "Cancel" : "Title"}
          </button>
          <button onClick={() => setEditingDescription((e) => !e)} className="text-brand-600 hover:underline">
            {editingDescription ? "Cancel" : "Description"}
          </button>
          <button onClick={() => setEditingCategories((e) => !e)} className="text-brand-600 hover:underline">
            {editingCategories ? "Cancel" : "Categories"}
          </button>
          <button onClick={() => setEditingShipping((e) => !e)} className="text-brand-600 hover:underline">
            {editingShipping ? "Cancel" : "Shipping"}
          </button>
          <button onClick={handleDelete} className="text-red-500 hover:underline">
            Remove
          </button>
        </div>
      </div>

      {editingTitle && (
        <div className="mt-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm"
            placeholder="Title"
          />
          <button
            onClick={saveTitle}
            disabled={savingTitle || !title.trim()}
            className="mt-2 bg-brand-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-brand-700 disabled:opacity-60"
          >
            {savingTitle ? "Saving…" : "Save title"}
          </button>
        </div>
      )}

      {editingDescription && (
        <div className="mt-2">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full border rounded px-2 py-1.5 text-sm resize-none"
            placeholder="Description"
          />
          <button
            onClick={saveDescription}
            disabled={savingDescription}
            className="mt-2 bg-brand-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-brand-700 disabled:opacity-60"
          >
            {savingDescription ? "Saving…" : "Save description"}
          </button>
        </div>
      )}

      {editingShipping && (
        <div className="mt-2 flex gap-2 items-start">
          <select
            value={shippingMode}
            onChange={(e) => setShippingMode(e.target.value)}
            className="border rounded px-2 py-1.5 text-sm"
          >
            <option value="FLAT">Shop's flat rate</option>
            <option value="PRODUCT">Custom for this product</option>
          </select>
          {shippingMode === "PRODUCT" && (
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Shipping cost (USD)"
              value={shippingCost}
              onChange={(e) => setShippingCost(e.target.value)}
              className="border rounded px-2 py-1.5 text-sm w-40"
            />
          )}
          <button
            onClick={saveShipping}
            disabled={savingShipping}
            className="bg-brand-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-brand-700 disabled:opacity-60"
          >
            {savingShipping ? "Saving…" : "Save"}
          </button>
        </div>
      )}

      {editingCategories && (
        <div className="mt-2">
          <CategoryPicker categories={categories} selectedIds={selectedIds} onChange={setSelectedIds} />
          <button
            onClick={saveCategories}
            disabled={savingCategories}
            className="mt-2 bg-brand-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-brand-700 disabled:opacity-60"
          >
            {savingCategories ? "Saving…" : "Save categories"}
          </button>
        </div>
      )}
    </div>
  );
}
