import { NextResponse } from "next/server";
import { orderByPaymentId, syncOrderRefunds } from "@/lib/refundSync";

// PayPal webhook (PAYMENT.CAPTURE.REFUNDED / PAYMENT.CAPTURE.REVERSED), one per shop's
// PayPal app, all pointing here. The payload is only used to find which capture changed;
// the refund itself is then read from that shop's PayPal account, so a forged call can't
// invent a refund. Always answers 200 quickly so PayPal doesn't retry forever.

type Link = { rel?: string; href?: string };

export async function POST(req: Request) {
  let event: { event_type?: string; resource?: { id?: string; links?: Link[] } };
  try {
    event = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const type = event.event_type ?? "";
  const resource = event.resource ?? {};
  if (type !== "PAYMENT.CAPTURE.REFUNDED" && type !== "PAYMENT.CAPTURE.REVERSED") {
    return NextResponse.json({ ok: true, ignored: type });
  }
  // Refund-style resources link "up" to the capture they belong to; otherwise the
  // resource is the capture itself.
  const up = resource.links?.find((l) => l.rel === "up")?.href ?? "";
  const captureId = up.match(/\/captures\/([^/?]+)/)?.[1] ?? resource.id;
  if (!captureId) return NextResponse.json({ ok: true, ignored: "no capture id" });

  const order = await orderByPaymentId(captureId);
  if (!order) return NextResponse.json({ ok: true, ignored: "unknown capture" });

  try {
    const reported = await syncOrderRefunds(order);
    return NextResponse.json({ ok: true, reported });
  } catch (err) {
    console.error(`PayPal webhook ${type} for capture ${captureId} failed:`, err);
    // 500 lets PayPal retry later; the daily check also catches it.
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
