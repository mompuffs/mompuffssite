"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const { data: session, status } = useSession();

  return (
    <nav className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/feed" className="text-xl font-bold text-brand-600">
          Mompuffs
        </Link>

        <div className="flex-1 max-w-md hidden sm:block">
          <Link
            href="/marketplace"
            className="block w-full bg-gray-100 rounded-full px-4 py-1.5 text-sm text-gray-500 hover:bg-gray-200 transition"
          >
            Browse the marketplace…
          </Link>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <Link href="/feed" className="hover:text-brand-600">Feed</Link>
          <Link href="/marketplace" className="hover:text-brand-600">Marketplace</Link>
          <Link href="/cart" className="hover:text-brand-600">Cart</Link>

          {status === "authenticated" && session?.user ? (
            <>
              <Link href="/dashboard/shop" className="hover:text-brand-600">My Shop</Link>
              <Link href={`/profile/${session.user.username}`} className="hover:text-brand-600">
                {session.user.name}
              </Link>
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
