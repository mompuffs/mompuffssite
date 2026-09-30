"use client";

import { useRef } from "react";

// Plain GET form so filters live in the URL (shareable, back-button friendly).
// The selects submit on change; the search box submits on Enter or the button.
export default function BlogFilters({
  categories,
  q,
  category,
  sort,
}: {
  categories: { name: string; slug: string }[];
  q: string;
  category: string;
  sort: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const submit = () => formRef.current?.requestSubmit();

  return (
    <form
      ref={formRef}
      action="/blog"
      method="GET"
      className="bg-white rounded-xl shadow p-3 mb-4 flex flex-col sm:flex-row gap-2"
    >
      <div className="flex flex-1 min-w-0">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search articles…"
          aria-label="Search articles"
          className="flex-1 min-w-0 border rounded-l-full px-4 py-2 text-sm"
        />
        <button type="submit" className="bg-brand-600 text-white text-sm px-4 rounded-r-full hover:bg-brand-700">
          Search
        </button>
      </div>
      <div className="flex gap-2">
        <select
          name="category"
          defaultValue={category}
          onChange={submit}
          aria-label="Category"
          className="flex-1 sm:flex-none border rounded-full px-3 py-2 text-sm bg-white"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={sort}
          onChange={submit}
          aria-label="Sort by date"
          className="flex-1 sm:flex-none border rounded-full px-3 py-2 text-sm bg-white"
        >
          <option value="newest">Newest first ↓</option>
          <option value="oldest">Oldest first ↑</option>
        </select>
      </div>
    </form>
  );
}
