"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Sidebar from "@/components/Sidebar";
import FriendsOnline from "@/components/FriendsOnline";
import TopStores from "@/components/TopStores";

// The admin area (/admin/*) gets its own full-width chrome (see
// AdminSidebar) instead of the public max-w-7xl/Sidebar layout every other
// page uses -- closer to how a WordPress wp-admin screen is a clean break
// from the public theme rather than the theme's own layout with extra bits
// bolted on.
export default function PageShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status } = useSession();

  if (pathname?.startsWith("/admin")) {
    return <main className="min-w-0 flex-1">{children}</main>;
  }

  // Marketplace/shop pages already have their own left-side shop-list aside
  // plus a wide product grid -- adding the right rail on top crowds them,
  // so they skip it (still get the left Sidebar and full-width main).
  const skipRightRail = pathname?.startsWith("/marketplace") || pathname?.startsWith("/shop/");

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6 items-start">
      <Sidebar />
      <main className="flex-1 min-w-0">{children}</main>
      {/* Right rail -- was feed-only, now every page gets it (except
          marketplace/shop, see above). Friends Online only makes sense
          signed in; Top Stores is public info and hides itself if there's
          nothing to show (see TopStores.tsx). Top offset tracks the
          navbar's fixed height -- see Navbar.tsx. */}
      {!skipRightRail && (
        <aside className="hidden lg:flex lg:flex-col gap-3 w-64 flex-shrink-0 sticky top-[10.5rem]">
          {status === "authenticated" && <FriendsOnline />}
          <TopStores />
        </aside>
      )}
    </div>
  );
}
