import { cookies } from "next/headers";

// Reports paid orders to Apollo analytics (server to server), so sales show up with the
// ad/link that brought the buyer. Needs APOLLO_API_KEY (a live key from Apollo -> Mom Puffs
// -> Settings -> Sales tracking). Without it this does nothing. Never throws: a slow or
// failing Apollo must not affect checkout.

const APOLLO_URL = process.env.APOLLO_URL ?? "https://apollo.innovativeonlinesolution.com";

export async function reportSaleToApollo(sale: {
  orderId: string;
  amountCents: number;
  email?: string | null;
  products: string[];
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const key = process.env.APOLLO_API_KEY;
  if (!key) return;

  // The visitor id Apollo's tracker set on mompuffs.com links the sale to their visits.
  let visitorId: string | undefined;
  try {
    visitorId = cookies().get("_apo_v")?.value;
  } catch {
    // Not in a request context; the email still lets Apollo match the buyer.
  }

  try {
    const res = await fetch(`${APOLLO_URL}/api/postback`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: `order_${sale.orderId}`,
        type: "purchase",
        order_id: sale.orderId,
        amount: sale.amountCents,
        currency: "USD",
        visitor_id: visitorId,
        email: sale.email ?? undefined,
        products: sale.products,
        metadata: sale.metadata,
      }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) console.error(`Apollo sale report for order ${sale.orderId} failed: ${res.status} ${await res.text()}`);
  } catch (err) {
    console.error(`Apollo sale report for order ${sale.orderId} failed:`, err);
  }
}
