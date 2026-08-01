import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";
import AddToCartButton from "@/components/AddToCartButton";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await db.product.findUnique({
    where: { id: params.id },
    include: { shop: { select: { name: true, slug: true } } },
  });

  if (!product) notFound();

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-6 grid sm:grid-cols-2 gap-6">
      <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-400">No image</span>
        )}
      </div>
      <div>
        <h1 className="text-2xl font-bold">{product.title}</h1>
        <Link href={`/shop/${product.shop.slug}`} className="text-sm text-brand-600 hover:underline">
          {product.shop.name}
        </Link>
        <p className="text-xl font-semibold mt-3">{formatCents(product.priceCents, product.currency)}</p>
        {product.description && <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">{product.description}</p>}
        {product.source !== "MANUAL" && (
          <p className="mt-2 text-xs inline-block bg-gray-100 text-gray-600 px-2 py-1 rounded">
            Sourced from {product.source}
          </p>
        )}
        <div className="mt-6">
          <AddToCartButton
            product={{ id: product.id, title: product.title, priceCents: product.priceCents, imageUrl: product.imageUrl }}
          />
        </div>
      </div>
    </div>
  );
}
