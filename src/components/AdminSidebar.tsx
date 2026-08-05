"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "📊", exact: true },
  { href: "/admin/users", label: "Users", icon: "👤" },
  { href: "/admin/posts", label: "Posts", icon: "📝" },
  { href: "/admin/groups", label: "Groups", icon: "👥" },
  { href: "/admin/shops", label: "Shops", icon: "🏪" },
];

function isActive(pathname: string | null, href: string, exact?: boolean) {
  if (!pathname) return false;
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

// Dark, always-present admin nav -- deliberately styled apart from the
// public brand-plum chrome (Navbar/Sidebar) so the admin area reads as its
// own tool, the way wp-admin looks nothing like a WordPress theme.
export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 flex-shrink-0 bg-brand-900 text-brand-100 min-h-[calc(100vh-3.5rem)]">
      <div className="sticky top-14">
        <div className="px-4 py-4 border-b border-white/10">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-300">Mompuffs</p>
          <p className="text-sm font-bold text-white">Admin</p>
        </div>
        <nav className="py-2">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-brand-700 text-white border-l-2 border-white"
                    : "text-brand-100/80 hover:bg-white/5 hover:text-white border-l-2 border-transparent"
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-3 border-t border-white/10 mt-2">
          <Link href="/feed" className="text-xs text-brand-300 hover:text-white">
            ← Back to site
          </Link>
        </div>
      </div>
    </aside>
  );
}
