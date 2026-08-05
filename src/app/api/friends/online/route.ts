import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { onlineSinceThreshold } from "@/lib/presence";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const friendRows = await db.friendRequest.findMany({
    where: { status: "ACCEPTED", OR: [{ senderId: (user as any).id }, { receiverId: (user as any).id }] },
    select: { senderId: true, receiverId: true },
  });
  const friendIds = friendRows.map((r) => (r.senderId === (user as any).id ? r.receiverId : r.senderId));

  if (friendIds.length === 0) return NextResponse.json({ friends: [] });

  const online = await db.user.findMany({
    where: { id: { in: friendIds }, lastActiveAt: { gte: onlineSinceThreshold() } },
    orderBy: { lastActiveAt: "desc" },
    take: 10,
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  });

  return NextResponse.json({ friends: online });
}
