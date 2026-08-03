import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { category?: string };
}) {
  const shop = await db.shop.findUnique({
    where: { slug: params.slug },
    include: { owner: { select: { username: true, displayName: true } } },
  });

  if (!shop) notFound();

  const categories = await db.category.findMany({ orderBy: [{ parentId: "asc" }, { name: "asc" }] });
  const topLevel = categories.filter((c) => !c.parentId);
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);

  const activeCategory = searchParams.category
    ? categories.find((c) => c.slug === searchParams.category)
    : undefined;
  const activeCategoryIds = activeCategory
    ? [activeCategory.id, ...childrenOf(activeCategory.id).map((c) => c.id)]
    : undefined;

  const [products, shopProductsForCounts] = await Promise.all([
    db.product.findMany({
      where: {
        shopId: shop.id,
        ...(activeCategoryIds ? { categories: { some: { id: { in: activeCategoryIds } } } } : {}),
      },
      orderBy: { createdAt: "desc" },
    }),
    db.product.findMany({ where: { shopId: shop.id }, select: { id: true, categories: { select: { id: true } } } }),
  ]);

  function countForCategoryIds(ids: string[]) {
    const matched = new Set<string>();
    for (const p of shopProductsForCounts) {
      if (p.categories.some((c) => ids.includes(c.id))) matched.add(p.id);
    }
    return matched.size;
  }

  return (
    <div>
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h1 className="text-2xl font-bold">{shop.name}</h1>
        <p className="text-sm text-gray-500">
          run by{" "}
          <a href={`/profile/${shop.owner.username}`} className="text-brand-600 hover:underline">
            {shop.owner.displayName}
          </a>
        </p>
        {shop.description && <p className="mt-2 text-sm">{shop.description}</p>}
      </div>

      <div className="flex flex-col sm:flex-row gap-6">
        <aside className="sm:w-56 flex-shrink-0">
          <div className="bg-white rounded-xl shadow p-4 text-sm space-y-3">
            <Link
              href={`/shop/${shop.slug}`}
              className={`flex justify-between ${
                !activeCategory ? "font-semibold text-brand-600" : "text-gray-700 hover:text-brand-600"
              }`}
            >
              <span>All Products</span>
              <span className="text-gray-400">{shopProductsForCounts.length}</span>
            </Link>
            {topLevel.map((top) => {
              const kids = childrenOf(top.id);
              const topCount = countForCategoryIds([top.id, ...kids.map((c) => c.id)]);
              return (
                <div key={top.id}>
                  <Link
                    href={`/shop/${shop.slug}?category=${top.slug}`}
                    className={`flex justify-between ${
                      activeCategory?.id === top.id
                        ? "font-semibold text-brand-600"
                        : "font-medium text-gray-800 hover:text-brand-600"
                    }`}
                  >
                    <span>{top.name}</span>
                    <span className="text-gray-400 font-normal">{topCount}</span>
                  </Link>
                  {kids.length > 0 && (
                    <div className="pl-3 mt-1 space-y-1 border-l">
                      {kids.map((child) => (
                        <Link
                          key={child.id}
                          href={`/shop/${shop.slug}?category=${child.slug}`}
                          className={`flex justify-between pl-2 ${
                            activeCategory?.id === child.id
                              ? "font-semibold text-brand-600"
                              : "text-gray-600 hover:text-brand-600"
                          }`}
                        >
                          <span>{child.name}</span>
                          <span className="text-gray-400">{countForCategoryIds([child.id])}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        <div className="flex-1">
          {activeCategory && (
            <p className="text-sm text-gray-500 mb-3">
              Showing <span className="font-medium">{activeCategory.name}</span> ·{" "}
              <Link href={`/shop/${shop.slug}`} className="text-brand-600 hover:underline">
                clear filter
              </Link>
            </p>
          )}
          {products.length === 0 ? (
            <p className="text-gray-500">
              {activeCategory ? "No products in this category yet." : "This shop has no products yet."}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={{ ...p, shop: { name: shop.name, slug: shop.slug } } as any} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
