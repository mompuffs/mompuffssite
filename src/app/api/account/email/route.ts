import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function PATCH(req: Request) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { newEmail, currentPassword } = await req.json();
  if (!newEmail || !String(newEmail).trim()) {
    return NextResponse.json({ error: "New email is required." }, { status: 400 });
  }
  if (!currentPassword) {
    return NextResponse.json({ error: "Enter your current password to confirm this change." }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id: (sessionUser as any).id } });
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 403 });
  }

  const normalized = String(newEmail).toLowerCase().trim();
  if (normalized === user.email) {
    return NextResponse.json({ error: "That's already your email." }, { status: 400 });
  }
  const existing = await db.user.findUnique({ where: { email: normalized } });
  if (existing) {
    return NextResponse.json({ error: "That email is already in use." }, { status: 409 });
  }

  await db.user.update({ where: { id: user.id }, data: { email: normalized } });

  return NextResponse.json({ ok: true });
}
