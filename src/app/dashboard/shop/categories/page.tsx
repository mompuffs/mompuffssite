import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import CategoryPicker from "@/components/CategoryPicker";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) redirect("/dashboard/shop");

  const categories = await db.category.findMany({
    where: { shopId: shop.id },
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
    select: { id: true, name: true, parentId: true },
  });

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">Categories</h1>
        <Link href="/dashboard/shop" className="text-sm text-brand-600 hover:underline">
          ← Back to shop
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        These categories belong to your shop only. Add them here or while editing a product.
      </p>

      <div className="bg-white rounded-xl shadow p-4">
        <CategoryPicker categories={categories} selectedIds={[]} onChange={() => {}} />
      </div>
    </div>
  );
}
