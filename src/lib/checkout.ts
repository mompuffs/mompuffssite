import { db } from "@/lib/db";

export type PricedCartItem = {
  productId: string;
  shopId: string;
  variantId?: string;
  variantLabel?: string;
  quantity: number;
  unitPriceCents: number;
};

// Re-prices a client-submitted cart against the database -- variant price if
// present, otherwise the product's base price. Shared by order creation and
// coupon evaluation so both always agree on what a cart actually costs.
export async function priceCartItems(items: any[]): Promise<PricedCartItem[]> {
  const productIds = items.map((i: any) => i.productId);
  const variantIds = items.filter((i: any) => i.variantId).map((i: any) => i.variantId);

  const [products, variants] = await Promise.all([
    db.product.findMany({ where: { id: { in: productIds } } }),
    variantIds.length > 0 ? db.productVariant.findMany({ where: { id: { in: variantIds } } }) : Promise.resolve([]),
  ]);
  const productMap = new Map(products.map((p) => [p.id, p]));
  const variantMap = new Map(variants.map((v) => [v.id, v]));

  const priced: PricedCartItem[] = [];
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) continue;

    const variant = item.variantId ? variantMap.get(item.variantId) : undefined;
    if (item.variantId && (!variant || variant.productId !== product.id || !variant.isAvailable)) continue;

    priced.push({
      productId: product.id,
      shopId: product.shopId,
      variantId: variant?.id,
      variantLabel: variant?.label,
      quantity: Math.max(1, Number(item.quantity) || 1),
      unitPriceCents: variant ? variant.priceCents : product.priceCents,
    });
  }
  return priced;
}
