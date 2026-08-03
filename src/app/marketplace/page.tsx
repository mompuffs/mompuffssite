import Link from "next/link";
import { db } from "@/lib/db";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function MarketplacePage({ searchParams }: { searchParams: { shop?: string } }) {
  const [shops, products] = await Promise.all([
    db.shop.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, _count: { select: { products: true } } },
    }),
    db.product.findMany({
      where: searchParams.shop ? { shop: { slug: searchParams.shop } } : undefined,
      orderBy: { createdAt: "desc" },
      include: { shop: { select: { name: true, slug: true } } },
    }),
  ]);

  const activeShop = searchParams.shop ? shops.find((s) => s.slug === searchParams.shop) : undefined;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Marketplace</h1>

      <div className="flex flex-col sm:flex-row gap-6">
        <aside className="sm:w-56 flex-shrink-0">
          <div className="bg-white rounded-xl shadow p-4 text-sm space-y-2">
            <p className="font-semibold text-gray-800 mb-1">Shops</p>
            <Link
              href="/marketplace"
              className={`flex justify-between ${
                !activeShop ? "font-semibold text-brand-600" : "text-gray-700 hover:text-brand-600"
              }`}
            >
              <span>All shops</span>
            </Link>
            {shops.length === 0 ? (
              <p className="text-gray-500 text-xs">No shops yet.</p>
            ) : (
              shops.map((shop) => (
                <Link
                  key={shop.id}
                  href={`/marketplace?shop=${shop.slug}`}
                  className={`flex justify-between ${
                    activeShop?.id === shop.id ? "font-semibold text-brand-600" : "text-gray-700 hover:text-brand-600"
                  }`}
                >
                  <span className="truncate">{shop.name}</span>
                  <span className="text-gray-400">{shop._count.products}</span>
                </Link>
              ))
            )}
          </div>
        </aside>

        <div className="flex-1">
          {activeShop && (
            <p className="text-sm text-gray-500 mb-3">
              Showing <span className="font-medium">{activeShop.name}</span> ·{" "}
              <Link href={`/shop/${activeShop.slug}`} className="text-brand-600 hover:underline">
                visit shop page
              </Link>{" "}
              ·{" "}
              <Link href="/marketplace" className="text-brand-600 hover:underline">
                clear filter
              </Link>
            </p>
          )}
          {products.length === 0 ? (
            <p className="text-gray-500">No products yet. Open a shop and add something!</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p as any} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
