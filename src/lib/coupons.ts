import { db } from "@/lib/db";
import { priceCartItems } from "./checkout";
import { formatCents } from "./money";

export type CouponEvaluation =
  | {
      valid: true;
      couponId: string;
      code: string;
      type: "PERCENT" | "FIXED";
      amount: number;
      shopId: string;
      shopName: string;
      subtotalCents: number;
      discountCents: number;
    }
  | { valid: false; error: string };

// A coupon only discounts the subtotal of ITS OWN shop's items in the cart --
// a multi-vendor checkout applying "SUMMER20" from Shop A never touches Shop
// B's line items.
export async function evaluateCoupon(code: string, items: any[]): Promise<CouponEvaluation> {
  const normalizedCode = String(code || "").trim().toUpperCase();
  if (!normalizedCode) return { valid: false, error: "Enter a code." };

  const priced = await priceCartItems(items);
  if (priced.length === 0) return { valid: false, error: "Cart is empty." };

  const shopIds = Array.from(new Set(priced.map((i) => i.shopId)));
  const coupon = await db.coupon.findFirst({
    where: { code: normalizedCode, shopId: { in: shopIds }, isActive: true },
    include: { shop: { select: { name: true } } },
  });
  if (!coupon) return { valid: false, error: "That code isn't valid for the shop(s) in your cart." };
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return { valid: false, error: "This code has expired." };
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, error: "This code has reached its usage limit." };
  }

  const subtotalCents = priced
    .filter((i) => i.shopId === coupon.shopId)
    .reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);

  if (subtotalCents === 0) {
    return { valid: false, error: `This code is for ${coupon.shop.name}, but your cart has nothing from that shop.` };
  }
  if (coupon.minOrderCents && subtotalCents < coupon.minOrderCents) {
    return {
      valid: false,
      error: `This code needs a minimum order of ${formatCents(coupon.minOrderCents)} from ${coupon.shop.name}.`,
    };
  }

  const discountCents =
    coupon.type === "PERCENT" ? Math.round(subtotalCents * (coupon.amount / 100)) : Math.min(coupon.amount, subtotalCents);

  return {
    valid: true,
    couponId: coupon.id,
    code: coupon.code,
    type: coupon.type as "PERCENT" | "FIXED",
    amount: coupon.amount,
    shopId: coupon.shopId,
    shopName: coupon.shop.name,
    subtotalCents,
    discountCents,
  };
}
