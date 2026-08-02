"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCents } from "@/lib/money";
import CategoryPicker, { Category } from "@/components/CategoryPicker";

const PROVIDERS = [
  { id: "printify", label: "Printify" },
  { id: "printful", label: "Printful" },
  { id: "peaprint", label: "Peaprint" },
];

type CatalogItem = {
  externalId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  images?: string[];
  priceCents: number;
  currency: string;
  variants?: unknown[];
  raw: unknown;
};

export default function ImportPage() {
  const router = useRouter();
  const [provider, setProvider] = useState("printify");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Record<string, string[]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories);
  }, []);

  async function loadCatalog(p: string) {
    setProvider(p);
    setLoading(true);
    setError(null);
    setItems([]);
    const res = await fetch(`/api/pod/${p}/catalog`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to load catalog.");
      return;
    }
    setItems(data);
  }

  async function importItem(item: CatalogItem) {
    setImportingId(item.externalId);
    await fetch(`/api/pod/${provider}/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, categoryIds: selectedCategories[item.externalId] ?? [] }),
    });
    setImportingId(null);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">Import products</h1>
        <Link href="/dashboard/shop/connections" className="text-sm text-brand-600 hover:underline">
          Manage connections →
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Pull existing products from your connected print-on-demand accounts into your Mompuffs shop.
      </p>

      <div className="flex gap-2 mb-4">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            onClick={() => loadCatalog(p.id)}
            className={
              provider === p.id
                ? "px-4 py-1.5 rounded-full text-sm font-medium bg-brand-600 text-white"
                : "px-4 py-1.5 rounded-full text-sm font-medium bg-white border hover:bg-gray-50"
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-gray-500 text-sm">Loading catalog…</p>}
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3 max-w-lg">
          {error}{" "}
          <Link href="/dashboard/shop/connections" className="underline font-medium">
            Go to Connections →
          </Link>
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-gray-500">
          Click a provider above to load your products from that account.
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-2">
        {items.map((item) => {
          const itemCategoryIds = selectedCategories[item.externalId] ?? [];
          return (
            <div key={item.externalId} className="bg-white rounded-xl shadow overflow-hidden">
              <div className="aspect-square bg-gray-100 flex items-center justify-center">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-400 text-xs">No image</span>
                )}
              </div>
              <div className="p-3">
                <p className="font-medium text-sm truncate">{item.title}</p>
                <p className="text-brand-600 text-sm font-semibold">{formatCents(item.priceCents, item.currency)}</p>

                <button
                  onClick={() => setExpandedId(expandedId === item.externalId ? null : item.externalId)}
                  className="mt-2 text-xs text-gray-600 hover:underline"
                >
                  {itemCategoryIds.length > 0 ? `Categories (${itemCategoryIds.length}) ▾` : "Set categories ▾"}
                </button>
                {expandedId === item.externalId && (
                  <div className="mt-1">
                    <CategoryPicker
                      categories={categories}
                      selectedIds={itemCategoryIds}
                      onChange={(ids) =>
                        setSelectedCategories((prev) => ({ ...prev, [item.externalId]: ids }))
                      }
                    />
                  </div>
                )}

                <button
                  onClick={() => importItem(item)}
                  disabled={importingId === item.externalId}
                  className="mt-2 w-full bg-brand-600 text-white rounded py-1 text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
                >
                  {importingId === item.externalId ? "Importing…" : "Import to my shop"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
