import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { getPodAdapter } from "@/lib/pod";

export async function POST(req: Request, { params }: { params: { provider: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) return NextResponse.json({ error: "You need a shop first." }, { status: 400 });

  const adapter = getPodAdapter(params.provider);
  if (!adapter) return NextResponse.json({ error: "Unknown provider." }, { status: 404 });

  const { externalId, title, description, imageUrl, images, priceCents, raw, variants, categoryIds } =
    await req.json();
  if (!externalId || !title || !priceCents) {
    return NextResponse.json({ error: "Missing product fields." }, { status: 400 });
  }

  if (Array.isArray(categoryIds) && categoryIds.length > 0) {
    const ownedCount = await db.category.count({ where: { id: { in: categoryIds }, shopId: shop.id } });
    if (ownedCount !== categoryIds.length) {
      return NextResponse.json({ error: "One or more categories don't belong to your shop." }, { status: 400 });
    }
  }

  const product = await db.product.create({
    data: {
      shopId: shop.id,
      title,
      description: description || undefined,
      priceCents: Math.round(Number(priceCents)),
      imageUrl: imageUrl || undefined,
      source: adapter.id,
      externalId: String(externalId),
      externalMeta: raw ? JSON.stringify(raw).slice(0, 5000) : undefined,
      categories:
        Array.isArray(categoryIds) && categoryIds.length > 0
          ? { connect: categoryIds.map((id: string) => ({ id })) }
          : undefined,
      images:
        Array.isArray(images) && images.length > 0
          ? { create: images.map((url: string, i: number) => ({ url, position: i })) }
          : undefined,
      variants:
        Array.isArray(variants) && variants.length > 0
          ? {
              create: variants.map((v: any) => ({
                externalId: v.externalId ? String(v.externalId) : undefined,
                label: v.label || "Default",
                priceCents: Math.round(Number(v.priceCents) || 0),
                currency: v.currency || "USD",
                isAvailable: v.isAvailable !== false,
                imageUrl: v.imageUrl || undefined,
                optionsJson:
                  v.options && Object.keys(v.options).length > 0 ? JSON.stringify(v.options) : undefined,
              })),
            }
          : undefined,
    },
    include: { variants: true, images: true },
  });

  return NextResponse.json(product, { status: 201 });
}
