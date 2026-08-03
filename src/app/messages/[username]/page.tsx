import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isBlockedEitherWay } from "@/lib/relationships";
import MessageThread from "@/components/MessageThread";

export const dynamic = "force-dynamic";

export default async function MessageThreadPage({ params }: { params: { username: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const otherUser = await db.user.findUnique({
    where: { username: params.username.toLowerCase() },
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  });
  if (!otherUser) notFound();
  if (otherUser.id === user.id) redirect("/messages");

  const blocked = await isBlockedEitherWay(user.id, otherUser.id);

  const messages = await db.message.findMany({
    where: {
      OR: [
        { senderId: user.id, recipientId: otherUser.id },
        { senderId: otherUser.id, recipientId: user.id },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  await db.message.updateMany({
    where: { senderId: otherUser.id, recipientId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/messages" className="text-brand-600 hover:underline text-sm">
          ← Messages
        </Link>
        <Link href={`/profile/${otherUser.username}`} className="font-semibold hover:underline">
          {otherUser.displayName}
        </Link>
      </div>
      <MessageThread
        currentUserId={user.id}
        otherUsername={otherUser.username}
        initialMessages={messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
        blocked={blocked}
      />
    </div>
  );
}
