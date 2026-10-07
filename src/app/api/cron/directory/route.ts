import { NextResponse } from "next/server";
import { syncSubscriptions } from "@/lib/directoryBilling";

// Daily (vercel.json): re-syncs directory premium PayPal subscriptions and
// sends the 1-week renewal reminders. Same auth as /api/cron/refunds.

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const fromVercelCron = (req.headers.get("user-agent") ?? "").startsWith("vercel-cron/");
  if (secret ? auth !== `Bearer ${secret}` : !fromVercelCron) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await syncSubscriptions();
  console.log("directory subscription sync", JSON.stringify(result));
  return NextResponse.json({ ok: true, ...result });
}
