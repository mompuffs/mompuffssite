import { NextResponse } from "next/server";
import { priceCartItems } from "@/lib/checkout";
import { evaluateCoupon } from "@/lib/coupons";
import { calculateShippingCents } from "@/lib/shipping";
import { calculateCartTax, TaxAddress } from "@/lib/tax";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { items, address, couponCode } = await req.json();
  const priced = await priceCartItems(Array.isArray(items) ? items : []);
  const dest: TaxAddress = {
    country: address?.country,
    state: address?.state,
    postcode: address?.zip || address?.postcode,
    city: address?.city,
  };

  const shippingCents = await calculateShippingCents(priced);
  let discountCents = 0;
  if (couponCode) {
    const result = await evaluateCoupon(couponCode, items);
    if (result.valid) discountCents = result.discountCents;
  }

  const { taxCents, lines } = await calculateCartTax({
    priced,
    shippingCents,
    discountCents,
    address: dest,
  });

  return NextResponse.json({ taxCents, lines });
}
