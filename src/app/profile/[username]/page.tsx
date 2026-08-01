import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import PostCard from "@/components/PostCard";
import FollowButton from "@/components/FollowButton";

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

  const posts = await db.post.findMany({
    where: { authorId: profileUser.id },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      product: { select: { id: true, title: true, priceCents: true, currency: true, imageUrl: true } },
      likes: { select: { userId: true } },
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

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-xl shadow p-6 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-2xl font-semibold">
              {profileUser.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold">{profileUser.displayName}</h1>
              <p className="text-gray-500 text-sm">@{profileUser.username}</p>
            </div>
          </div>
          {!isOwnProfile && currentUser && (
            <FollowButton targetUserId={profileUser.id} initiallyFollowing={isFollowing} />
          )}
        </div>

        {profileUser.bio && <p className="mt-3 text-sm">{profileUser.bio}</p>}

        <div className="flex gap-4 mt-4 text-sm text-gray-600">
          <span><strong>{profileUser._count.posts}</strong> posts</span>
          <span><strong>{profileUser._count.followers}</strong> followers</span>
          <span><strong>{profileUser._count.following}</strong> following</span>
        </div>

        {profileUser.shop && (
          <Link
            href={`/shop/${profileUser.shop.slug}`}
            className="inline-block mt-4 bg-brand-50 text-brand-700 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-brand-100"
          >
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
