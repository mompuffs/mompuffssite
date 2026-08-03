import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const PROFILE_SELECT = { id: true, username: true, displayName: true, avatarUrl: true };

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const dbUser = await db.user.findUnique({
    where: { id: (user as any).id },
    select: { notificationsCheckedAt: true },
  });
  // Never checked before -- anchor to "now", persisted immediately so it
  // doesn't keep sliding forward on every poll (a plain `?? new Date()`
  // recomputed fresh each request would mean nothing ever counts as new
  // until the user has explicitly opened the bell at least once).
  let since = dbUser?.notificationsCheckedAt;
  if (!since) {
    since = new Date();
    await db.user.update({ where: { id: (user as any).id }, data: { notificationsCheckedAt: since } });
  }

  const friendRows = await db.friendRequest.findMany({
    where: { status: "ACCEPTED", OR: [{ senderId: (user as any).id }, { receiverId: (user as any).id }] },
    select: { senderId: true, receiverId: true },
  });
  const friendIds = friendRows.map((r) => (r.senderId === (user as any).id ? r.receiverId : r.senderId));

  const [unreadMessages, friendPosts] = await Promise.all([
    db.message.findMany({
      where: { recipientId: (user as any).id, readAt: null },
      orderBy: { createdAt: "desc" },
      include: { sender: { select: PROFILE_SELECT } },
    }),
    friendIds.length > 0
      ? db.post.findMany({
          where: { authorId: { in: friendIds }, createdAt: { gt: since } },
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { author: { select: PROFILE_SELECT } },
        })
      : Promise.resolve([]),
  ]);

  const messagesBySender = new Map<string, { sender: (typeof unreadMessages)[number]["sender"]; count: number; latestBody: string; latestAt: Date }>();
  for (const m of unreadMessages) {
    const existing = messagesBySender.get(m.senderId);
    if (!existing) {
      messagesBySender.set(m.senderId, { sender: m.sender, count: 1, latestBody: m.body, latestAt: m.createdAt });
    } else {
      existing.count += 1;
    }
  }

  return NextResponse.json({
    unreadMessageCount: unreadMessages.length,
    messagePreviews: Array.from(messagesBySender.values()),
    friendPosts,
    friendPostCount: friendPosts.length,
  });
}
