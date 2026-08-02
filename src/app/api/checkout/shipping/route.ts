import { NextResponse } from "next/server";
import { priceCartItems } from "@/lib/checkout";
import { calculateShippingCents } from "@/lib/shipping";

// Quotes shipping for the current cart so the checkout review step can show
// it before any payment is initiated.
export async function POST(req: Request) {
  const { items } = await req.json();
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ shippingCents: 0 });
  }

  const priced = await priceCartItems(items);
  const shippingCents = await calculateShippingCents(priced);
  return NextResponse.json({ shippingCents });
}
