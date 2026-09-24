import { db } from "@/lib/db";
import { reportRefundToApollo } from "@/lib/apollo";
import { getShopPaymentCreds } from "@/lib/payments/connections";
import { getCapture, getOrderRefunds } from "@/lib/payments/paypal";
import { listPaymentDisputes, listPaymentRefunds } from "@/lib/payments/stripe";

// Finds refunds and chargebacks by asking each shop's own PayPal/Stripe account (never by
// trusting a webhook's payload), and reports them to Apollo. Used by the payment webhooks
// (instant) and a daily job (catches anything a webhook missed, and shops without one).
// Apollo ignores repeats, so reporting the same refund twice is harmless.

const cents = (value: string) => Math.round(parseFloat(value) * 100);

type SyncOrder = { id: string; paymentProvider: string | null; externalPaymentId: string | null };

async function shopIdFor(orderId: string): Promise<string | null> {
  const item = await db.orderItem.findFirst({ where: { orderId }, select: { product: { select: { shopId: true } } } });
  return item?.product.shopId ?? null;
}

/** Reports every refund/chargeback on one order. Returns how many were sent. */
export async function syncOrderRefunds(order: SyncOrder): Promise<number> {
  if (!order.externalPaymentId || !order.paymentProvider) return 0;
  const shopId = await shopIdFor(order.id);
  if (!shopId) return 0;
  let sent = 0;

  if (order.paymentProvider === "PAYPAL") {
    const creds = await getShopPaymentCreds(shopId, "paypal");
    if (!creds) return 0;
    const pp = { clientId: creds.clientId, apiKey: creds.apiKey, environment: creds.environment };
    const capture = await getCapture(pp, order.externalPaymentId);
    if (capture.status === "REVERSED") {
      // A chargeback PayPal settled against the seller: the whole capture is gone.
      if (await reportRefundToApollo({ orderId: order.id, processorId: capture.id, type: "chargeback", amountCents: cents(capture.amount.value), occurredAt: capture.update_time, metadata: { payment: "PAYPAL" } })) sent++;
      return sent;
    }
    if (capture.status !== "REFUNDED" && capture.status !== "PARTIALLY_REFUNDED") return 0;
    const paypalOrderId = capture.supplementary_data?.related_ids?.order_id;
    if (!paypalOrderId) return 0;
    for (const r of await getOrderRefunds(pp, paypalOrderId)) {
      if (r.status !== "COMPLETED") continue;
      if (await reportRefundToApollo({ orderId: order.id, processorId: r.id, type: "refund", amountCents: cents(r.amount.value), occurredAt: r.create_time, metadata: { payment: "PAYPAL" } })) sent++;
    }
    return sent;
  }

  if (order.paymentProvider === "STRIPE") {
    const creds = await getShopPaymentCreds(shopId, "stripe");
    if (!creds) return 0;
    const sc = { apiKey: creds.apiKey, publishableKey: creds.publishableKey };
    for (const r of await listPaymentRefunds(sc, order.externalPaymentId)) {
      if (r.status !== "succeeded") continue;
      if (await reportRefundToApollo({ orderId: order.id, processorId: r.id, type: "refund", amountCents: r.amount, occurredAt: new Date(r.created * 1000).toISOString(), metadata: { payment: "STRIPE" } })) sent++;
    }
    for (const d of await listPaymentDisputes(sc, order.externalPaymentId)) {
      if (d.status !== "lost") continue;
      if (await reportRefundToApollo({ orderId: order.id, processorId: d.id, type: "chargeback", amountCents: d.amount, occurredAt: new Date(d.created * 1000).toISOString(), metadata: { payment: "STRIPE" } })) sent++;
    }
    return sent;
  }

  return 0; // Other processors don't report refunds yet.
}

/** The daily job: re-checks recent PayPal/Stripe orders. */
export async function syncRecentRefunds(days = 180): Promise<{ checked: number; reported: number; errors: number }> {
  const since = new Date(Date.now() - days * 86_400_000);
  const orders = await db.order.findMany({
    where: { createdAt: { gte: since }, paymentProvider: { in: ["PAYPAL", "STRIPE"] }, externalPaymentId: { not: null } },
    select: { id: true, paymentProvider: true, externalPaymentId: true },
    orderBy: { createdAt: "desc" },
  });
  let reported = 0;
  let errors = 0;
  for (const order of orders) {
    try {
      reported += await syncOrderRefunds(order);
    } catch (err) {
      errors++;
      console.error(`Refund check for order ${order.id} failed:`, err);
    }
  }
  return { checked: orders.length, reported, errors };
}

export async function orderByPaymentId(externalPaymentId: string) {
  return db.order.findFirst({
    where: { externalPaymentId },
    select: { id: true, paymentProvider: true, externalPaymentId: true },
  });
}
