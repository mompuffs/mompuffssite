import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const messages = await db.message.findMany({
    where: { OR: [{ senderId: user.id }, { recipientId: user.id }] },
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      recipient: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  type Person = { id: string; username: string; displayName: string; avatarUrl: string | null };
  const conversations = new Map<
    string,
    { otherUser: Person; lastMessage: (typeof messages)[number]; unreadCount: number }
  >();

  for (const m of messages) {
    const otherUser = m.senderId === user.id ? m.recipient : m.sender;
    const isUnreadForMe = m.recipientId === user.id && !m.readAt;
    const existing = conversations.get(otherUser.id);
    if (!existing) {
      conversations.set(otherUser.id, { otherUser, lastMessage: m, unreadCount: isUnreadForMe ? 1 : 0 });
    } else if (isUnreadForMe) {
      existing.unreadCount += 1;
    }
  }

  const list = Array.from(conversations.values());

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Messages</h1>
      {list.length === 0 ? (
        <p className="text-gray-500">No conversations yet. Message someone from their profile.</p>
      ) : (
        <div className="bg-white rounded-xl shadow divide-y">
          {list.map(({ otherUser, lastMessage, unreadCount }) => (
            <Link
              key={otherUser.id}
              href={`/messages/${otherUser.username}`}
              className="flex items-center gap-3 p-4 hover:bg-gray-50"
            >
              <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold flex-shrink-0 overflow-hidden">
                {otherUser.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={otherUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  otherUser.displayName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={unreadCount > 0 ? "font-semibold" : "font-medium"}>{otherUser.displayName}</p>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(lastMessage.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className={`text-sm truncate ${unreadCount > 0 ? "font-semibold text-gray-900" : "text-gray-500"}`}>
                  {lastMessage.senderId === user.id ? "You: " : ""}
                  {lastMessage.body}
                </p>
              </div>
              {unreadCount > 0 && (
                <span className="bg-brand-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                  {unreadCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
