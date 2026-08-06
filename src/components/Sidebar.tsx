"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import NotificationBell from "@/components/NotificationBell";
import TopGroups from "@/components/TopGroups";
import TopShops from "@/components/TopShops";
import SidebarLegalLinks from "@/components/SidebarLegalLinks";

// Split around Notifications, which isn't a plain Link -- it's the same
// interactive bell (with its own unread-count popover) used in the navbar,
// so it can't live in the plain-Link array below. My Profile and My Account
// are appended separately too, since Profile's href depends on the
// signed-in user's username.
const NAV_ITEMS_BEFORE_NOTIFICATIONS = [
  { href: "/feed", label: "Feed", icon: "🏠" },
  { href: "/groups", label: "Groups", icon: "👥" },
  { href: "/marketplace", label: "Marketplace", icon: "🛍️" },
  { href: "/cart", label: "Cart", icon: "🛒" },
];
const NAV_ITEMS_AFTER_NOTIFICATIONS = [
  { href: "/messages", label: "Messages", icon: "💬" },
  { href: "/dashboard/shop", label: "My Shop", icon: "🏪" },
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
      {/* Offset is measured off the navbar's fixed 150px height. Keep in
          sync with Navbar.tsx. */}
      <div className="sticky top-[10.5rem] max-h-[calc(100vh-11.75rem)] overflow-y-auto">
        <div className="bg-white rounded-xl shadow p-3">
          <nav className="space-y-1">
            {NAV_ITEMS_BEFORE_NOTIFICATIONS.map((item) => {
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
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
              <NotificationBell align="left" />
              Notifications
            </div>
            {NAV_ITEMS_AFTER_NOTIFICATIONS.map((item) => {
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
            <Link
              href="/account"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                isActive(pathname, "/account") ? "bg-brand-50 text-brand-600" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="text-base leading-none">⚙️</span>
              My Account
            </Link>
          </nav>
        </div>
        <TopGroups />
        <TopShops />
        <SidebarLegalLinks />
      </div>
    </aside>
  );
}
