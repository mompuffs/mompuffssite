import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { looksLikeBot } from "@/lib/antiSpam";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { generateVerificationToken, VERIFY_TOKEN_TTL_MS } from "@/lib/emailVerification";
import { sendVerificationEmail } from "@/lib/email";

// mompuffssite.vercel.app was a duplicate Vercel project deleted 2026-08-04
// -- don't fall back to it. If NEXTAUTH_URL is ever unset, the real custom
// domain is a much safer default than a dead one.
const SITE_URL = process.env.NEXTAUTH_URL || "https://mompuffs.com";

const RATE_LIMIT = 3; // registrations
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // per hour, per IP

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot + timing checks first, same as /api/contact -- reject before
  // touching the database or the rate limiter.
  if (looksLikeBot({ honeypot: body.website, formRenderedAt: body.formRenderedAt })) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 400 });
  }

  const ip = getClientIp(req);
  const allowed = await checkRateLimit(`register:${ip}`, RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many accounts created from this connection recently. Please try again later." },
      { status: 429 }
    );
  }

  const { email, username, password, displayName } = body ?? {};

  if (!email || !username || !password || !displayName) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const normalizedUsername = String(username).toLowerCase().trim();

  const existing = await db.user.findFirst({
    where: { OR: [{ email: normalizedEmail }, { username: normalizedUsername }] },
  });
  if (existing) {
    return NextResponse.json({ error: "Email or username already taken." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await db.user.create({
    data: {
      email: normalizedEmail,
      username: normalizedUsername,
      displayName,
      passwordHash,
    },
  });

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

  // Deliberately not signing the caller in here -- login is blocked until
  // the account's email is verified (see authorize() in src/lib/auth.ts),
  // so there's nothing useful to do with a session yet. The frontend shows
  // a "check your email" screen instead.
  return NextResponse.json({ id: user.id, username: user.username, needsVerification: true });
}
