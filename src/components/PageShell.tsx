"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Sidebar from "@/components/Sidebar";
import FriendsOnline from "@/components/FriendsOnline";
import TopStores from "@/components/TopStores";
import SidebarLegalLinks from "@/components/SidebarLegalLinks";

export default function PageShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status } = useSession();

  if (pathname?.startsWith("/admin")) {
    return <main className="min-w-0 flex-1">{children}</main>;
  }

  const skipRightRail =
    pathname?.startsWith("/marketplace") ||
    pathname?.startsWith("/shop/") ||
    pathname?.startsWith("/dashboard/shop") ||
    pathname === "/login";

  const shopDash = Boolean(pathname?.startsWith("/dashboard/shop"));

  return (
    <div
      className={`max-w-7xl mx-auto px-4 py-6 items-start ${
        shopDash ? "grid md:grid-cols-3 gap-6" : "flex gap-6"
      }`}
    >
      <Sidebar />
      <main className={shopDash ? "md:col-span-2 min-w-0" : "flex-1 min-w-0"}>{children}</main>
      {!skipRightRail && (
        <aside className="hidden lg:flex lg:flex-col gap-3 w-64 flex-shrink-0">
          {status === "authenticated" && <FriendsOnline />}
          <TopStores />
          <SidebarLegalLinks />
        </aside>
      )}
    </div>
  );
}
