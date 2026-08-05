"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Shop = { id: string; name: string; slug: string; bannerUrl: string | null; visitCount: number };

const POLL_MS = 60_000;

// Right-sidebar block: always shows up to 10 stores. If fewer than 10 shops
// have real visits, the API pads the rest with a random sample so the block
// never sits sparse or hidden -- unlike the left-sidebar Top Shops block,
// which hides itself entirely until real traffic exists.
export default function TopStores() {
  const [shops, setShops] = useState<Shop[] | null>(null);

  useEffect(() => {
    function load() {
      fetch("/api/shops/top?fill=random")
        .then((r) => r.json())
        .then((data) => setShops(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  if (shops !== null && shops.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="font-semibold text-sm mb-3">Top Stores</h3>
      {shops === null ? (
        <p className="text-xs text-gray-500">Loading…</p>
      ) : (
        <ul className="space-y-2">
          {shops.map((s, i) => (
            <li key={s.id}>
              <Link
                href={`/shop/${s.slug}`}
                className="flex items-center gap-2.5 hover:bg-gray-50 rounded-lg px-1.5 py-1 -mx-1.5"
              >
                <span className="text-xs text-gray-400 w-4 text-right flex-shrink-0">{i + 1}</span>
                {s.bannerUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.bannerUrl} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                ) : (
                  <span className="w-8 h-8 rounded bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {s.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="text-sm font-medium truncate flex-1">{s.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href="/marketplace" className="block mt-3 text-xs text-brand-600 hover:underline">
        Browse marketplace →
      </Link>
    </div>
  );
}
