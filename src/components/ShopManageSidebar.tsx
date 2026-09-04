"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard/shop/orders", label: "Orders" },
  { href: "/dashboard/shop/refunds", label: "Refund requests" },
  { href: "/dashboard/shop/categories", label: "Categories" },
  { href: "/dashboard/shop/import", label: "Import products" },
  { href: "/dashboard/shop/connections", label: "Import Connectors" },
  { href: "/dashboard/shop/payments", label: "Payments" },
  { href: "/dashboard/shop/coupons", label: "Coupons" },
  { href: "/dashboard/shop/shipping", label: "Shipping" },
  { href: "/dashboard/shop/tax", label: "Sales tax" },
  { href: "/dashboard/shop/admin-settings", label: "Shop settings" },
  { href: "/dashboard/shop/help", label: "Help & Support" },
];

export default function ShopManageSidebar() {
  const pathname = usePathname();
  if (!pathname?.startsWith("/dashboard/shop")) return null;

  return (
    <div className="space-y-4 mb-4">
      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="font-semibold text-sm mb-2">Manage shop</h3>
        <ul className="text-sm space-y-1.5">
          {LINKS.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={active ? "text-brand-700 font-medium" : "text-brand-600 hover:underline"}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="font-semibold text-sm mb-2">Tips</h3>
        <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
          <li>Products you add here show up instantly on the public marketplace.</li>
          <li>Connect a catalog under Import Connectors, then pull products on the import page.</li>
          <li>
            See{" "}
            <Link href="/dashboard/shop/help" className="text-brand-600 hover:underline">
              Help &amp; Support
            </Link>{" "}
            for what each dashboard page does.
          </li>
        </ul>
      </div>
    </div>
  );
}
