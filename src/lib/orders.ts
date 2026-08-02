import { db } from "@/lib/db";
import { priceCartItems } from "@/lib/checkout";
import { evaluateCoupon } from "@/lib/coupons";
import { calculateShippingCents } from "@/lib/shipping";

export type AddressInput = {
  name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
};

function addressFields(prefix: "billing" | "shipping", address?: AddressInput) {
  if (!address) return {};
  return {
    [`${prefix}Name`]: address.name || undefined,
    [`${prefix}Address1`]: address.address1 || undefined,
    [`${prefix}Address2`]: address.address2 || undefined,
    [`${prefix}City`]: address.city || undefined,
    [`${prefix}State`]: address.state || undefined,
    [`${prefix}Zip`]: address.zip || undefined,
    [`${prefix}Country`]: address.country || undefined,
  };
}

// Shared by the simulated checkout flow and every real processor's capture
// step, so all of them price, discount, ship, and record orders identically.
export async function createPaidOrder({
  buyerId,
  items,
  couponCode,
  paymentProvider,
  externalPaymentId,
  billing,
  shipping,
  contactPhone,
}: {
  buyerId: string;
  items: any[];
  couponCode?: string;
  paymentProvider?: string;
  externalPaymentId?: string;
  billing?: AddressInput;
  shipping?: AddressInput;
  contactPhone?: string;
}) {
  const priced = await priceCartItems(items);
  if (priced.length === 0) {
    throw new Error("No valid items in cart.");
  }

  const totalCents = priced.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);
  const shippingCents = await calculateShippingCents(priced);

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

  const finalTotalCents = Math.max(0, totalCents - discountCents) + shippingCents;

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
        shippingCents,
        couponCode: couponCodeSnapshot,
        couponId,
        paymentProvider,
        externalPaymentId,
        contactPhone: contactPhone || undefined,
        ...addressFields("billing", billing),
        ...addressFields("shipping", shipping),
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

  return { order, finalTotalCents, shippingCents, priced };
}
