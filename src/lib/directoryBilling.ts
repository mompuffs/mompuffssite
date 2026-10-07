import { db } from "@/lib/db";
import { getShopPaymentCreds } from "@/lib/payments/connections";
import { DIRECTORY_PRICES, type DirectoryPlan } from "@/lib/directory";
import { sendDirectoryRenewalReminder } from "@/lib/email";

// Directory premium is a recurring PayPal subscription billed to the
// MomPuffs shop's own connected PayPal account (the same credentials its
// store checkout uses). It doesn't go through the cart -- the cart only
// does one-time payments. Docs: https://developer.paypal.com/docs/api/subscriptions/v1/
//
// Flow: an admin creates the PayPal product + two plans once (Admin ->
// Directory -> Set up billing); the IDs live in SiteSetting. Owners
// subscribe with PayPal's subscription buttons; we verify the subscription
// server-side, then a daily cron (/api/cron/directory) re-syncs every
// subscription's status and sends the 1-week renewal reminder.

export const BILLING_SHOP_SLUG = process.env.DIRECTORY_BILLING_SHOP_SLUG || "mompuffs";
// Extra days premium stays on past the next billing date, so a renewal
// that lands a little late (or a day before the cron re-syncs) doesn't
// blink the listing back to free.
const GRACE_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
const PLAN_KEYS: Record<DirectoryPlan, string> = {
  MONTHLY: "directory.paypal.plan.MONTHLY",
  YEARLY: "directory.paypal.plan.YEARLY",
};
const ENV_KEY = "directory.paypal.environment";

type Creds = { clientId: string; apiKey: string; environment?: string };

function baseUrl(environment?: string) {
  return environment === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

export async function getBillingCreds(): Promise<Creds | null> {
  const shop = await db.shop.findUnique({ where: { slug: BILLING_SHOP_SLUG }, select: { id: true } });
  if (!shop) return null;
  const creds = await getShopPaymentCreds(shop.id, "paypal");
  if (!creds?.clientId || !creds.apiKey) return null;
  return { clientId: creds.clientId, apiKey: creds.apiKey, environment: creds.environment };
}

async function paypal<T>(creds: Creds, method: string, path: string, body?: unknown): Promise<T> {
  const tokenRes = await fetch(`${baseUrl(creds.environment)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${creds.clientId}:${creds.apiKey}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!tokenRes.ok) throw new Error(`PayPal authentication failed (${tokenRes.status}).`);
  const { access_token } = await tokenRes.json();

  const res = await fetch(`${baseUrl(creds.environment)}${path}`, {
    method,
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`PayPal ${method} ${path} failed (${res.status}): ${JSON.stringify(data)}`);
  return data as T;
}

async function getSetting(key: string) {
  return (await db.siteSetting.findUnique({ where: { key } }))?.value ?? null;
}

async function setSetting(key: string, value: string) {
  await db.siteSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

export type BillingConfig =
  | { ready: true; clientId: string; environment: string; plans: Record<DirectoryPlan, string> }
  | { ready: false; reason: string };

export async function getBillingConfig(): Promise<BillingConfig> {
  const creds = await getBillingCreds();
  if (!creds) return { ready: false, reason: `The "${BILLING_SHOP_SLUG}" shop hasn't connected PayPal.` };
  const env = creds.environment === "live" ? "live" : "sandbox";
  const [monthly, yearly, planEnv] = await Promise.all([
    getSetting(PLAN_KEYS.MONTHLY),
    getSetting(PLAN_KEYS.YEARLY),
    getSetting(ENV_KEY),
  ]);
  if (!monthly || !yearly) return { ready: false, reason: "PayPal plans haven't been set up yet." };
  // Plans made in sandbox don't exist in live (and vice versa).
  if (planEnv !== env) return { ready: false, reason: `PayPal plans were set up in ${planEnv}, but the shop's PayPal is now ${env}.` };
  return { ready: true, clientId: creds.clientId, environment: env, plans: { MONTHLY: monthly, YEARLY: yearly } };
}

// One-time admin action: creates the PayPal product and both plans.
export async function setUpBillingPlans() {
  const creds = await getBillingCreds();
  if (!creds) throw new Error(`The "${BILLING_SHOP_SLUG}" shop hasn't connected PayPal.`);

  const product = await paypal<{ id: string }>(creds, "POST", "/v1/catalogs/products", {
    name: "Mompuffs Directory Premium",
    description: "Shows website, email, hours, specials and menu on a Mompuffs business directory listing.",
    type: "SERVICE",
    home_url: "https://www.mompuffs.com/directory",
  });

  for (const plan of ["MONTHLY", "YEARLY"] as DirectoryPlan[]) {
    const price = DIRECTORY_PRICES[plan];
    const created = await paypal<{ id: string }>(creds, "POST", "/v1/billing/plans", {
      product_id: product.id,
      name: `Directory Premium - ${price.label}`,
      description: `Mompuffs directory premium listing, ${price.display}`,
      status: "ACTIVE",
      billing_cycles: [
        {
          frequency: { interval_unit: plan === "MONTHLY" ? "MONTH" : "YEAR", interval_count: 1 },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: { fixed_price: { value: (price.priceCents / 100).toFixed(2), currency_code: "USD" } },
        },
      ],
      payment_preferences: { auto_bill_outstanding: true, payment_failure_threshold: 1 },
    });
    await setSetting(PLAN_KEYS[plan], created.id);
  }
  await setSetting("directory.paypal.productId", product.id);
  await setSetting(ENV_KEY, creds.environment === "live" ? "live" : "sandbox");
}

type PayPalSubscription = {
  id: string;
  status: string;
  plan_id: string;
  custom_id?: string;
  billing_info?: { next_billing_time?: string; last_payment?: { time?: string } };
};

function planFor(planId: string, plans: Record<DirectoryPlan, string>): DirectoryPlan | null {
  return (Object.keys(plans) as DirectoryPlan[]).find((k) => plans[k] === planId) ?? null;
}

function premiumThrough(sub: PayPalSubscription, plan: DirectoryPlan) {
  const next = sub.billing_info?.next_billing_time ? new Date(sub.billing_info.next_billing_time) : null;
  if (next) return { nextBillingAt: next, premiumUntil: new Date(next.getTime() + GRACE_DAYS * DAY_MS) };
  // PayPal sometimes omits next_billing_time right after approval.
  const days = plan === "MONTHLY" ? 31 : 366;
  return { nextBillingAt: null, premiumUntil: new Date(Date.now() + days * DAY_MS) };
}

// Called after the owner approves a subscription in PayPal's popup. Trusts
// nothing from the browser except the subscription ID.
export async function activateSubscription(listingId: string, subscriptionId: string) {
  const config = await getBillingConfig();
  if (!config.ready) throw new Error(config.reason);
  const creds = (await getBillingCreds())!;

  const sub = await paypal<PayPalSubscription>(creds, "GET", `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`);
  const plan = planFor(sub.plan_id, config.plans);
  if (!plan) throw new Error("That PayPal subscription isn't for a directory plan.");
  if (sub.custom_id !== listingId) throw new Error("That PayPal subscription belongs to a different listing.");
  if (sub.status !== "ACTIVE" && sub.status !== "APPROVED") {
    throw new Error(`The PayPal subscription isn't active (status: ${sub.status}).`);
  }

  const listing = await db.businessListing.findUnique({
    where: { id: listingId },
    select: { paypalSubscriptionId: true, subscriptionStatus: true, premiumUntil: true },
  });
  if (!listing) throw new Error("Listing not found.");

  const through = premiumThrough(sub, plan);
  await db.businessListing.update({
    where: { id: listingId },
    data: {
      paypalSubscriptionId: sub.id,
      plan,
      subscriptionStatus: sub.status,
      nextBillingAt: through.nextBillingAt,
      premiumUntil:
        listing.premiumUntil && listing.premiumUntil > through.premiumUntil ? listing.premiumUntil : through.premiumUntil,
      reminderSentFor: null,
    },
  });

  // Switching plans: stop the old subscription so they aren't billed twice.
  if (listing.paypalSubscriptionId && listing.paypalSubscriptionId !== sub.id && listing.subscriptionStatus === "ACTIVE") {
    await paypal(creds, "POST", `/v1/billing/subscriptions/${encodeURIComponent(listing.paypalSubscriptionId)}/cancel`, {
      reason: "Switched to a different Mompuffs directory plan.",
    }).catch((err) => console.error("Couldn't cancel replaced directory subscription:", err));
  }
}

// Owner cancels: no more charges; premium stays on through what they paid for.
export async function cancelSubscription(listingId: string) {
  const listing = await db.businessListing.findUnique({
    where: { id: listingId },
    select: { paypalSubscriptionId: true, nextBillingAt: true, premiumUntil: true },
  });
  if (!listing?.paypalSubscriptionId) throw new Error("This listing has no subscription.");
  const creds = await getBillingCreds();
  if (!creds) throw new Error("PayPal isn't connected.");

  await paypal(creds, "POST", `/v1/billing/subscriptions/${encodeURIComponent(listing.paypalSubscriptionId)}/cancel`, {
    reason: "Cancelled by the listing owner on Mompuffs.",
  });
  await db.businessListing.update({
    where: { id: listingId },
    data: {
      subscriptionStatus: "CANCELLED",
      premiumUntil: listing.nextBillingAt ?? listing.premiumUntil,
      nextBillingAt: null,
    },
  });
}

// Daily: pull each live subscription's status from PayPal, extend premium
// on renewals, and email the owner a week before the next charge.
export async function syncSubscriptions() {
  const creds = await getBillingCreds();
  if (!creds) return { checked: 0, reminders: 0, errors: 0, skipped: "PayPal not connected" };

  const listings = await db.businessListing.findMany({
    where: { paypalSubscriptionId: { not: null }, subscriptionStatus: { in: ["ACTIVE", "APPROVED", "APPROVAL_PENDING", "SUSPENDED"] } },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      paypalSubscriptionId: true,
      premiumUntil: true,
      reminderSentFor: true,
      claimedById: true,
      claimedBy: { select: { email: true, displayName: true } },
    },
  });

  let reminders = 0;
  let errors = 0;
  const now = Date.now();
  for (const l of listings) {
    try {
      // Owner's account was deleted (claim set null): stop billing nobody.
      if (!l.claimedById) {
        await cancelSubscription(l.id);
        continue;
      }
      const sub = await paypal<PayPalSubscription>(creds, "GET", `/v1/billing/subscriptions/${encodeURIComponent(l.paypalSubscriptionId!)}`);
      const plan = (l.plan as DirectoryPlan) ?? "MONTHLY";
      const data: Record<string, unknown> = { subscriptionStatus: sub.status };
      if (sub.status === "ACTIVE") {
        const through = premiumThrough(sub, plan);
        data.nextBillingAt = through.nextBillingAt;
        if (!l.premiumUntil || through.premiumUntil > l.premiumUntil) data.premiumUntil = through.premiumUntil;

        const next = through.nextBillingAt;
        const alreadySent = next && l.reminderSentFor && l.reminderSentFor.getTime() === next.getTime();
        if (next && !alreadySent && next.getTime() - now <= 7 * DAY_MS && next.getTime() > now && l.claimedBy?.email) {
          await sendDirectoryRenewalReminder({
            to: l.claimedBy.email,
            name: l.claimedBy.displayName,
            listingName: l.name,
            listingSlug: l.slug,
            amount: DIRECTORY_PRICES[plan].display,
            chargeDate: next,
          });
          data.reminderSentFor = next;
          reminders++;
        }
      } else {
        // Cancelled/suspended/expired in PayPal: no more renewals. Premium
        // runs out on its own at premiumUntil.
        data.nextBillingAt = null;
      }
      await db.businessListing.update({ where: { id: l.id }, data });
    } catch (err) {
      errors++;
      console.error(`Directory subscription sync failed for listing ${l.id}:`, err);
    }
  }
  return { checked: listings.length, reminders, errors };
}
