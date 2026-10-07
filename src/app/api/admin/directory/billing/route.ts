import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin";
import { setUpBillingPlans } from "@/lib/directoryBilling";

export const dynamic = "force-dynamic";

// One-time: creates the directory premium product + monthly/yearly plans in
// the MomPuffs shop's PayPal account.
export async function POST() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  try {
    await setUpBillingPlans();
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "PayPal setup failed." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
