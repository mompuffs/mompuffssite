import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { normalizeSourceUrl } from "@/lib/urlImport";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) return NextResponse.json({ error: "You need a shop first." }, { status: 400 });

  const { sourceUrl, title, description, imageUrl, priceCents, raw, categoryIds } = await req.json();
  if (!sourceUrl || !title || !priceCents) {
    return NextResponse.json({ error: "Missing product fields." }, { status: 400 });
  }

  if (Array.isArray(categoryIds) && categoryIds.length > 0) {
    const ownedCount = await db.category.count({ where: { id: { in: categoryIds }, shopId: shop.id } });
    if (ownedCount !== categoryIds.length) {
      return NextResponse.json({ error: "One or more categories don't belong to your shop." }, { status: 400 });
    }
  }

  const normalized = normalizeSourceUrl(String(sourceUrl));
  const existingUrlProducts = await db.product.findMany({
    where: { shopId: shop.id, source: "URL", externalId: { not: null } },
    select: { id: true, externalId: true },
  });
  const existing = existingUrlProducts.find(
    (p) => p.externalId && normalizeSourceUrl(p.externalId) === normalized
  );
  if (existing) {
    return NextResponse.json(
      { error: "You've already imported this product.", existingProductId: existing.id },
      { status: 409 }
    );
  }

  const product = await db.product.create({
    data: {
      shopId: shop.id,
      title,
      description: description || undefined,
      priceCents: Math.round(Number(priceCents)),
      imageUrl: imageUrl || undefined,
      source: "URL",
      externalId: normalized,
      externalMeta: raw ? JSON.stringify(raw).slice(0, 5000) : undefined,
      categories:
        Array.isArray(categoryIds) && categoryIds.length > 0
          ? { connect: categoryIds.map((id: string) => ({ id })) }
          : undefined,
    },
    include: { categories: true },
  });

  return NextResponse.json(product, { status: 201 });
}
