"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/blog", label: "Articles" },
  { href: "/admin/blog/categories", label: "Categories" },
];

export default function BlogAdminNav() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            pathname === t.href ? "bg-brand-700 text-white" : "bg-white text-gray-700 shadow hover:bg-gray-50"
          }`}
        >
          {t.label}
        </Link>
      ))}
      <Link href="/blog" className="px-3 py-1.5 text-sm text-brand-600 hover:underline ml-auto">
        View blog →
      </Link>
    </div>
  );
}
