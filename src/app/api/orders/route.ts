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
  const products = await db.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  let totalCents = 0;
  const orderItemsData = [];
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) continue;
    const quantity = Math.max(1, Number(item.quantity) || 1);
    totalCents += product.priceCents * quantity;
    orderItemsData.push({
      productId: product.id,
      quantity,
      unitPriceCents: product.priceCents,
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
