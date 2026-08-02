import { db } from "@/lib/db";
import { priceCartItems } from "@/lib/checkout";
import { evaluateCoupon } from "@/lib/coupons";

// Shared by the simulated checkout flow and every real processor's capture
// step, so all of them price, discount, and record orders identically.
export async function createPaidOrder({
  buyerId,
  items,
  couponCode,
  paymentProvider,
  externalPaymentId,
}: {
  buyerId: string;
  items: any[];
  couponCode?: string;
  paymentProvider?: string;
  externalPaymentId?: string;
}) {
  const priced = await priceCartItems(items);
  if (priced.length === 0) {
    throw new Error("No valid items in cart.");
  }

  const totalCents = priced.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);

  let discountCents = 0;
  let couponId: string | undefined;
  let couponCodeSnapshot: string | undefined;

  if (couponCode) {
    const result = await evaluateCoupon(couponCode, items);
    if (!result.valid) throw new Error(result.error);
    discountCents = result.discountCents;
    couponId = result.couponId;
    couponCodeSnapshot = result.code;
  }

  const finalTotalCents = Math.max(0, totalCents - discountCents);

  const order = await db.$transaction(async (tx) => {
    if (couponId) {
      await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
    }
    return tx.order.create({
      data: {
        buyerId,
        status: "PAID",
        totalCents: finalTotalCents,
        discountCents,
        couponCode: couponCodeSnapshot,
        couponId,
        paymentProvider,
        externalPaymentId,
        items: {
          create: priced.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            variantLabel: i.variantLabel,
            quantity: i.quantity,
            unitPriceCents: i.unitPriceCents,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });
  });

  return { order, finalTotalCents, priced };
}
