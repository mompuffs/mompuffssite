import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import CreateShopForm from "@/components/CreateShopForm";
import AddProductForm from "@/components/AddProductForm";
import ShopProductRow from "@/components/ShopProductRow";

export const dynamic = "force-dynamic";

export default async function ShopDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const shop = await db.shop.findUnique({
    where: { ownerId: user.id },
    include: { products: { orderBy: { createdAt: "desc" }, include: { categories: true } } },
  });

  const categories = shop
    ? await db.category.findMany({
        where: { shopId: shop.id },
        orderBy: [{ parentId: "asc" }, { name: "asc" }],
      })
    : [];

  if (!shop) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">My Shop</h1>
        <CreateShopForm />
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold">{shop.name}</h1>
          <Link href={`/shop/${shop.slug}`} className="text-sm text-brand-600 hover:underline">
            View public page →
          </Link>
        </div>
        <AddProductForm categories={categories} />

        <div className="mt-6 bg-white rounded-xl shadow p-4">
          <h3 className="font-semibold text-sm mb-2">Your products ({shop.products.length})</h3>
          {shop.products.length === 0 ? (
            <p className="text-sm text-gray-500">No products yet.</p>
          ) : (
            shop.products.map((p) => <ShopProductRow key={p.id} product={p as any} categories={categories} />)
          )}
        </div>
      </div>

      <div className="space-y-6 h-fit">
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="font-semibold text-sm mb-2">Manage shop</h3>
          <ul className="text-sm space-y-1.5">
            <li>
              <Link href="/dashboard/shop/orders" className="text-brand-600 hover:underline">
                Orders
              </Link>
            </li>
            <li>
              <Link href="/dashboard/shop/import" className="text-brand-600 hover:underline">
                Import products
              </Link>
            </li>
            <li>
              <Link href="/dashboard/shop/connections" className="text-brand-600 hover:underline">
                Connections
              </Link>
            </li>
            <li>
              <Link href="/dashboard/shop/payments" className="text-brand-600 hover:underline">
                Payments
              </Link>
            </li>
            <li>
              <Link href="/dashboard/shop/coupons" className="text-brand-600 hover:underline">
                Coupons
              </Link>
            </li>
            <li>
              <Link href="/dashboard/shop/shipping" className="text-brand-600 hover:underline">
                Shipping
              </Link>
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="font-semibold text-sm mb-2">Tips</h3>
          <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
            <li>Products you add here show up instantly on the public marketplace.</li>
            <li>Link a product to a post from the feed composer to promote it (coming soon).</li>
            <li>Import products from Printify, Printful, a public product URL, or a CSV file from the import page.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
