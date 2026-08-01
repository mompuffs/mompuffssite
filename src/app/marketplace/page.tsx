import { db } from "@/lib/db";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const products = await db.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { shop: { select: { name: true, slug: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Marketplace</h1>
      {products.length === 0 ? (
        <p className="text-gray-500">No products yet. Open a shop and add something!</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p as any} />
          ))}
        </div>
      )}
    </div>
  );
}
