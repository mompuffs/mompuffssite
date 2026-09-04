import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isBlockedEitherWay } from "@/lib/relationships";
import PostCard from "@/components/PostCard";
import FollowButton from "@/components/FollowButton";
import FriendButton, { FriendState } from "@/components/FriendButton";
import BlockButton from "@/components/BlockButton";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const currentUser = await getCurrentUser();

  const profileUser = await db.user.findUnique({
    where: { username: params.username.toLowerCase() },
    include: {
      shop: true,
      _count: { select: { followers: true, following: true, posts: true } },
    },
  });

  if (!profileUser) notFound();

  const profileLinks: { label: string; url: string }[] =
    profileUser.showLinks && profileUser.links ? JSON.parse(profileUser.links) : [];
  const birthdateDisplay =
    profileUser.showBirthdate && profileUser.birthdate
      ? new Date(profileUser.birthdate).toLocaleDateString(undefined, {
          timeZone: "UTC",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : null;

  const groupVisibilityOr: object[] = [{ groupId: null }, { group: { visibility: "PUBLIC" } }];
  if (currentUser) {
    groupVisibilityOr.push({ group: { members: { some: { userId: currentUser.id, status: "ACTIVE" } } } });
  }

  const posts = await db.post.findMany({
    where: { authorId: profileUser.id, OR: groupVisibilityOr },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      product: { select: { id: true, title: true, priceCents: true, currency: true, imageUrl: true } },
      group: { select: { id: true, name: true, slug: true } },
      likes: { select: { userId: true, emoji: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { username: true, displayName: true } } },
      },
    },
  });

  const isOwnProfile = currentUser?.id === profileUser.id;
  const isFollowing = currentUser
    ? !!(await db.follow.findUnique({
        where: { followerId_followingId: { followerId: currentUser.id, followingId: profileUser.id } },
      }))
    : false;

  let friendState: FriendState = "NONE";
  let friendRequestId: string | null = null;
  let isBlocked = false;
  let myBlockOfThem = false;

  if (currentUser && !isOwnProfile) {
    const [friendRequest, blockRow] = await Promise.all([
      db.friendRequest.findFirst({
        where: {
          OR: [
            { senderId: currentUser.id, receiverId: profileUser.id },
            { senderId: profileUser.id, receiverId: currentUser.id },
          ],
        },
      }),
      db.block.findUnique({
        where: { blockerId_blockedId: { blockerId: currentUser.id, blockedId: profileUser.id } },
      }),
    ]);

    if (friendRequest) {
      friendRequestId = friendRequest.id;
      if (friendRequest.status === "ACCEPTED") friendState = "FRIENDS";
      else if (friendRequest.status === "PENDING") {
        friendState = friendRequest.senderId === currentUser.id ? "OUTGOING" : "INCOMING";
      }
    }
    myBlockOfThem = !!blockRow;
    isBlocked = await isBlockedEitherWay(currentUser.id, profileUser.id);
  }

  const showAbout = profileUser.showBio !== false && Boolean(profileUser.bio);

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-xl shadow p-6 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {profileUser.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profileUser.avatarUrl} alt={profileUser.displayName} className="w-16 h-16 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-2xl font-semibold flex-shrink-0">
                {profileUser.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold">{profileUser.displayName}</h1>
              <p className="text-gray-500 text-sm">@{profileUser.username}</p>
            </div>
          </div>
          {!isOwnProfile && currentUser && (
            <div className="flex flex-wrap items-center gap-1.5 justify-end">
              {!isBlocked && (
                <>
                  <Link href={`/messages/${profileUser.username}`} className="px-4 py-1.5 rounded-full text-sm font-medium border border-gray-300 hover:bg-gray-50">Message</Link>
                  <FriendButton targetUserId={profileUser.id} initialState={friendState} initialRequestId={friendRequestId} />
                  <FollowButton targetUserId={profileUser.id} initiallyFollowing={isFollowing} />
                </>
              )}
              <BlockButton targetUserId={profileUser.id} initiallyBlocked={myBlockOfThem} />
            </div>
          )}
        </div>

        {isBlocked && currentUser && !isOwnProfile && (
          <p className="text-xs text-gray-500 bg-gray-50 border rounded p-2 mt-3">Interactions are unavailable between you and this user.</p>
        )}

        {showAbout && <p className="mt-3 text-sm whitespace-pre-wrap">{profileUser.bio}</p>}

        {(profileUser.showWork && profileUser.work) ||
        (profileUser.showLocation && profileUser.location) ||
        birthdateDisplay ||
        (profileUser.showContact && (profileUser.contactEmail || profileUser.contactPhone)) ||
        profileLinks.length > 0 ? (
          <div className="mt-3 text-sm text-gray-700 space-y-1">
            {profileUser.showWork && profileUser.work && <p>💼 <span>{profileUser.work}</span></p>}
            {profileUser.showLocation && profileUser.location && <p>📍 <span>{profileUser.location}</span></p>}
            {birthdateDisplay && <p>🎂 <span>{birthdateDisplay}</span></p>}
            {profileUser.showContact && (profileUser.contactEmail || profileUser.contactPhone) && (
              <p>✉️ {[profileUser.contactEmail, profileUser.contactPhone].filter(Boolean).join(" · ")}</p>
            )}
            {profileLinks.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {profileLinks.map((link, i) => (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-600 hover:underline bg-brand-50 px-2 py-1 rounded-full text-xs">
                    {link.label || link.url}
                  </a>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <div className="flex gap-4 mt-4 text-sm text-gray-600">
          <span><strong>{profileUser._count.posts}</strong> posts</span>
          <span><strong>{profileUser._count.followers}</strong> followers</span>
          <span><strong>{profileUser._count.following}</strong> following</span>
        </div>

        {profileUser.shop && (
          <Link href={`/shop/${profileUser.shop.slug}`} className="inline-block mt-4 bg-brand-50 text-brand-700 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-brand-100">
            🛍️ Visit {profileUser.shop.name}
          </Link>
        )}
      </div>

      {posts.map((post) => (
        <PostCard key={post.id} post={post as any} />
      ))}
    </div>
  );
}
