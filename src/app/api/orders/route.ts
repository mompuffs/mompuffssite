import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// Prototype checkout: no real payment processor is wired up. This endpoint
// trusts the client-submitted cart, re-prices every line item server-side
// against the database, and creates a PAID order immediately (simulated).
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { items } = await req.json();
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
  }

  const productIds = items.map((i: any) => i.productId);
  const variantIds = items.filter((i: any) => i.variantId).map((i: any) => i.variantId);

  const [products, variants] = await Promise.all([
    db.product.findMany({ where: { id: { in: productIds } } }),
    variantIds.length > 0 ? db.productVariant.findMany({ where: { id: { in: variantIds } } }) : Promise.resolve([]),
  ]);
  const productMap = new Map(products.map((p) => [p.id, p]));
  const variantMap = new Map(variants.map((v) => [v.id, v]));

  let totalCents = 0;
  const orderItemsData = [];
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) continue;

    const variant = item.variantId ? variantMap.get(item.variantId) : undefined;
    if (item.variantId && (!variant || variant.productId !== product.id || !variant.isAvailable)) continue;

    const unitPriceCents = variant ? variant.priceCents : product.priceCents;
    const quantity = Math.max(1, Number(item.quantity) || 1);
    totalCents += unitPriceCents * quantity;
    orderItemsData.push({
      productId: product.id,
      variantId: variant?.id,
      variantLabel: variant?.label,
      quantity,
      unitPriceCents,
    });
  }

  if (orderItemsData.length === 0) {
    return NextResponse.json({ error: "No valid items in cart." }, { status: 400 });
  }

  const order = await db.order.create({
    data: {
      buyerId: user.id,
      status: "PAID",
      totalCents,
      items: { create: orderItemsData },
    },
    include: { items: { include: { product: true } } },
  });

  return NextResponse.json(order, { status: 201 });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const orders = await db.order.findMany({
    where: { buyerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: { include: { product: true } } },
  });

  return NextResponse.json(orders);
}
