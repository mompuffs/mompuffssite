"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/CartContext";
import { formatCents } from "@/lib/money";

type Variant = {
  id: string;
  label: string;
  priceCents: number;
  currency: string;
  isAvailable: boolean;
  imageUrl: string | null;
  options: Record<string, string> | null;
};

export default function ProductViewer({
  product,
  shop,
  description,
  source,
  baseImageUrl,
  galleryImages,
  variants,
}: {
  product: { id: string; title: string };
  shop: { name: string; slug: string };
  description: string | null;
  source: string;
  baseImageUrl: string | null;
  galleryImages: string[];
  variants: Variant[];
}) {
  const { addItem } = useCart();
  const [selectedId, setSelectedId] = useState(
    variants.find((v) => v.isAvailable)?.id ?? variants[0].id
  );
  const [added, setAdded] = useState(false);
  const [previewOverride, setPreviewOverride] = useState<string | null>(null);

  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];
  const variantDefaultImage = selected.imageUrl || baseImageUrl;
  const displayImage = previewOverride ?? variantDefaultImage;

  // Clicking a thumbnail previews that shot; switching colors/sizes goes
  // back to that variant's own photo instead of staying on the old preview.
  useEffect(() => setPreviewOverride(null), [selectedId]);

  const thumbnails = useMemo(() => {
    const all = [variantDefaultImage, baseImageUrl, ...galleryImages].filter(
      (url): url is string => Boolean(url)
    );
    return Array.from(new Set(all));
  }, [variantDefaultImage, baseImageUrl, galleryImages]);

  // Group the picker by whichever option looks like a color, falling back to
  // the first option name present; ungrouped if variants carry no option data.
  const groupKey = useMemo(() => {
    const names = new Set<string>();
    variants.forEach((v) => Object.keys(v.options || {}).forEach((k) => names.add(k)));
    const all = Array.from(names);
    return all.find((n) => /colou?r/i.test(n)) ?? all[0];
  }, [variants]);

  const groups = useMemo(() => {
    if (!groupKey) return null;
    const map = new Map<string, Variant[]>();
    for (const v of variants) {
      const key = v.options?.[groupKey] ?? "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    }
    for (const list of map.values()) {
      list.sort((a, b) => remainderLabel(a, groupKey).localeCompare(remainderLabel(b, groupKey)));
    }
    return new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
  }, [variants, groupKey]);

  function remainderLabel(v: Variant, key: string) {
    if (!v.options) return v.label;
    const rest = Object.entries(v.options)
      .filter(([k]) => k !== key)
      .map(([, val]) => val);
    return rest.length > 0 ? rest.join(" / ") : v.label;
  }

  function handleAdd() {
    if (!selected.isAvailable) return;
    addItem({
      productId: product.id,
      variantId: selected.id,
      variantLabel: selected.label,
      title: product.title,
      priceCents: selected.priceCents,
      imageUrl: displayImage,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <>
      <div>
        <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
          {displayImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayImage} alt={product.title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-gray-400">No image</span>
          )}
        </div>
        {thumbnails.length > 1 && (
          <div className="flex gap-2 mt-2 overflow-x-auto">
            {thumbnails.map((url) => (
              <button
                key={url}
                type="button"
                onClick={() => setPreviewOverride(url)}
                className={`flex-shrink-0 w-14 h-14 rounded overflow-hidden border-2 ${
                  displayImage === url ? "border-brand-600" : "border-transparent"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div>
        <h1 className="text-2xl font-bold">{product.title}</h1>
        <Link href={`/shop/${shop.slug}`} className="text-sm text-brand-600 hover:underline">
          {shop.name}
        </Link>
        <p className="text-xl font-semibold mt-3">{formatCents(selected.priceCents, selected.currency)}</p>

        <div className="mt-3">
          <label className="text-sm font-medium text-gray-700 block mb-1">Options</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="block w-full border rounded px-3 py-2 text-sm"
          >
            {groups
              ? Array.from(groups.entries()).map(([groupLabel, groupVariants]) => (
                  <optgroup key={groupLabel} label={groupLabel}>
                    {groupVariants.map((v) => (
                      <option key={v.id} value={v.id} disabled={!v.isAvailable}>
                        {remainderLabel(v, groupKey!)}
                        {!v.isAvailable ? " (out of stock)" : ""}
                      </option>
                    ))}
                  </optgroup>
                ))
              : variants.map((v) => (
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

        {description && <p className="mt-4 text-sm text-gray-700 whitespace-pre-wrap">{description}</p>}
        {source !== "MANUAL" && (
          <p className="mt-2 text-xs inline-block bg-gray-100 text-gray-600 px-2 py-1 rounded">
            Sourced from {source}
          </p>
        )}
      </div>
    </>
  );
}
