import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { onlineSinceThreshold } from "@/lib/presence";

// Powers the searchable "all friends" page linked from the Friends Online
// sidebar block. No auth check would be a real bug here (it'd leak everyone's
// friends list), but getCurrentUser() already forces dynamic rendering.
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  const friendRows = await db.friendRequest.findMany({
    where: { status: "ACCEPTED", OR: [{ senderId: user.id }, { receiverId: user.id }] },
    select: { senderId: true, receiverId: true },
  });
  const friendIds = friendRows.map((r) => (r.senderId === user.id ? r.receiverId : r.senderId));
  if (friendIds.length === 0) return NextResponse.json({ friends: [] });

  const friends = await db.user.findMany({
    where: {
      id: { in: friendIds },
      ...(q
        ? {
            OR: [
              { displayName: { contains: q, mode: "insensitive" } },
              { username: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { displayName: "asc" },
    select: { id: true, username: true, displayName: true, avatarUrl: true, lastActiveAt: true },
  });

  const threshold = onlineSinceThreshold();
  return NextResponse.json({
    friends: friends.map((f) => ({
      id: f.id,
      username: f.username,
      displayName: f.displayName,
      avatarUrl: f.avatarUrl,
      online: !!f.lastActiveAt && f.lastActiveAt >= threshold,
    })),
  });
}
