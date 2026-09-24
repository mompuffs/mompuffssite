import Stripe from "stripe";

export type StripeCreds = { apiKey: string; publishableKey?: string };

function client(creds: StripeCreds) {
  return new Stripe(creds.apiKey);
}

export async function createPaymentIntent(creds: StripeCreds, amountCents: number, currency = "usd") {
  return client(creds).paymentIntents.create({
    amount: amountCents,
    currency,
    automatic_payment_methods: { enabled: true },
  });
}

export async function updatePaymentIntentAmount(creds: StripeCreds, paymentIntentId: string, amountCents: number) {
  return client(creds).paymentIntents.update(paymentIntentId, { amount: amountCents });
}

export async function retrievePaymentIntent(creds: StripeCreds, paymentIntentId: string) {
  return client(creds).paymentIntents.retrieve(paymentIntentId);
}

export async function refundPaymentIntent(creds: StripeCreds, paymentIntentId: string, amountCents?: number) {
  return client(creds).refunds.create({
    payment_intent: paymentIntentId,
    ...(amountCents ? { amount: amountCents } : {}),
  });
}

// ---------- Lookups used to report refunds (see src/lib/refundSync.ts) ----------

export async function listPaymentRefunds(creds: StripeCreds, paymentIntentId: string) {
  const res = await client(creds).refunds.list({ payment_intent: paymentIntentId, limit: 100 });
  return res.data;
}

export async function listPaymentDisputes(creds: StripeCreds, paymentIntentId: string) {
  const res = await client(creds).disputes.list({ payment_intent: paymentIntentId, limit: 100 });
  return res.data;
}
