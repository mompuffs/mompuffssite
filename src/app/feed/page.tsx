import { db } from "@/lib/db";
import PostComposer from "@/components/PostComposer";
import PostCard from "@/components/PostCard";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const posts = await db.post.findMany({
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
    <div className="max-w-xl mx-auto">
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
  );
}
