"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import NotificationBell from "@/components/NotificationBell";
import SearchBar from "@/components/SearchBar";

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
  const [scrolled, setScrolled] = useState(false);

  // Shrinks the bar from its full 232px (200px logo + py-4) down to 75px
  // (59px logo + py-2) once the page scrolls past the fold, while staying
  // pinned via `sticky top-0`. Threshold is a little past 0 so it doesn't
  // flicker at the very top from sub-pixel scroll bounce.
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className="sticky top-0 z-30 bg-brand-500 shadow-sm">
      <div
        className={`max-w-6xl mx-auto px-4 flex items-center justify-between gap-4 transition-[padding] duration-300 ease-in-out ${
          scrolled ? "py-2" : "py-4"
        }`}
      >
        {/* Logo area is 200px tall by default, 59px once scrolled (75px bar
            total) -- everything below (Sidebar's sticky top-offset, feed
            page's right-rail offset) is measured off the *scrolled* bar
            height, since that's the state sticky positioning is visible in.
            Keep those in sync with this if it changes. */}
        <Link href="/feed" className="flex items-center shrink-0">
          <Image
            src="/logo.png"
            alt="Mompuffs"
            width={250}
            height={250}
            className={`rounded-full w-auto transition-[height] duration-300 ease-in-out ${
              scrolled ? "h-[59px]" : "h-[200px]"
            }`}
            priority
          />
        </Link>

        <div className="flex-1 max-w-md hidden sm:block">
          <SearchBar />
        </div>

        {/* Full nav row -- overflows on narrow screens, so it's desktop-only;
            the hamburger button below covers the same links stacked. */}
        <div className="hidden md:flex items-center gap-3 text-sm font-semibold text-[#43203F]">
          <Link href="/feed" className="hover:text-white">Feed</Link>
          <Link href="/groups" className="hover:text-white">Groups</Link>
          <MarketplaceMenu>
            <Link href="/marketplace" className="hover:text-white">Marketplace</Link>
          </MarketplaceMenu>
          <Link href="/cart" className="hover:text-white">Cart</Link>

          {status === "authenticated" && session?.user ? (
            <>
              <NotificationBell />
              <MessagesLink />
              <Link href="/dashboard/shop" className="hover:text-white">My Shop</Link>
              <Link href={`/profile/${session.user.username}`} className="hover:text-white">
                My Profile
              </Link>
              <Link href="/account" className="hover:text-white">My Account</Link>
              {(session.user as any).isAdmin && (
                <Link href="/admin" className="hover:text-white">Admin</Link>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="hover:text-red-100"
              >
                Sign out
              </button>
            </>
          ) : status === "unauthenticated" ? (
            <>
              <Link href="/login" className="hover:text-white">Log in</Link>
              <Link
                href="/register"
                className="bg-white text-brand-700 px-3 py-1.5 rounded-full hover:bg-brand-50"
              >
                Sign up
              </Link>
            </>
          ) : null}
        </div>

        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="md:hidden text-xl text-[#43203F] hover:text-white leading-none px-1"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 px-4 py-3 space-y-1 text-sm bg-white">
          <SearchBar variant="mobile" onNavigate={() => setMobileOpen(false)} />
          <Link href="/feed" onClick={() => setMobileOpen(false)} className="block py-2 hover:text-brand-600">
            Feed
          </Link>
          <Link href="/groups" onClick={() => setMobileOpen(false)} className="block py-2 hover:text-brand-600">
            Groups
          </Link>
          <Link href="/marketplace" onClick={() => setMobileOpen(false)} className="block py-2 hover:text-brand-600">
            Marketplace
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
                My Profile
              </Link>
              <Link href="/account" onClick={() => setMobileOpen(false)} className="block py-2 hover:text-brand-600">
                My Account
              </Link>
              {(session.user as any).isAdmin && (
                <Link href="/admin" onClick={() => setMobileOpen(false)} className="block py-2 hover:text-brand-600">
                  Admin
                </Link>
              )}
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
