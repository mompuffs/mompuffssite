import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { hashResetToken } from "@/lib/passwordReset";

export async function POST(req: Request) {
  const { token, password } = await req.json();
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Missing reset token." }, { status: 400 });
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const resetToken = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
  });

  if (!resetToken || resetToken.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Request a new one." },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.user.update({ where: { id: resetToken.userId }, data: { passwordHash } });

  // Invalidate every outstanding link for this user, not just the one used --
  // a stale link from an earlier request shouldn't still work afterward.
  await db.passwordResetToken.deleteMany({ where: { userId: resetToken.userId } });

  return NextResponse.json({ ok: true });
}
