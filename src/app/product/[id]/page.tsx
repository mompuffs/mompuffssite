import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";
import AddToCartButton from "@/components/AddToCartButton";
import ProductViewer from "@/components/ProductViewer";
import ProductGallery from "@/components/ProductGallery";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await db.product.findUnique({
    where: { id: params.id },
    include: {
      shop: { select: { name: true, slug: true } },
      variants: true,
      images: { orderBy: { position: "asc" } },
    },
  });

  if (!product) notFound();

  const galleryImages = product.images.map((i) => i.url);

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-6 grid sm:grid-cols-2 gap-6">
      {product.variants.length > 0 ? (
        <ProductViewer
          product={{ id: product.id, title: product.title }}
          shop={{ name: product.shop.name, slug: product.shop.slug }}
          description={product.description}
          source={product.source}
          baseImageUrl={product.imageUrl}
          galleryImages={galleryImages}
          variants={product.variants.map((v) => ({
            id: v.id,
            label: v.label,
            priceCents: v.priceCents,
            currency: v.currency,
            isAvailable: v.isAvailable,
            imageUrl: v.imageUrl,
            options: v.optionsJson ? JSON.parse(v.optionsJson) : null,
          }))}
        />
      ) : (
        <>
          <ProductGallery
            title={product.title}
            images={Array.from(new Set([product.imageUrl, ...galleryImages].filter((u): u is string => Boolean(u))))}
          />
          <div>
            <h1 className="text-2xl font-bold">{product.title}</h1>
            <Link href={`/shop/${product.shop.slug}`} className="text-sm text-brand-600 hover:underline">
              {product.shop.name}
            </Link>
            <p className="text-xl font-semibold mt-3">{formatCents(product.priceCents, product.currency)}</p>
            <div className="mt-4">
              <AddToCartButton
                product={{ id: product.id, title: product.title, priceCents: product.priceCents, imageUrl: product.imageUrl }}
              />
            </div>
            {product.description && (
              <p className="mt-4 text-sm text-gray-700 whitespace-pre-wrap">{product.description}</p>
            )}
            {product.source !== "MANUAL" && (
              <p className="mt-2 text-xs inline-block bg-gray-100 text-gray-600 px-2 py-1 rounded">
                Sourced from {product.source}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
