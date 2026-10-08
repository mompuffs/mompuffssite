import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";
import AddToCartButton from "@/components/AddToCartButton";
import ProductViewer from "@/components/ProductViewer";
import ProductGallery from "@/components/ProductGallery";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import { breadcrumbs, plainText, product as productLd } from "@/lib/structuredData";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const p = await db.product.findUnique({
    where: { id: params.id },
    select: { title: true, description: true, priceCents: true, currency: true, imageUrl: true, archivedAt: true, shop: { select: { name: true } } },
  });
  if (!p || p.archivedAt) return { title: "Product not found | Mompuffs", robots: { index: false } };
  const price = formatCents(p.priceCents, p.currency);
  // Imported (print-on-demand) descriptions end in spec tables; keep the
  // prose before them.
  const plain = (p.description ?? "")
    .replace(/<[^>]+>/g, " ")
    .split(/\b(?:Size|Specifications?|Product details|Dimensions)|\(cm\/in\)/i)[0];
  return pageMeta({
    title: `${p.title} – ${price} | ${p.shop.name} on Mompuffs`,
    description: plain.trim() ? `${price} from ${p.shop.name}. ${plain}` : `${p.title}, ${price} from ${p.shop.name} on the Mompuffs marketplace.`,
    path: `/product/${params.id}`,
    image: p.imageUrl,
    imageAlt: p.title,
  });
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await db.product.findUnique({
    where: { id: params.id },
    include: {
      shop: { select: { name: true, slug: true } },
      variants: true,
      images: { orderBy: { position: "asc" } },
    },
  });

  if (!product || product.archivedAt) notFound();

  const galleryImages = product.images.map((i) => i.url);

  const structured = [
    productLd({
      id: product.id,
      title: product.title,
      description: plainText(product.description),
      images: Array.from(new Set([product.imageUrl, ...galleryImages].filter((u): u is string => Boolean(u)))).slice(0, 8),
      priceCents: product.priceCents,
      currency: product.currency,
      shopName: product.shop.name,
      shopSlug: product.shop.slug,
      variants: product.variants,
    }),
    breadcrumbs([
      { name: "Home", path: "/" },
      { name: "Marketplace", path: "/marketplace" },
      { name: product.shop.name, path: `/shop/${product.shop.slug}` },
      { name: product.title },
    ]),
  ];

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-6 grid sm:grid-cols-2 gap-6">
      <JsonLd items={structured} />
      {product.variants.length > 0 ? (
        <ProductViewer
          product={{ id: product.id, title: product.title }}
          shop={{ id: product.shopId, name: product.shop.name, slug: product.shop.slug }}
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
          videoUrl={product.videoUrl}
          videoThumbnailUrl={product.videoThumbnailUrl}
        />
      ) : (
        <>
          <ProductGallery
            title={product.title}
            images={Array.from(new Set([product.imageUrl, ...galleryImages].filter((u): u is string => Boolean(u))))}
            videoUrl={product.videoUrl}
            videoThumbnailUrl={product.videoThumbnailUrl}
          />
          <div>
            <h1 className="text-2xl font-bold">{product.title}</h1>
            <Link href={`/shop/${product.shop.slug}`} className="text-sm text-brand-600 hover:underline">
              {product.shop.name}
            </Link>
            <p className="text-xl font-semibold mt-3">{formatCents(product.priceCents, product.currency)}</p>
            <div className="mt-4">
              <AddToCartButton
                product={{
                  id: product.id,
                  title: product.title,
                  priceCents: product.priceCents,
                  imageUrl: product.imageUrl,
                  shopId: product.shopId,
                  shopName: product.shop.name,
                }}
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
