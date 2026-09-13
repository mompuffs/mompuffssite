import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateVerificationToken, VERIFY_TOKEN_TTL_MS } from "@/lib/emailVerification";
import { sendVerificationEmail } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// mompuffssite.vercel.app was a duplicate Vercel project deleted 2026-08-04
// -- don't fall back to it. If NEXTAUTH_URL is ever unset, the real custom
// domain is a much safer default than a dead one.
const SITE_URL = process.env.NEXTAUTH_URL || "https://mompuffs.com";

const RATE_LIMIT = 3; // resend requests
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // per hour, per IP

// Always responds with the same generic message whether or not the email
// matches an account (and whether or not it's already verified) -- same
// reasoning as /api/auth/forgot-password: this endpoint shouldn't be usable
// to check which emails have Mompuffs accounts.
const GENERIC_MESSAGE = "If that account needs verifying, we've sent a new link.";

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}));
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const ip = getClientIp(req);
  const allowed = await checkRateLimit(`resend-verification:${ip}`, RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
  if (!allowed) {
    // Still the generic message -- don't reveal that rate limiting exists.
    return NextResponse.json({ message: GENERIC_MESSAGE });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await db.user.findUnique({ where: { email: normalizedEmail } });

  if (user && !user.emailVerifiedAt) {
    await db.emailVerificationToken.deleteMany({ where: { userId: user.id } });

    const { raw, hash } = generateVerificationToken();
    await db.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
      },
    });

    await sendVerificationEmail({
      to: user.email,
      verifyUrl: `${SITE_URL}/api/auth/verify-email?token=${raw}`,
    });
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
