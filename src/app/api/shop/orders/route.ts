import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// A multi-vendor order can span several shops -- this only ever returns the
// current shop's own line items from each order, never another shop's.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) return NextResponse.json({ error: "No shop." }, { status: 400 });

  const orders = await db.order.findMany({
    where: { items: { some: { product: { shopId: shop.id } } } },
    include: {
      buyer: { select: { username: true, displayName: true, email: true } },
      items: { include: { product: { select: { title: true, shopId: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = orders.map((order) => {
    const shopItems = order.items.filter((i) => i.product.shopId === shop.id);
    const subtotalCents = shopItems.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);
    return {
      id: order.id,
      createdAt: order.createdAt,
      buyer: order.buyer,
      totalCents: order.totalCents,
      shippingCents: order.shippingCents,
      discountCents: order.discountCents,
      subtotalCents,
      isOpen: shopItems.some((i) => !i.fulfilledAt),
      contactPhone: order.contactPhone,
      shippingName: order.shippingName,
      shippingAddress1: order.shippingAddress1,
      shippingAddress2: order.shippingAddress2,
      shippingCity: order.shippingCity,
      shippingState: order.shippingState,
      shippingZip: order.shippingZip,
      shippingCountry: order.shippingCountry,
      items: shopItems.map((i) => ({
        id: i.id,
        title: i.product.title,
        variantLabel: i.variantLabel,
        quantity: i.quantity,
        unitPriceCents: i.unitPriceCents,
        fulfilledAt: i.fulfilledAt,
      })),
    };
  });

  return NextResponse.json(result);
}
