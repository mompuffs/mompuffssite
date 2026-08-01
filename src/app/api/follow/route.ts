import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { targetUserId } = await req.json();
  if (!targetUserId || targetUserId === user.id) {
    return NextResponse.json({ error: "Invalid target user." }, { status: 400 });
  }

  const existing = await db.follow.findUnique({
    where: { followerId_followingId: { followerId: user.id, followingId: targetUserId } },
  });

  if (existing) {
    await db.follow.delete({ where: { id: existing.id } });
    return NextResponse.json({ following: false });
  }

  await db.follow.create({ data: { followerId: user.id, followingId: targetUserId } });
  return NextResponse.json({ following: true });
}
