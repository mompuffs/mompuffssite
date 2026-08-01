import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function ShopPage({ params }: { params: { slug: string } }) {
  const shop = await db.shop.findUnique({
    where: { slug: params.slug },
    include: {
      owner: { select: { username: true, displayName: true } },
      products: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!shop) notFound();

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

      {shop.products.length === 0 ? (
        <p className="text-gray-500">This shop has no products yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {shop.products.map((p) => (
            <ProductCard key={p.id} product={{ ...p, shop: { name: shop.name, slug: shop.slug } } as any} />
          ))}
        </div>
      )}
    </div>
  );
}
