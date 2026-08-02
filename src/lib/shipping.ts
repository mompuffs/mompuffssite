import { db } from "@/lib/db";
import { PricedCartItem } from "@/lib/checkout";

export const SHIPPING_MODES = ["FLAT", "PRODUCT", "FREE"] as const;
export type ShippingMode = (typeof SHIPPING_MODES)[number];

// Each product is one of:
//   "FLAT"    -- counts toward its shop's single flat shipping charge,
//                applied once per shop even if several FLAT items from that
//                shop are in the cart.
//   "PRODUCT" -- has its own per-unit shipping cost, added on top
//                regardless of what else is in the cart.
//   "FREE"    -- always contributes $0 shipping and never triggers its
//                shop's flat charge, overriding what FLAT would otherwise add.
export async function calculateShippingCents(items: PricedCartItem[]): Promise<number> {
  if (items.length === 0) return 0;

  const shopIds = Array.from(new Set(items.map((i) => i.shopId)));
  const productIds = Array.from(new Set(items.map((i) => i.productId)));
  const [shops, products] = await Promise.all([
    db.shop.findMany({ where: { id: { in: shopIds } }, select: { id: true, flatShippingCents: true } }),
    db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, shopId: true, shippingMode: true, shippingCents: true },
    }),
  ]);
  const shopFlatMap = new Map(shops.map((s) => [s.id, s.flatShippingCents]));
  const productMap = new Map(products.map((p) => [p.id, p]));

  const flatShopsNeeded = new Set<string>();
  let perProductCents = 0;
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) continue;
    if (product.shippingMode === "PRODUCT") {
      perProductCents += product.shippingCents * item.quantity;
    } else if (product.shippingMode === "FREE") {
      // Contributes nothing and doesn't opt its shop into the flat charge.
    } else {
      flatShopsNeeded.add(product.shopId);
    }
  }

  let flatCents = 0;
  for (const shopId of flatShopsNeeded) {
    flatCents += shopFlatMap.get(shopId) ?? 0;
  }

  return perProductCents + flatCents;
}
