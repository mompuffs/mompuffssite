import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { SHIPPING_MODES } from "@/lib/shipping";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) return NextResponse.json({ error: "You need a shop first." }, { status: 400 });

  const {
    title,
    description,
    priceCents,
    imageUrl,
    images,
    videoUrl,
    videoThumbnailUrl,
    categoryIds,
    variants,
    shippingMode,
    shippingCents,
  } = await req.json();
  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  if (shippingMode !== undefined && !SHIPPING_MODES.includes(shippingMode)) {
    return NextResponse.json({ error: `shippingMode must be one of: ${SHIPPING_MODES.join(", ")}.` }, { status: 400 });
  }

  const hasVariants = Array.isArray(variants) && variants.length > 0;
  if (!hasVariants && (!priceCents || Number(priceCents) <= 0)) {
    return NextResponse.json({ error: "A positive price is required." }, { status: 400 });
  }
  if (hasVariants && variants.some((v: any) => !v.priceCents || Number(v.priceCents) <= 0)) {
    return NextResponse.json({ error: "Each variation needs a positive price." }, { status: 400 });
  }

  if (Array.isArray(categoryIds) && categoryIds.length > 0) {
    const ownedCount = await db.category.count({ where: { id: { in: categoryIds }, shopId: shop.id } });
    if (ownedCount !== categoryIds.length) {
      return NextResponse.json({ error: "One or more categories don't belong to your shop." }, { status: 400 });
    }
  }

  const basePriceCents = hasVariants ? Math.round(Number(variants[0].priceCents)) : Math.round(Number(priceCents));
  const baseImageUrl = hasVariants ? variants[0].imageUrl || imageUrl || undefined : imageUrl || undefined;

  const product = await db.product.create({
    data: {
      shopId: shop.id,
      title,
      description: description || undefined,
      priceCents: basePriceCents,
      imageUrl: baseImageUrl,
      videoUrl: videoUrl || undefined,
      videoThumbnailUrl: videoUrl ? videoThumbnailUrl || undefined : undefined,
      source: "MANUAL",
      shippingMode: shippingMode || "FLAT",
      shippingCents: shippingMode === "PRODUCT" ? Math.round(Number(shippingCents) || 0) : 0,
      categories:
        Array.isArray(categoryIds) && categoryIds.length > 0
          ? { connect: categoryIds.map((id: string) => ({ id })) }
          : undefined,
      images:
        Array.isArray(images) && images.length > 0
          ? { create: images.map((url: string, i: number) => ({ url, position: i })) }
          : undefined,
      variants: hasVariants
        ? {
            create: variants.map((v: any) => ({
              label: v.label || "Variant",
              priceCents: Math.round(Number(v.priceCents)),
              currency: v.currency || "USD",
              isAvailable: v.isAvailable !== false,
              imageUrl: v.imageUrl || undefined,
              optionsJson: v.options && Object.keys(v.options).length > 0 ? JSON.stringify(v.options) : undefined,
            })),
          }
        : undefined,
    },
    include: { categories: true, variants: true, images: true },
  });

  return NextResponse.json(product, { status: 201 });
}
