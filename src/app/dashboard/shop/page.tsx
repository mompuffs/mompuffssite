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
    include: { products: { orderBy: { createdAt: "desc" } } },
  });

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
        <AddProductForm />

        <div className="mt-6 bg-white rounded-xl shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm">Your products ({shop.products.length})</h3>
            <Link href="/dashboard/shop/import" className="text-sm text-brand-600 hover:underline">
              Import from Printify / Printful / Peaprint →
            </Link>
          </div>
          {shop.products.length === 0 ? (
            <p className="text-sm text-gray-500">No products yet.</p>
          ) : (
            shop.products.map((p) => <ShopProductRow key={p.id} product={p as any} />)
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 h-fit">
        <h3 className="font-semibold text-sm mb-2">Tips</h3>
        <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
          <li>Products you add here show up instantly on the public marketplace.</li>
          <li>Link a product to a post from the feed composer to promote it (coming soon).</li>
          <li>Import catalog items from Printify, Printful, or Peaprint from the import page.</li>
        </ul>
      </div>
    </div>
  );
}
