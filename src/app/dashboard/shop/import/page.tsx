"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCents } from "@/lib/money";
import CategoryPicker, { Category } from "@/components/CategoryPicker";
import { buildProductCsvTemplate } from "@/lib/csvProducts";

const PROVIDERS = [
  { id: "printify", label: "Printify" },
  { id: "printful", label: "Printful" },
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
  categoryHint?: string[];
};

type UrlPreviewResult = { url: string; ok: boolean; item?: CatalogItem; error?: string; alreadyImported?: boolean };

function ImportItemCard({
  item,
  categories,
  selectedIds,
  expanded,
  onToggleExpand,
  onCategoriesChange,
  onImport,
  importing,
  alreadyImported,
}: {
  item: CatalogItem;
  categories: Category[];
  selectedIds: string[];
  expanded: boolean;
  onToggleExpand: () => void;
  onCategoriesChange: (ids: string[]) => void;
  onImport: () => void;
  importing: boolean;
  alreadyImported?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="aspect-square bg-gray-100 flex items-center justify-center relative">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-400 text-xs">No image</span>
        )}
        {alreadyImported && (
          <span className="absolute top-1.5 left-1.5 bg-gray-900/80 text-white text-[10px] px-2 py-0.5 rounded-full">
            Already imported
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="font-medium text-sm truncate">{item.title}</p>
        <p className="text-brand-600 text-sm font-semibold">{formatCents(item.priceCents, item.currency)}</p>

        <button onClick={onToggleExpand} className="mt-2 text-xs text-gray-600 hover:underline">
          {selectedIds.length > 0 ? `Categories (${selectedIds.length}) ▾` : "Set categories ▾"}
        </button>
        {expanded && (
          <div className="mt-1">
            <CategoryPicker categories={categories} selectedIds={selectedIds} onChange={onCategoriesChange} />
          </div>
        )}

        <button
          onClick={onImport}
          disabled={importing || alreadyImported}
          className="mt-2 w-full bg-brand-600 text-white rounded py-1 text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
        >
          {alreadyImported ? "Already imported" : importing ? "Importing…" : "Import to my shop"}
        </button>
      </div>
    </div>
  );
}

export default function ImportPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Record<string, string[]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);

  // Print-on-demand catalog import
  const [provider, setProvider] = useState("printify");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Website URL import -- bulk from a shop/category listing page
  const [urlResults, setUrlResults] = useState<UrlPreviewResult[]>([]);
  const [listingUrl, setListingUrl] = useState("");
  const [listingMaxCount, setListingMaxCount] = useState(10);
  const [listingLoading, setListingLoading] = useState(false);
  const [listingError, setListingError] = useState<string | null>(null);

  // CSV bulk import
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvResult, setCsvResult] = useState<{ created: number; errors: { row: number; reason: string }[] } | null>(
    null
  );

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories);
  }, []);

  function categoriesMatchingHint(hint?: string[]) {
    if (!hint || hint.length === 0) return [];
    const lowerHint = hint.map((h) => h.toLowerCase());
    return categories.filter((c) => lowerHint.includes(c.name.toLowerCase())).map((c) => c.id);
  }

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

  async function importCatalogItem(item: CatalogItem) {
    setImportingId(item.externalId);
    await fetch(`/api/pod/${provider}/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, categoryIds: selectedCategories[item.externalId] ?? [] }),
    });
    setImportingId(null);
    router.refresh();
  }

  function applyUrlResults(results: UrlPreviewResult[]) {
    setUrlResults(results);

    const preselected: Record<string, string[]> = {};
    for (const r of results) {
      if (r.ok && r.item) {
        const matches = categoriesMatchingHint(r.item.categoryHint);
        if (matches.length > 0) preselected[r.item.externalId] = matches;
      }
    }
    if (Object.keys(preselected).length > 0) {
      setSelectedCategories((prev) => ({ ...preselected, ...prev }));
    }
  }

  async function discoverFromListing() {
    if (!listingUrl.trim()) return;
    setListingLoading(true);
    setListingError(null);
    setUrlResults([]);
    const res = await fetch("/api/shop/import-url/discover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: listingUrl.trim(), maxCount: listingMaxCount }),
    });
    const data = await res.json();
    setListingLoading(false);
    if (!res.ok) {
      setListingError(data.error ?? "Failed to find products on that page.");
      return;
    }
    applyUrlResults(data.results);
  }

  async function importUrlItem(item: CatalogItem) {
    setImportingId(item.externalId);
    const res = await fetch("/api/shop/import-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceUrl: item.externalId,
        title: item.title,
        description: item.description,
        imageUrl: item.imageUrl,
        priceCents: item.priceCents,
        raw: item.raw,
        categoryIds: selectedCategories[item.externalId] ?? [],
      }),
    });
    setImportingId(null);
    if (res.status === 409) {
      // Someone else (or another tab) imported this exact URL in the meantime --
      // reflect that in this preview instead of silently failing.
      setUrlResults((prev) => prev.map((r) => (r.url === item.externalId ? { ...r, alreadyImported: true } : r)));
      return;
    }
    router.refresh();
  }

  function downloadCsvTemplate() {
    const blob = new Blob([buildProductCsvTemplate()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mompuffs-products-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importCsv() {
    if (!csvFile) return;
    setCsvUploading(true);
    setCsvError(null);
    setCsvResult(null);
    const text = await csvFile.text();
    const res = await fetch("/api/shop/products/csv-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: text }),
    });
    const data = await res.json();
    setCsvUploading(false);
    if (!res.ok) {
      setCsvError(data.error ?? "Failed to import that file.");
      return;
    }
    setCsvResult(data);
    setCsvFile(null);
    router.refresh();
  }

  const urlOkResults = urlResults.filter((r) => r.ok && r.item);
  const urlFailedResults = urlResults.filter((r) => !r.ok);

  return (
    <div>
      <Link href="/dashboard/shop" className="text-sm text-brand-600 hover:underline">
        ← Back to shop
      </Link>
      <div className="flex items-center justify-between mb-1 mt-2">
        <h1 className="text-2xl font-bold">Import products</h1>
        <Link href="/dashboard/shop/connections" className="text-sm text-brand-600 hover:underline">
          Manage connections →
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Pull products into your Mompuffs shop from a connected print-on-demand account, a public product page, or a
        CSV file.
      </p>

      {/* Print-on-demand catalog import */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-2">From Printify / Printful</h2>
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
          <p className="text-sm text-gray-500">Click a provider above to load your products from that account.</p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-2">
          {items.map((item) => (
            <ImportItemCard
              key={item.externalId}
              item={item}
              categories={categories}
              selectedIds={selectedCategories[item.externalId] ?? []}
              expanded={expandedId === item.externalId}
              onToggleExpand={() => setExpandedId(expandedId === item.externalId ? null : item.externalId)}
              onCategoriesChange={(ids) => setSelectedCategories((prev) => ({ ...prev, [item.externalId]: ids }))}
              onImport={() => importCatalogItem(item)}
              importing={importingId === item.externalId}
            />
          ))}
        </div>
      </section>

      {/* Website URL import */}
      <section className="mb-10 border-t pt-6">
        <h2 className="text-lg font-semibold mb-1">From a website</h2>
        <p className="text-sm text-gray-500 mb-3 max-w-xl">
          Paste a shop or category page from a public storefront and how many products to grab — we'll find the
          product links on it (following "next page" if needed) and preview each one below. No login needed.
        </p>
        <div className="flex gap-2 max-w-xl">
          <input
            value={listingUrl}
            onChange={(e) => setListingUrl(e.target.value)}
            placeholder="https://example.com/shop/"
            className="flex-1 border rounded px-3 py-1.5 text-sm"
          />
          <input
            type="number"
            min={1}
            max={50}
            value={listingMaxCount}
            onChange={(e) => setListingMaxCount(Number(e.target.value))}
            className="w-20 border rounded px-2 py-1.5 text-sm"
            aria-label="Maximum products to import"
          />
          <button
            onClick={discoverFromListing}
            disabled={listingLoading || !listingUrl.trim()}
            className="bg-brand-600 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-brand-700 disabled:opacity-60 flex-shrink-0"
          >
            {listingLoading ? "Finding…" : "Find products"}
          </button>
        </div>
        {listingError && (
          <p className="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3 max-w-xl">{listingError}</p>
        )}

        {urlFailedResults.length > 0 && (
          <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3 max-w-xl space-y-1">
            {urlFailedResults.map((r) => (
              <p key={r.url}>
                <span className="font-medium truncate">{r.url}</span>: {r.error}
              </p>
            ))}
          </div>
        )}

        {urlOkResults.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
            {urlOkResults.map((r) => {
              const item = r.item!;
              return (
                <ImportItemCard
                  key={item.externalId}
                  item={item}
                  categories={categories}
                  selectedIds={selectedCategories[item.externalId] ?? []}
                  expanded={expandedId === item.externalId}
                  onToggleExpand={() => setExpandedId(expandedId === item.externalId ? null : item.externalId)}
                  onCategoriesChange={(ids) => setSelectedCategories((prev) => ({ ...prev, [item.externalId]: ids }))}
                  onImport={() => importUrlItem(item)}
                  importing={importingId === item.externalId}
                  alreadyImported={r.alreadyImported}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* CSV bulk import */}
      <section className="border-t pt-6">
        <h2 className="text-lg font-semibold mb-1">From a CSV file</h2>
        <p className="text-sm text-gray-500 mb-3">
          Upload a spreadsheet to add many products at once. Categories are created automatically if they don't
          exist yet — separate multiple with <code>;</code>, and nest one level with <code>&gt;</code> (e.g.{" "}
          <code>Household &gt; Cups and Mugs</code>).
        </p>
        <button onClick={downloadCsvTemplate} className="text-sm text-brand-600 hover:underline mb-3 block">
          Download CSV template →
        </button>

        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            setCsvFile(e.target.files?.[0] ?? null);
            setCsvResult(null);
            setCsvError(null);
          }}
          className="text-sm"
        />
        <div>
          <button
            onClick={importCsv}
            disabled={!csvFile || csvUploading}
            className="mt-2 bg-brand-600 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
          >
            {csvUploading ? "Importing…" : "Upload & import"}
          </button>
        </div>

        {csvError && (
          <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3 max-w-lg">{csvError}</p>
        )}
        {csvResult && (
          <div className="mt-3 text-sm max-w-xl">
            <p className="text-green-700 bg-green-50 border border-green-200 rounded p-3">
              Imported {csvResult.created} product{csvResult.created === 1 ? "" : "s"}.
            </p>
            {csvResult.errors.length > 0 && (
              <div className="mt-2 text-red-700 bg-red-50 border border-red-200 rounded p-3 space-y-1">
                <p className="font-medium">{csvResult.errors.length} row(s) skipped:</p>
                {csvResult.errors.map((e, i) => (
                  <p key={i}>
                    Row {e.row}: {e.reason}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
