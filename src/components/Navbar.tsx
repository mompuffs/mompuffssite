"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import NotificationBell from "@/components/NotificationBell";

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

function MessagesLink() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    function load() {
      fetch("/api/messages")
        .then((r) => r.json())
        .then((conversations) => {
          if (Array.isArray(conversations)) {
            setUnreadCount(conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0));
          }
        })
        .catch(() => {});
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Link href="/messages" className="hover:text-brand-600 relative">
      Messages
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-3 bg-brand-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}

export default function Navbar() {
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

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

        {/* Full nav row -- overflows on narrow screens, so it's desktop-only;
            the hamburger button below covers the same links stacked. */}
        <div className="hidden md:flex items-center gap-3 text-sm">
          <Link href="/feed" className="hover:text-brand-600">Feed</Link>
          <MarketplaceMenu>
            <Link href="/marketplace" className="hover:text-brand-600">Marketplace</Link>
          </MarketplaceMenu>
          <Link href="/groups" className="hover:text-brand-600">Groups</Link>
          <Link href="/cart" className="hover:text-brand-600">Cart</Link>

          {status === "authenticated" && session?.user ? (
            <>
              <NotificationBell />
              <MessagesLink />
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

        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="md:hidden text-xl text-gray-600 hover:text-brand-600 leading-none px-1"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 px-4 py-3 space-y-1 text-sm bg-white">
          <Link
            href="/marketplace"
            onClick={() => setMobileOpen(false)}
            className="block bg-gray-100 rounded-full px-4 py-1.5 text-gray-500 mb-2"
          >
            Browse the marketplace…
          </Link>
          <Link href="/feed" onClick={() => setMobileOpen(false)} className="block py-2 hover:text-brand-600">
            Feed
          </Link>
          <Link href="/marketplace" onClick={() => setMobileOpen(false)} className="block py-2 hover:text-brand-600">
            Marketplace
          </Link>
          <Link href="/groups" onClick={() => setMobileOpen(false)} className="block py-2 hover:text-brand-600">
            Groups
          </Link>
          <Link href="/cart" onClick={() => setMobileOpen(false)} className="block py-2 hover:text-brand-600">
            Cart
          </Link>

          {status === "authenticated" && session?.user ? (
            <>
              <div className="py-2">
                <NotificationBell />
              </div>
              <div className="py-2">
                <MessagesLink />
              </div>
              <Link href="/dashboard/shop" onClick={() => setMobileOpen(false)} className="block py-2 hover:text-brand-600">
                My Shop
              </Link>
              <Link
                href={`/profile/${session.user.username}`}
                onClick={() => setMobileOpen(false)}
                className="block py-2 hover:text-brand-600"
              >
                {session.user.name}
              </Link>
              <Link href="/account" onClick={() => setMobileOpen(false)} className="block py-2 hover:text-brand-600">
                My Account
              </Link>
              <button
                onClick={() => {
                  setMobileOpen(false);
                  signOut({ callbackUrl: "/login" });
                }}
                className="block w-full text-left py-2 text-gray-500 hover:text-red-600"
              >
                Sign out
              </button>
            </>
          ) : status === "unauthenticated" ? (
            <>
              <Link href="/login" onClick={() => setMobileOpen(false)} className="block py-2 hover:text-brand-600">
                Log in
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileOpen(false)}
                className="block bg-brand-600 text-white px-3 py-1.5 rounded-full text-center mt-1"
              >
                Sign up
              </Link>
            </>
          ) : null}
        </div>
      )}
    </nav>
  );
}
