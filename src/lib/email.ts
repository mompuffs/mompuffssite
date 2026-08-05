import { Resend } from "resend";
import { formatCents } from "@/lib/money";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM_EMAIL || "Mompuffs <onboarding@resend.dev>";
const SITE_URL = process.env.NEXTAUTH_URL || "https://mompuffssite.vercel.app";

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
      subject: "Reset your Mompuffs password",
      text: `Someone (hopefully you) asked to reset the password for this Mompuffs account.

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
      subject: `You made a sale on Mompuffs! (${shopName})`,
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
      subject: `Refund request on ${shopName} (Mompuffs)`,
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
