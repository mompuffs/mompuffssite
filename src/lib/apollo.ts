import { cookies } from "next/headers";

// Reports orders and refunds to Apollo analytics (server to server), so sales show up
// with the ad/link that brought the buyer. Needs APOLLO_API_KEY (a live key from Apollo ->
// Mom Puffs -> Settings -> Sales tracking). Without it this does nothing. Never throws:
// a slow or failing Apollo must not affect checkout or refunds.

const APOLLO_URL = process.env.APOLLO_URL ?? "https://apollo.innovativeonlinesolution.com";

async function postToApollo(label: string, body: Record<string, unknown>): Promise<boolean> {
  const key = process.env.APOLLO_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch(`${APOLLO_URL}/api/postback`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) console.error(`Apollo ${label} failed: ${res.status} ${await res.text()}`);
    return res.ok;
  } catch (err) {
    console.error(`Apollo ${label} failed:`, err);
    return false;
  }
}

export async function reportSaleToApollo(sale: {
  orderId: string;
  amountCents: number;
  email?: string | null;
  products: string[];
  metadata?: Record<string, unknown>;
}): Promise<void> {
  // The visitor id Apollo's tracker set on mompuffs.com links the sale to their visits.
  let visitorId: string | undefined;
  try {
    visitorId = cookies().get("_apo_v")?.value;
  } catch {
    // Not in a request context; the email still lets Apollo match the buyer.
  }
  await postToApollo(`sale report for order ${sale.orderId}`, {
    event_id: `order_${sale.orderId}`,
    type: "purchase",
    order_id: sale.orderId,
    amount: sale.amountCents,
    currency: "USD",
    visitor_id: visitorId,
    email: sale.email ?? undefined,
    products: sale.products,
    metadata: sale.metadata,
  });
}

/**
 * Refunds and chargebacks. `processorId` is the PayPal/Stripe refund or dispute id, so the
 * same refund reported twice (webhook + daily check) only counts once in Apollo.
 */
export function reportRefundToApollo(refund: {
  orderId: string;
  processorId: string;
  type: "refund" | "chargeback";
  amountCents: number;
  occurredAt?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<boolean> {
  return postToApollo(`${refund.type} report ${refund.processorId} for order ${refund.orderId}`, {
    event_id: `${refund.type}_${refund.processorId}`,
    type: refund.type,
    order_id: refund.orderId,
    amount: refund.amountCents,
    currency: "USD",
    occurred_at: refund.occurredAt ?? undefined,
    metadata: refund.metadata,
  });
}
