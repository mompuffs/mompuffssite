import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const blocks = await db.block.findMany({
    where: { blockerId: user.id },
    include: { blocked: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(blocks.map((b) => b.blocked));
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { targetUserId } = await req.json();
  if (!targetUserId || targetUserId === user.id) {
    return NextResponse.json({ error: "Invalid target user." }, { status: 400 });
  }

  await db.$transaction([
    db.block.upsert({
      where: { blockerId_blockedId: { blockerId: user.id, blockedId: targetUserId } },
      create: { blockerId: user.id, blockedId: targetUserId },
      update: {},
    }),
    // Blocking tears down any existing connection between the two users.
    db.follow.deleteMany({
      where: {
        OR: [
          { followerId: user.id, followingId: targetUserId },
          { followerId: targetUserId, followingId: user.id },
        ],
      },
    }),
    db.friendRequest.deleteMany({
      where: {
        OR: [
          { senderId: user.id, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: user.id },
        ],
      },
    }),
  ]);

  return NextResponse.json({ blocked: true }, { status: 201 });
}
