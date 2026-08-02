import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { evaluateCoupon } from "@/lib/coupons";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { code, items } = await req.json();
  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "Missing cart items." }, { status: 400 });
  }

  const result = await evaluateCoupon(code, items);
  if (!result.valid) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
