"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

type ShopSummary = { id: string; name: string; slug: string; productCount: number };

function MarketplaceMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [shops, setShops] = useState<ShopSummary[] | null>(null);

  useEffect(() => {
    if (open && !shops) {
      fetch("/api/shops")
        .then((r) => r.json())
        .then(setShops);
    }
  }, [open, shops]);

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      {children}
      {open && (
        <div className="absolute left-0 top-full w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 text-sm z-40">
          <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Shops</p>
          {!shops ? (
            <p className="px-3 py-1.5 text-gray-500">Loading…</p>
          ) : shops.length === 0 ? (
            <p className="px-3 py-1.5 text-gray-500">No shops yet.</p>
          ) : (
            shops.slice(0, 8).map((shop) => (
              <Link
                key={shop.id}
                href={`/shop/${shop.slug}`}
                className="flex justify-between px-3 py-1.5 hover:bg-gray-50 text-gray-700 hover:text-brand-600"
              >
                <span className="truncate">{shop.name}</span>
                <span className="text-gray-400">{shop.productCount}</span>
              </Link>
            ))
          )}
          <div className="border-t mt-1 pt-1">
            <Link href="/marketplace" className="block px-3 py-1.5 text-brand-600 hover:bg-gray-50 font-medium">
              Browse marketplace →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { data: session, status } = useSession();

  return (
    <nav className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/feed" className="text-xl font-bold text-brand-600">
          Mompuffs
        </Link>

        <div className="flex-1 max-w-md hidden sm:block">
          <MarketplaceMenu>
            <Link
              href="/marketplace"
              className="block w-full bg-gray-100 rounded-full px-4 py-1.5 text-sm text-gray-500 hover:bg-gray-200 transition"
            >
              Browse the marketplace…
            </Link>
          </MarketplaceMenu>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <Link href="/feed" className="hover:text-brand-600">Feed</Link>
          <MarketplaceMenu>
            <Link href="/marketplace" className="hover:text-brand-600">Marketplace</Link>
          </MarketplaceMenu>
          <Link href="/cart" className="hover:text-brand-600">Cart</Link>

          {status === "authenticated" && session?.user ? (
            <>
              <Link href="/dashboard/shop" className="hover:text-brand-600">My Shop</Link>
              <Link href={`/profile/${session.user.username}`} className="hover:text-brand-600">
                {session.user.name}
              </Link>
              <Link href="/account" className="hover:text-brand-600">My Account</Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-gray-500 hover:text-red-600"
              >
                Sign out
              </button>
            </>
          ) : status === "unauthenticated" ? (
            <>
              <Link href="/login" className="hover:text-brand-600">Log in</Link>
              <Link
                href="/register"
                className="bg-brand-600 text-white px-3 py-1.5 rounded-full hover:bg-brand-700"
              >
                Sign up
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
