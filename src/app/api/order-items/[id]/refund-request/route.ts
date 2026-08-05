import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { sendRefundRequestNotification } from "@/lib/email";

// Buyer-initiated refund request, scoped to a single order line item (see
// the RefundRequest model comment in prisma/schema.prisma for why it's
// per-item rather than per-order). Notifies the selling shop's owner --
// approving/denying it is a status change only, never an actual refund.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { reason } = await req.json();
  const trimmedReason = String(reason || "").trim();
  if (!trimmedReason) return NextResponse.json({ error: "Please describe why you're requesting a refund." }, { status: 400 });
  if (trimmedReason.length > 2000) {
    return NextResponse.json({ error: "That reason is too long." }, { status: 400 });
  }

  const item = await db.orderItem.findUnique({
    where: { id: params.id },
    include: {
      order: { select: { id: true, buyerId: true } },
      product: { select: { title: true, shopId: true, shop: { select: { name: true, owner: { select: { email: true } } } } } },
    },
  });
  if (!item || item.order.buyerId !== user.id) {
    return NextResponse.json({ error: "Order item not found." }, { status: 404 });
  }

  const existing = await db.refundRequest.findFirst({
    where: { orderItemId: item.id, status: { in: ["PENDING", "APPROVED"] } },
  });
  if (existing) {
    return NextResponse.json(
      { error: existing.status === "PENDING" ? "A refund request for this item is already pending." : "This item's refund request was already approved." },
      { status: 409 }
    );
  }

  const request = await db.refundRequest.create({
    data: {
      orderItemId: item.id,
      shopId: item.product.shopId,
      reason: trimmedReason,
    },
  });

  const buyer = await db.user.findUnique({ where: { id: user.id }, select: { displayName: true } });

  await sendRefundRequestNotification({
    to: item.product.shop.owner.email,
    shopName: item.product.shop.name,
    buyerName: buyer?.displayName ?? "A buyer",
    item: {
      title: item.product.title,
      variantLabel: item.variantLabel,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
    },
    reason: trimmedReason,
    orderId: item.order.id,
  });

  return NextResponse.json(request, { status: 201 });
}
