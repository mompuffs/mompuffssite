"use client";

import { useEffect, useMemo, useState } from "react";
import ShopProductRow from "@/components/ShopProductRow";
import ProductPagination from "@/components/ProductPagination";
import type { Category } from "@/components/CategoryPicker";
import { PRODUCTS_PER_PAGE, pageCount } from "@/lib/pagination";

type Product = {
  id: string;
  title: string;
  description: string | null;
  priceCents: number;
  currency: string;
  source: string;
  shippingMode: string;
  shippingCents: number;
  imageUrl?: string | null;
  videoUrl: string | null;
  videoThumbnailUrl: string | null;
  categories: { id: string; name: string }[];
};

export default function ShopProductList({
  products,
  categories,
}: {
  products: Product[];
  categories: Category[];
}) {
  const [categoryId, setCategoryId] = useState("all");
  const [page, setPage] = useState(1);

  const options = useMemo(() => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    function label(c: Category) {
      const parent = c.parentId ? byId.get(c.parentId) : null;
      return parent ? `${parent.name} / ${c.name}` : c.name;
    }
    const tops = categories.filter((c) => !c.parentId);
    const rest = categories.filter((c) => c.parentId);
    return [...tops, ...rest].map((c) => ({ id: c.id, label: label(c) }));
  }, [categories]);

  const visible = useMemo(() => {
    if (categoryId === "all") return products;
    if (categoryId === "uncategorized") return products.filter((p) => p.categories.length === 0);
    return products.filter((p) => p.categories.some((c) => c.id === categoryId));
  }, [products, categoryId]);

  const pages = pageCount(visible.length);
  const currentPage = Math.min(page, pages);
  const paged = visible.slice((currentPage - 1) * PRODUCTS_PER_PAGE, currentPage * PRODUCTS_PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [categoryId]);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h3 className="font-semibold text-sm">
          Your products ({visible.length}
          {categoryId !== "all" ? ` of ${products.length}` : ""})
        </h3>
        {categories.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span>Category</span>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="border rounded px-2 py-1.5 text-sm bg-white min-w-[12rem]"
            >
              <option value="all">All categories</option>
              <option value="uncategorized">Uncategorized</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {products.length === 0 ? (
        <p className="text-sm text-gray-500">No products yet.</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-gray-500">No products in that category.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {paged.map((p) => (
              <ShopProductRow key={p.id} product={p} categories={categories} />
            ))}
          </div>
          <ProductPagination page={currentPage} pageCount={pages} onPage={setPage} />
        </>
      )}
    </div>
  );
}
