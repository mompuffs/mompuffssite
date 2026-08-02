import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) return NextResponse.json({ error: "You need a shop first." }, { status: 400 });

  const { title, description, priceCents, imageUrl, categoryIds } = await req.json();
  if (!title || !priceCents || Number(priceCents) <= 0) {
    return NextResponse.json({ error: "Title and a positive price (in cents) are required." }, { status: 400 });
  }

  const product = await db.product.create({
    data: {
      shopId: shop.id,
      title,
      description: description || undefined,
      priceCents: Math.round(Number(priceCents)),
      imageUrl: imageUrl || undefined,
      source: "MANUAL",
      categories:
        Array.isArray(categoryIds) && categoryIds.length > 0
          ? { connect: categoryIds.map((id: string) => ({ id })) }
          : undefined,
    },
    include: { categories: true },
  });

  return NextResponse.json(product, { status: 201 });
}
