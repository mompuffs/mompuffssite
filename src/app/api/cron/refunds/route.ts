import { NextResponse } from "next/server";
import { syncRecentRefunds } from "@/lib/refundSync";

// Daily (vercel.json): re-checks the last 180 days of PayPal/Stripe orders for refunds and
// chargebacks and reports new ones to Apollo. Vercel sends "Authorization: Bearer
// $CRON_SECRET" when CRON_SECRET is set; without it, only Vercel's cron runner is accepted.

export const maxDuration = 300;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const fromVercelCron = (req.headers.get("user-agent") ?? "").startsWith("vercel-cron/");
  if (secret ? auth !== `Bearer ${secret}` : !fromVercelCron) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.APOLLO_API_KEY) return NextResponse.json({ ok: true, skipped: "APOLLO_API_KEY not set" });
  const result = await syncRecentRefunds();
  console.log("refund sync", JSON.stringify(result));
  return NextResponse.json({ ok: true, ...result });
}
