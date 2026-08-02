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

  const { externalId, title, description, imageUrl, priceCents, raw, variants } = await req.json();
  if (!externalId || !title || !priceCents) {
    return NextResponse.json({ error: "Missing product fields." }, { status: 400 });
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
      variants:
        Array.isArray(variants) && variants.length > 0
          ? {
              create: variants.map((v: any) => ({
                externalId: v.externalId ? String(v.externalId) : undefined,
                label: v.label || "Default",
                priceCents: Math.round(Number(v.priceCents) || 0),
                currency: v.currency || "USD",
                isAvailable: v.isAvailable !== false,
              })),
            }
          : undefined,
    },
    include: { variants: true },
  });

  return NextResponse.json(product, { status: 201 });
}
