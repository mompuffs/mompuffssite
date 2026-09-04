import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import CreateShopForm from "@/components/CreateShopForm";
import AddProductForm from "@/components/AddProductForm";
import ShopProductList from "@/components/ShopProductList";

export const dynamic = "force-dynamic";

export default async function ShopDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const shop = await db.shop.findUnique({
    where: { ownerId: user.id },
    include: {
      products: {
        where: { archivedAt: null },
        orderBy: { createdAt: "desc" },
        include: { categories: true },
      },
    },
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
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold">{shop.name}</h1>
        <Link href={`/shop/${shop.slug}`} className="text-sm text-brand-600 hover:underline">
          View public page →
        </Link>
      </div>
      <AddProductForm categories={categories} />
      <ShopProductList products={shop.products as any} categories={categories} />
    </div>
  );
}
