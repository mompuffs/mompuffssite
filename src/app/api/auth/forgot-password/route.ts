import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateResetToken, RESET_TOKEN_TTL_MS } from "@/lib/passwordReset";
import { sendPasswordResetEmail } from "@/lib/email";

// mompuffssite.vercel.app was a duplicate Vercel project deleted 2026-08-04
// -- don't fall back to it. If NEXTAUTH_URL is ever unset, the real custom
// domain is a much safer default than a dead one.
const SITE_URL = process.env.NEXTAUTH_URL || "https://mompuffs.com";

// Always responds with the same generic message whether or not the email
// matches an account -- otherwise this endpoint could be used to check
// which emails have Mompuffs accounts.
const GENERIC_MESSAGE = "If an account exists for that email, we've sent a password reset link.";

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await db.user.findUnique({ where: { email: normalizedEmail } });

  if (user) {
    // Invalidate any earlier outstanding links for this user before issuing
    // a new one, so only the most recently requested link works.
    await db.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const { raw, hash } = generateResetToken();
    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    await sendPasswordResetEmail({
      to: user.email,
      resetUrl: `${SITE_URL}/reset-password/${raw}`,
    });
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
