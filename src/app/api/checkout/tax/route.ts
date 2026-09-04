import { NextResponse } from "next/server";
import { priceCartItems } from "@/lib/checkout";
import { calculateShippingCents } from "@/lib/shipping";
import { calculateTaxForShop, TaxAddress } from "@/lib/tax";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { items, address } = await req.json();
  const priced = await priceCartItems(Array.isArray(items) ? items : []);
  const dest: TaxAddress = {
    country: address?.country,
    state: address?.state,
    postcode: address?.zip || address?.postcode,
    city: address?.city,
  };

  const shopIds = Array.from(new Set(priced.map((i) => i.shopId)));
  let taxCents = 0;
  const lines = [];
  for (const shopId of shopIds) {
    const shopItems = priced.filter((i) => i.shopId === shopId);
    const subtotal = shopItems.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0);
    const shipping = await calculateShippingCents(shopItems);
    const result = await calculateTaxForShop(shopId, subtotal, shipping, dest);
    taxCents += result.taxCents;
    lines.push(...result.lines);
  }

  return NextResponse.json({ taxCents, lines });
}
