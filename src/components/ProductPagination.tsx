"use client";

import Link from "next/link";

export default function ProductPagination({
  page,
  pageCount,
  basePath,
  query,
  onPage,
}: {
  page: number;
  pageCount: number;
  basePath?: string;
  query?: Record<string, string | undefined>;
  onPage?: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  function hrefFor(target: number) {
    const q = new URLSearchParams();
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value) q.set(key, value);
      }
    }
    if (target > 1) q.set("page", String(target));
    const s = q.toString();
    return s ? `${basePath ?? ""}?${s}` : basePath ?? "?";
  }

  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(pageCount, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  function item(label: string, target: number, disabled: boolean) {
    const className = `px-3 py-1 rounded text-sm border ${
      disabled
        ? "text-gray-300 border-gray-100 cursor-default"
        : target === page
          ? "bg-brand-600 text-white border-brand-600"
          : "text-gray-700 border-gray-200 hover:bg-gray-50"
    }`;
    if (disabled || target === page) {
      return (
        <span key={`${label}-${target}`} className={className}>
          {label}
        </span>
      );
    }
    if (onPage) {
      return (
        <button key={`${label}-${target}`} type="button" onClick={() => onPage(target)} className={className}>
          {label}
        </button>
      );
    }
    return (
      <Link key={`${label}-${target}`} href={hrefFor(target)} className={className}>
        {label}
      </Link>
    );
  }

  return (
    <nav className="flex flex-wrap items-center justify-center gap-1.5 mt-4" aria-label="Product pages">
      {item("Prev", page - 1, page <= 1)}
      {start > 1 && item("1", 1, false)}
      {start > 2 && <span className="px-1 text-gray-400 text-sm">…</span>}
      {pages.map((n) => item(String(n), n, false))}
      {end < pageCount - 1 && <span className="px-1 text-gray-400 text-sm">…</span>}
      {end < pageCount && item(String(pageCount), pageCount, false)}
      {item("Next", page + 1, page >= pageCount)}
    </nav>
  );
}
