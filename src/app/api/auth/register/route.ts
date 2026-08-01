import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();
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

  return NextResponse.json({ id: user.id, username: user.username });
}
