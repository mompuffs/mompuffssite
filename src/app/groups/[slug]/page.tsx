import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import PostComposer from "@/components/PostComposer";
import PostCard from "@/components/PostCard";
import GroupJoinButton from "@/components/GroupJoinButton";
import GroupJoinRequests from "@/components/GroupJoinRequests";
import GroupSettings from "@/components/GroupSettings";

export const dynamic = "force-dynamic";

export default async function GroupPage({ params }: { params: { slug: string } }) {
  const user = await getCurrentUser();

  const group = await db.group.findUnique({
    where: { slug: params.slug },
    include: {
      owner: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      _count: { select: { members: { where: { status: "ACTIVE" } } } },
    },
  });
  if (!group) notFound();

  const isOwner = user ? group.ownerId === user.id : false;
  const membership = user
    ? await db.groupMembership.findUnique({
        where: { groupId_userId: { groupId: group.id, userId: user.id } },
        select: { status: true },
      })
    : null;
  const isActiveMember = isOwner || membership?.status === "ACTIVE";
  const canView = group.visibility === "PUBLIC" || isActiveMember;

  const pendingRequests =
    isOwner && group.joinPolicy === "APPROVAL"
      ? await db.groupMembership.findMany({
          where: { groupId: group.id, status: "PENDING" },
          include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
          orderBy: { joinedAt: "asc" },
        })
      : [];

  const posts = canView
    ? await db.post.findMany({
        where: { groupId: group.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          product: { select: { id: true, title: true, priceCents: true, currency: true, imageUrl: true } },
          group: { select: { id: true, name: true, slug: true } },
          likes: { select: { userId: true } },
          comments: {
            orderBy: { createdAt: "asc" },
            include: { author: { select: { username: true, displayName: true } } },
          },
        },
      })
    : [];

  return (
    <div className="max-w-xl mx-auto">
      <Link href="/groups" className="text-sm text-brand-600 hover:underline">
        ← All groups
      </Link>

      <div className="bg-white rounded-xl shadow p-4 my-3 flex gap-4">
        {group.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={group.avatarUrl} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-20 h-20 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-2xl flex-shrink-0">
            {group.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{group.name}</h1>
          {group.topic && <p className="text-sm text-gray-500">{group.topic}</p>}
          <p className="text-xs text-gray-400 mt-0.5">
            {group._count.members} member{group._count.members === 1 ? "" : "s"} ·{" "}
            {group.visibility === "PRIVATE" ? "Private" : "Public"} group · run by{" "}
            <Link href={`/profile/${group.owner.username}`} className="text-brand-600 hover:underline">
              {group.owner.displayName}
            </Link>
          </p>
          {group.description && <p className="text-sm mt-2">{group.description}</p>}
          <div className="mt-3">
            {user ? (
              <GroupJoinButton
                slug={group.slug}
                isOwner={isOwner}
                initialStatus={isOwner ? "ACTIVE" : (membership?.status as "ACTIVE" | "PENDING" | null) ?? null}
                joinPolicy={group.joinPolicy as "OPEN" | "APPROVAL"}
              />
            ) : (
              <Link href="/login" className="text-sm text-brand-600 hover:underline">
                Log in to join
              </Link>
            )}
          </div>
        </div>
      </div>

      {isOwner && (
        <>
          <GroupSettings
            slug={group.slug}
            initialDescription={group.description ?? ""}
            initialVisibility={group.visibility as "PUBLIC" | "PRIVATE"}
            initialJoinPolicy={group.joinPolicy as "OPEN" | "APPROVAL"}
          />
          <GroupJoinRequests
            slug={group.slug}
            requests={pendingRequests.map((r) => ({ user: r.user, requestedAt: r.joinedAt.toISOString() }))}
          />
        </>
      )}

      {!canView ? (
        <p className="text-center text-gray-500 mt-10 bg-white rounded-xl shadow p-6">
          This is a private group. Join to see posts.
        </p>
      ) : (
        <>
          {isActiveMember && <PostComposer groupId={group.id} />}
          {posts.length === 0 ? (
            <p className="text-center text-gray-500 mt-10">No posts in this group yet.</p>
          ) : (
            posts.map((post) => <PostCard key={post.id} post={post as any} />)
          )}
        </>
      )}
    </div>
  );
}
