"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCents } from "@/lib/money";

type Result = {
  users: { id: string; username: string; displayName: string; avatarUrl: string | null }[];
  groups: { id: string; name: string; slug: string; avatarUrl: string | null; topic: string | null }[];
  shops: { id: string; name: string; slug: string; bannerUrl: string | null }[];
  products: {
    id: string;
    title: string;
    imageUrl: string | null;
    priceCents: number;
    currency: string;
    shop: { name: string };
  }[];
};

const EMPTY: Result = { users: [], groups: [], shops: [], products: [] };

function Avatar({ url, name }: { url: string | null; name: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
  ) : (
    <span className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

// Site-wide search: people, groups, shops, and products in one box. Replaces
// the navbar's old "Browse the marketplace…" pill, which only opened a
// shops flyout -- the dedicated Marketplace nav link/dropdown still covers
// that narrower case.
export default function SearchBar({
  variant = "desktop",
  onNavigate,
}: {
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [result, setResult] = useState<Result>(EMPTY);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!q.trim()) {
      setResult(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q.trim())}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => {
          setResult({
            users: data.users ?? [],
            groups: data.groups ?? [],
            shops: data.shops ?? [],
            products: data.products ?? [],
          });
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function goToFullResults() {
    if (!q.trim()) return;
    setOpen(false);
    onNavigate?.();
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  function closeDropdown() {
    setOpen(false);
    onNavigate?.();
  }

  const hasAnyResults =
    result.users.length > 0 || result.groups.length > 0 || result.shops.length > 0 || result.products.length > 0;
  const showDropdown = open && q.trim().length > 0;

  return (
    <div ref={containerRef} className={variant === "desktop" ? "relative w-full" : "relative"}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          goToFullResults();
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search Mompuffs…"
          className={
            variant === "desktop"
              ? "block w-full bg-white/90 rounded-full px-4 py-1.5 text-sm text-gray-700 placeholder:text-gray-500 hover:bg-white focus:bg-white transition"
              : "block w-full bg-gray-100 rounded-full px-4 py-1.5 text-sm text-gray-700 placeholder:text-gray-500 mb-2"
          }
        />
      </form>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-gray-100 py-2 text-sm z-40 max-h-96 overflow-y-auto">
          {loading ? (
            <p className="px-3 py-4 text-gray-500 text-center text-xs">Searching…</p>
          ) : !hasAnyResults ? (
            <p className="px-3 py-4 text-gray-500 text-center text-xs">No results for "{q}".</p>
          ) : (
            <>
              {result.users.length > 0 && (
                <div>
                  <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">People</p>
                  {result.users.map((u) => (
                    <Link
                      key={u.id}
                      href={`/profile/${u.username}`}
                      onClick={closeDropdown}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50"
                    >
                      <Avatar url={u.avatarUrl} name={u.displayName} />
                      <span className="truncate">{u.displayName}</span>
                    </Link>
                  ))}
                </div>
              )}

              {result.groups.length > 0 && (
                <div className={result.users.length > 0 ? "border-t mt-1 pt-1" : ""}>
                  <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Groups</p>
                  {result.groups.map((g) => (
                    <Link
                      key={g.id}
                      href={`/groups/${g.slug}`}
                      onClick={closeDropdown}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50"
                    >
                      <Avatar url={g.avatarUrl} name={g.name} />
                      <span className="truncate">{g.name}</span>
                    </Link>
                  ))}
                </div>
              )}

              {result.shops.length > 0 && (
                <div className={result.users.length > 0 || result.groups.length > 0 ? "border-t mt-1 pt-1" : ""}>
                  <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Shops</p>
                  {result.shops.map((s) => (
                    <Link
                      key={s.id}
                      href={`/shop/${s.slug}`}
                      onClick={closeDropdown}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50"
                    >
                      <Avatar url={s.bannerUrl} name={s.name} />
                      <span className="truncate">{s.name}</span>
                    </Link>
                  ))}
                </div>
              )}

              {result.products.length > 0 && (
                <div
                  className={
                    result.users.length > 0 || result.groups.length > 0 || result.shops.length > 0
                      ? "border-t mt-1 pt-1"
                      : ""
                  }
                >
                  <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Products</p>
                  {result.products.map((p) => (
                    <Link
                      key={p.id}
                      href={`/product/${p.id}`}
                      onClick={closeDropdown}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50"
                    >
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imageUrl} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                      ) : (
                        <span className="w-8 h-8 rounded bg-gray-100 flex-shrink-0" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{p.title}</span>
                        <span className="block text-xs text-gray-400 truncate">
                          {formatCents(p.priceCents, p.currency)} · {p.shop.name}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              <div className="border-t mt-1 pt-1">
                <button
                  onClick={goToFullResults}
                  className="block w-full text-left px-3 py-1.5 text-brand-600 hover:bg-gray-50 font-medium"
                >
                  See all results for "{q}" →
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
