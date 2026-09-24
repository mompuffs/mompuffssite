// PayPal REST API v2 (Orders) integration. Docs: https://developer.paypal.com/docs/api/orders/v2/
// Auth: OAuth2 client_credentials against the shop's own connected app.
const BASE_URLS = {
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com",
};

export type PayPalCreds = { clientId: string; apiKey: string; environment?: string };

function baseUrl(environment?: string) {
  return environment === "live" ? BASE_URLS.live : BASE_URLS.sandbox;
}

async function getAccessToken(creds: PayPalCreds): Promise<string> {
  const res = await fetch(`${baseUrl(creds.environment)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${creds.clientId}:${creds.apiKey}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PayPal authentication failed (${res.status}): ${text || res.statusText}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

export async function createOrder(creds: PayPalCreds, amountCents: number, currency = "USD") {
  const token = await getAccessToken(creds);
  const res = await fetch(`${baseUrl(creds.environment)}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{ amount: { currency_code: currency, value: (amountCents / 100).toFixed(2) } }],
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PayPal order creation failed (${res.status}): ${text || res.statusText}`);
  }
  return res.json() as Promise<{ id: string; status: string }>;
}

export async function captureOrder(creds: PayPalCreds, paypalOrderId: string) {
  const token = await getAccessToken(creds);
  const res = await fetch(`${baseUrl(creds.environment)}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`PayPal capture failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return data as {
    id: string;
    status: string;
    purchase_units: { payments: { captures: { id: string; amount: { value: string } }[] } }[];
  };
}

export async function refundCapture(creds: PayPalCreds, captureId: string, amountCents?: number, currency = "USD") {
  const token = await getAccessToken(creds);
  const res = await fetch(`${baseUrl(creds.environment)}/v2/payments/captures/${captureId}/refund`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: amountCents
      ? JSON.stringify({ amount: { value: (amountCents / 100).toFixed(2), currency_code: currency } })
      : undefined,
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`PayPal refund failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

// ---------- Lookups used to report refunds (see src/lib/refundSync.ts) ----------

async function paypalGet<T>(creds: PayPalCreds, path: string): Promise<T> {
  const token = await getAccessToken(creds);
  const res = await fetch(`${baseUrl(creds.environment)}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`PayPal lookup ${path} failed (${res.status}): ${JSON.stringify(data)}`);
  return data as T;
}

export type PayPalCapture = {
  id: string;
  status: string; // COMPLETED | PARTIALLY_REFUNDED | REFUNDED | REVERSED | ...
  amount: { value: string; currency_code: string };
  update_time?: string;
  supplementary_data?: { related_ids?: { order_id?: string } };
};

export function getCapture(creds: PayPalCreds, captureId: string) {
  return paypalGet<PayPalCapture>(creds, `/v2/payments/captures/${encodeURIComponent(captureId)}`);
}

export type PayPalRefund = { id: string; status: string; amount: { value: string; currency_code: string }; create_time?: string };

/** Every refund recorded against a PayPal checkout order. */
export async function getOrderRefunds(creds: PayPalCreds, paypalOrderId: string): Promise<PayPalRefund[]> {
  const order = await paypalGet<{ purchase_units?: { payments?: { refunds?: PayPalRefund[] } }[] }>(
    creds,
    `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`
  );
  return (order.purchase_units ?? []).flatMap((u) => u.payments?.refunds ?? []);
}
