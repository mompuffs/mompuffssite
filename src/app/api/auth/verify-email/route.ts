import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashVerificationToken } from "@/lib/emailVerification";

// mompuffssite.vercel.app was a duplicate Vercel project deleted 2026-08-04
// -- don't fall back to it. If NEXTAUTH_URL is ever unset, the real custom
// domain is a much safer default than a dead one.
const SITE_URL = process.env.NEXTAUTH_URL || "https://mompuffs.com";

// Visited directly from the link in the verification email, so this redirects
// to a page rather than returning JSON.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(`${SITE_URL}/login?verifyError=1`);
  }

  const verificationToken = await db.emailVerificationToken.findUnique({
    where: { tokenHash: hashVerificationToken(token) },
  });

  if (!verificationToken || verificationToken.expiresAt < new Date()) {
    return NextResponse.redirect(`${SITE_URL}/login?verifyError=1`);
  }

  await db.user.update({
    where: { id: verificationToken.userId },
    data: { emailVerifiedAt: new Date() },
  });
  // Invalidate every outstanding link for this user, not just the one used --
  // same reasoning as password reset tokens.
  await db.emailVerificationToken.deleteMany({ where: { userId: verificationToken.userId } });

  return NextResponse.redirect(`${SITE_URL}/login?verified=1`);
}
