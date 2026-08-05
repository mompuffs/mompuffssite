"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Shop = { id: string; name: string; slug: string; bannerUrl: string | null; visitCount: number };

export default function TopShops() {
  const [shops, setShops] = useState<Shop[] | null>(null);

  useEffect(() => {
    fetch("/api/shops/top")
      .then((r) => r.json())
      .then((data) => setShops(Array.isArray(data) ? data.filter((s: Shop) => s.visitCount > 0) : []))
      .catch(() => {});
  }, []);

  if (shops !== null && shops.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow p-3 mt-3">
      <p className="px-2 pt-1 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Top Shops</p>
      {shops === null ? (
        <p className="px-2 pb-1 text-xs text-gray-500">Loading…</p>
      ) : (
        <div className="space-y-0.5">
          {shops.map((s) => (
            <Link
              key={s.id}
              href={`/shop/${s.slug}`}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50"
            >
              {s.bannerUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.bannerUrl} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />
              ) : (
                <span className="w-7 h-7 rounded bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                  {s.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="text-sm truncate flex-1">{s.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
