import { Resend } from "resend";
import { formatCents } from "@/lib/money";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM_EMAIL || "MomPuffs <onboarding@resend.dev>";
// mompuffssite.vercel.app was a duplicate Vercel project deleted 2026-08-04
// -- don't fall back to it. If NEXTAUTH_URL is ever unset, the real custom
// domain is a much safer default than a dead one.
const SITE_URL = process.env.NEXTAUTH_URL || "https://mompuffs.com";
const CONTACT_INBOX = "info@mompuffs.com";

export async function sendPasswordResetEmail({ to, resetUrl }: { to: string; resetUrl: string }) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set -- skipping password reset email.");
    return;
  }

  try {
    // resend.emails.send() does NOT throw on API-level failures (bad API
    // key, unverified sender domain, rate limits, etc.) -- it always
    // resolves with { data, error }. A try/catch alone silently swallows
    // those, so `error` has to be checked explicitly too.
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject: "Reset your MomPuffs password",
      text: `Someone (hopefully you) asked to reset the password for this MomPuffs account.

Reset your password: ${resetUrl}

This link expires in 1 hour and only works once. If you didn't request this, you can safely ignore this email -- your password won't change.`,
    });
    if (error) {
      console.error("Resend rejected the password reset email:", error);
    }
  } catch (err) {
    console.error("Failed to send password reset email:", err);
  }
}

export async function sendSaleNotification({
  to,
  shopName,
  buyerName,
  items,
  subtotalCents,
  orderId,
}: {
  to: string;
  shopName: string;
  buyerName: string;
  items: { title: string; variantLabel?: string | null; quantity: number; unitPriceCents: number }[];
  subtotalCents: number;
  orderId: string;
}) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set -- skipping sale notification email.");
    return;
  }

  const itemLines = items
    .map((i) => `- ${i.title}${i.variantLabel ? ` (${i.variantLabel})` : ""} x${i.quantity} - ${formatCents(i.unitPriceCents * i.quantity)}`)
    .join("\n");

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject: `You made a sale on MomPuffs! (${shopName})`,
      text: `Good news -- ${buyerName} just placed an order from ${shopName}.

Items:
${itemLines}

Your items subtotal: ${formatCents(subtotalCents)}
Order ID: ${orderId}

View and fulfill this order: ${SITE_URL}/dashboard/shop/orders`,
    });
    if (error) {
      console.error("Resend rejected the sale notification email:", error);
    }
  } catch (err) {
    console.error("Failed to send sale notification email:", err);
  }
}

export async function sendRefundRequestNotification({
  to,
  shopName,
  buyerName,
  item,
  reason,
  orderId,
}: {
  to: string;
  shopName: string;
  buyerName: string;
  item: { title: string; variantLabel?: string | null; quantity: number; unitPriceCents: number };
  reason: string;
  orderId: string;
}) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set -- skipping refund request email.");
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject: `Refund request on ${shopName} (MomPuffs)`,
      text: `${buyerName} requested a refund on an item from an order on ${shopName}.

Item: ${item.title}${item.variantLabel ? ` (${item.variantLabel})` : ""} x${item.quantity} - ${formatCents(item.unitPriceCents * item.quantity)}

Buyer's reason:
${reason}

Order ID: ${orderId}

Review and respond to this request: ${SITE_URL}/dashboard/shop/refunds

Approving here only marks the request as approved -- it does not move any money. Issue the actual refund from your own Stripe/PayPal dashboard.`,
    });
    if (error) {
      console.error("Resend rejected the refund request email:", error);
    }
  } catch (err) {
    console.error("Failed to send refund request email:", err);
  }
}

export async function sendVerificationEmail({ to, verifyUrl }: { to: string; verifyUrl: string }) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set -- skipping verification email.");
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject: "Verify your MomPuffs account",
      text: `Welcome to MomPuffs! Confirm this email address to finish setting up your account.

Verify your email: ${verifyUrl}

This link expires in 24 hours. If you didn't create a MomPuffs account, you can ignore this email.`,
    });
    if (error) {
      console.error("Resend rejected the verification email:", error);
    }
  } catch (err) {
    console.error("Failed to send verification email:", err);
  }
}

export async function sendContactMessage({
  name,
  email,
  subject,
  message,
}: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set -- skipping contact form email.");
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: CONTACT_INBOX,
      // Lets whoever reads this in the info@ inbox just hit Reply to
      // respond straight to the person who submitted the form.
      replyTo: email,
      subject: `[Contact form] ${subject}`,
      text: `New message from the MomPuffs contact form.

Name: ${name}
Email: ${email}
Subject: ${subject}

${message}`,
    });
    if (error) {
      console.error("Resend rejected the contact form email:", error);
    }
  } catch (err) {
    console.error("Failed to send contact form email:", err);
  }
}

// Sent by the daily directory cron (src/lib/directoryBilling.ts) about a
// week before PayPal charges a directory premium subscription again.
export async function sendDirectoryRenewalReminder({
  to,
  name,
  listingName,
  listingSlug,
  amount,
  chargeDate,
}: {
  to: string;
  name: string;
  listingName: string;
  listingSlug: string;
  amount: string;
  chargeDate: Date;
}) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set -- skipping directory renewal reminder.");
    return;
  }
  const when = chargeDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject: `Your MomPuffs directory premium renews on ${when}`,
      text: `Hi ${name},

Heads up: the premium plan for your MomPuffs directory listing "${listingName}" renews on ${when}. PayPal will automatically charge ${amount} then.

Nothing to do if you'd like to keep it. To cancel, go to ${SITE_URL}/directory/${listingSlug}/edit and choose "Cancel subscription" before ${when}. Your listing keeps its premium details through the time you've already paid for.

Questions? Just reply or write to ${CONTACT_INBOX}.`,
    });
    if (error) {
      console.error("Resend rejected the directory renewal reminder:", error);
    }
  } catch (err) {
    console.error("Failed to send directory renewal reminder:", err);
  }
}

// Lets the site owner know someone claimed a directory listing (claims
// are instant, with no review).
export async function sendDirectoryClaimNotification({
  listingName,
  listingSlug,
  claimerName,
  claimerUsername,
  claimerEmail,
}: {
  listingName: string;
  listingSlug: string;
  claimerName: string;
  claimerUsername: string;
  claimerEmail: string;
}) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set -- skipping directory claim notification.");
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: CONTACT_INBOX,
      replyTo: claimerEmail,
      subject: `Directory listing claimed: ${listingName}`,
      text: `${claimerName} (@${claimerUsername}, ${claimerEmail}) just claimed the directory listing "${listingName}".

Listing: ${SITE_URL}/directory/${listingSlug}
Their profile: ${SITE_URL}/profile/${claimerUsername}

If this doesn't look right, you can remove the claim from Admin -> Directory.`,
    });
    if (error) {
      console.error("Resend rejected the directory claim notification:", error);
    }
  } catch (err) {
    console.error("Failed to send directory claim notification:", err);
  }
}

// Lets the site owner know a directory listing went Premium -- either a
// brand-new paid submission (live with no review) or an upgrade.
export async function sendDirectoryPremiumNotification({
  listingName,
  listingSlug,
  ownerName,
  ownerUsername,
  ownerEmail,
  plan,
  isNewListing,
}: {
  listingName: string;
  listingSlug: string;
  ownerName: string;
  ownerUsername: string;
  ownerEmail: string;
  plan: string;
  isNewListing: boolean;
}) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set -- skipping directory premium notification.");
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: CONTACT_INBOX,
      replyTo: ownerEmail,
      subject: isNewListing ? `New paid directory listing: ${listingName}` : `Directory listing upgraded: ${listingName}`,
      text: `${ownerName} (@${ownerUsername}, ${ownerEmail}) ${
        isNewListing ? "paid for a new Premium listing, and it's live now" : "upgraded their listing to Premium"
      } (${plan}).

Listing: ${SITE_URL}/directory/${listingSlug}

To remove it or stop the subscription, go to Admin -> Directory.`,
    });
    if (error) {
      console.error("Resend rejected the directory premium notification:", error);
    }
  } catch (err) {
    console.error("Failed to send directory premium notification:", err);
  }
}
