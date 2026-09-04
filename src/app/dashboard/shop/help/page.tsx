import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ShopHelpPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) redirect("/dashboard/shop");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard/shop" className="text-sm text-brand-600 hover:underline">
          ← My Shop
        </Link>
        <h1 className="text-2xl font-bold mt-1">Help &amp; Support</h1>
        <p className="text-sm text-gray-500 mt-1">How this shop dashboard works for every seller on MomPuffs.</p>
      </div>

      <section className="bg-white rounded-xl shadow p-4 space-y-2 text-sm">
        <h2 className="font-semibold">Manage shop</h2>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>
            <Link href="/dashboard/shop" className="text-brand-600 hover:underline">
              My Shop
            </Link>{" "}
            — add products and see your catalog.
          </li>
          <li>
            <Link href="/dashboard/shop/orders" className="text-brand-600 hover:underline">
              Orders
            </Link>{" "}
            — mark your line items fulfilled.
          </li>
          <li>
            <Link href="/dashboard/shop/refunds" className="text-brand-600 hover:underline">
              Refunds
            </Link>{" "}
            — approve or deny buyer requests (money still moves in Stripe/PayPal).
          </li>
          <li>
            <Link href="/dashboard/shop/categories" className="text-brand-600 hover:underline">
              Categories
            </Link>{" "}
            — your shop's category tree.
          </li>
          <li>
            <Link href="/dashboard/shop/import" className="text-brand-600 hover:underline">
              Import
            </Link>{" "}
            — Printify, Printful, a public product URL, or CSV.
          </li>
          <li>
            <Link href="/dashboard/shop/connections" className="text-brand-600 hover:underline">
              Connections
            </Link>{" "}
            — per-shop Printify/Printful keys. Never platform-wide.
          </li>
          <li>
            <Link href="/dashboard/shop/payments" className="text-brand-600 hover:underline">
              Payments
            </Link>{" "}
            — your Stripe/PayPal keys only.
          </li>
          <li>
            <Link href="/dashboard/shop/coupons" className="text-brand-600 hover:underline">
              Coupons
            </Link>{" "}
            — codes that only discount your items in a mixed cart.
          </li>
          <li>
            <Link href="/dashboard/shop/shipping" className="text-brand-600 hover:underline">
              Shipping
            </Link>{" "}
            — shop flat rate plus per-product overrides.
          </li>
          <li>
            <Link href="/dashboard/shop/admin-settings" className="text-brand-600 hover:underline">
              Shop settings
            </Link>{" "}
            — name, description, banner. Slug stays the same so old links work.
          </li>
        </ul>
      </section>
    </div>
  );
}
