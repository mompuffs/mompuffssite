"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CategoryPicker, { Category } from "@/components/CategoryPicker";
import ImageInput from "@/components/ImageInput";

type VariantRow = { color: string; size: string; priceAdjustment: string; imageUrl: string };

export default function AddProductForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", description: "", price: "", imageUrl: "" });
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [variantRows, setVariantRows] = useState<VariantRow[]>([]);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function addGalleryRow() {
    setGalleryUrls((urls) => [...urls, ""]);
  }

  function updateGalleryRow(i: number, url: string) {
    setGalleryUrls((urls) => urls.map((u, idx) => (idx === i ? url : u)));
  }

  function removeGalleryRow(i: number) {
    setGalleryUrls((urls) => urls.filter((_, idx) => idx !== i));
  }

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function addVariantRow() {
    setVariantRows((rows) => [...rows, { color: "", size: "", priceAdjustment: "", imageUrl: "" }]);
  }

  function updateVariantRow(i: number, field: keyof VariantRow, value: string) {
    setVariantRows((rows) => rows.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  }

  function removeVariantRow(i: number) {
    setVariantRows((rows) => rows.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const basePriceCents = Math.round(parseFloat(form.price) * 100);

    const variants =
      variantRows.length > 0
        ? variantRows.map((row) => {
            const options: Record<string, string> = {};
            if (row.color) options.Colors = row.color;
            if (row.size) options.Sizes = row.size;
            const adjustmentCents = row.priceAdjustment ? Math.round(parseFloat(row.priceAdjustment) * 100) : 0;
            return {
              label: [row.color, row.size].filter(Boolean).join(" / ") || "Variant",
              priceCents: basePriceCents + adjustmentCents,
              currency: "USD",
              isAvailable: true,
              imageUrl: row.imageUrl || undefined,
              options,
            };
          })
        : undefined;

    const res = await fetch("/api/shop/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        priceCents: basePriceCents,
        imageUrl: form.imageUrl,
        images: galleryUrls.filter(Boolean),
        categoryIds,
        variants,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not add product.");
      return;
    }
    setForm({ title: "", description: "", price: "", imageUrl: "" });
    setCategoryIds([]);
    setVariantRows([]);
    setGalleryUrls([]);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-4 space-y-2">
      <h3 className="font-semibold text-sm">Add a product manually</h3>
      <input required placeholder="Title" value={form.title} onChange={update("title")} className="w-full border rounded px-3 py-2 text-sm" />
      <textarea placeholder="Description" value={form.description} onChange={update("description")} rows={2} className="w-full border rounded px-3 py-2 text-sm resize-none" />
      <input
        required
        type="number"
        step="0.01"
        min="0.01"
        placeholder={variantRows.length > 0 ? "Base price (USD)" : "Price (USD)"}
        value={form.price}
        onChange={update("price")}
        className="w-full border rounded px-3 py-2 text-sm"
      />
      <ImageInput
        value={form.imageUrl}
        onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
        placeholder={variantRows.length > 0 ? "Image URL (fallback)" : "Image URL"}
      />

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-gray-700">Additional photos (optional)</label>
          <button type="button" onClick={addGalleryRow} className="text-brand-600 hover:underline text-xs">
            + Add photo
          </button>
        </div>
        {galleryUrls.length > 0 && (
          <div className="space-y-2 border rounded p-2">
            {galleryUrls.map((url, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="flex-1">
                  <ImageInput value={url} onChange={(u) => updateGalleryRow(i, u)} />
                </div>
                <button
                  type="button"
                  onClick={() => removeGalleryRow(i)}
                  className="text-red-500 text-xs hover:underline mt-1.5"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-gray-700">Variations (optional)</label>
          <button type="button" onClick={addVariantRow} className="text-brand-600 hover:underline text-xs">
            + Add variation
          </button>
        </div>
        {variantRows.length > 0 && (
          <div className="space-y-2 border rounded p-2">
            <p className="text-xs text-gray-500">
              Each variation's price is the base price plus its adjustment (e.g. leave blank or 0 for no
              change, enter 2 for +$2.00, -1.50 for $1.50 off).
            </p>
            {variantRows.map((row, i) => (
              <div key={i} className="grid grid-cols-2 gap-1.5 border-b last:border-b-0 pb-2 last:pb-0">
                <input
                  placeholder="Color"
                  value={row.color}
                  onChange={(e) => updateVariantRow(i, "color", e.target.value)}
                  className="border rounded px-2 py-1 text-xs"
                />
                <input
                  placeholder="Size"
                  value={row.size}
                  onChange={(e) => updateVariantRow(i, "size", e.target.value)}
                  className="border rounded px-2 py-1 text-xs"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Price adjustment (+/-)"
                  value={row.priceAdjustment}
                  onChange={(e) => updateVariantRow(i, "priceAdjustment", e.target.value)}
                  className="border rounded px-2 py-1 text-xs"
                />
                <div className="col-span-2">
                  <ImageInput value={row.imageUrl} onChange={(url) => updateVariantRow(i, "imageUrl", url)} />
                </div>
                <button
                  type="button"
                  onClick={() => removeVariantRow(i)}
                  className="col-span-2 text-red-500 text-xs hover:underline text-left"
                >
                  Remove variation
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="text-xs font-medium text-gray-700 block mb-1">Categories</label>
        <CategoryPicker categories={categories} selectedIds={categoryIds} onChange={setCategoryIds} />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" disabled={loading} className="bg-brand-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-brand-700 disabled:opacity-60">
        {loading ? "Adding…" : "Add product"}
      </button>
    </form>
  );
}
