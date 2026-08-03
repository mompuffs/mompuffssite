import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// Marks friend-post notifications as seen (unread messages are marked read
// separately, per-conversation, when a thread is opened).
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  await db.user.update({
    where: { id: (user as any).id },
    data: { notificationsCheckedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
