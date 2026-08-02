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
