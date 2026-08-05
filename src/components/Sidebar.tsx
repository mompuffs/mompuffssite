"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import TopGroups from "@/components/TopGroups";
import TopShops from "@/components/TopShops";

const NAV_ITEMS = [
  { href: "/feed", label: "Feed", icon: "🏠" },
  { href: "/marketplace", label: "Marketplace", icon: "🛍️" },
  { href: "/groups", label: "Groups", icon: "👥" },
  { href: "/cart", label: "Cart", icon: "🛒" },
  { href: "/messages", label: "Messages", icon: "💬" },
  { href: "/dashboard/shop", label: "My Shop", icon: "🏪" },
  { href: "/account", label: "My Account", icon: "⚙️" },
];

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Persistent left-side navigation, mirroring the top navbar's main links in
// a dedicated block. Only shown once signed in -- logged-out pages (login,
// register, public marketplace/shop/product pages) stay full-width, same as
// the top navbar's own conditional links.
export default function Sidebar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (status !== "authenticated" || !session?.user) return null;

  const profileHref = `/profile/${session.user.username}`;

  return (
    <aside className="hidden md:block w-56 flex-shrink-0">
      <div className="sticky top-[4.5rem] max-h-[calc(100vh-5.5rem)] overflow-y-auto">
        <div className="bg-white rounded-xl shadow p-3">
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    active ? "bg-brand-50 text-brand-600" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-base leading-none">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
            <Link
              href={profileHref}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                isActive(pathname, profileHref) ? "bg-brand-50 text-brand-600" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="text-base leading-none">👤</span>
              My Profile
            </Link>
          </nav>
        </div>
        <TopGroups />
        <TopShops />
      </div>
    </aside>
  );
}
