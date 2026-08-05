import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import PostComposer from "@/components/PostComposer";
import PostCard from "@/components/PostCard";
import FriendsOnline from "@/components/FriendsOnline";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const user = await getCurrentUser();

  let excludedAuthorIds: string[] = [];
  if (user) {
    const blocks = await db.block.findMany({
      where: { OR: [{ blockerId: user.id }, { blockedId: user.id }] },
      select: { blockerId: true, blockedId: true },
    });
    excludedAuthorIds = blocks.map((b) => (b.blockerId === user.id ? b.blockedId : b.blockerId));
  }

  const posts = await db.post.findMany({
    where: excludedAuthorIds.length > 0 ? { authorId: { notIn: excludedAuthorIds } } : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
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

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      <div className="max-w-xl mx-auto lg:mx-0 flex-1 min-w-0 w-full">
        <PostComposer />
        {posts.length === 0 && (
          <p className="text-center text-gray-500 mt-10">
            No posts yet. Be the first to share something!
          </p>
        )}
        {posts.map((post) => (
          <PostCard key={post.id} post={post as any} />
        ))}
      </div>
      {user && (
        <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-[4.5rem]">
          <FriendsOnline />
        </aside>
      )}
    </div>
  );
}
