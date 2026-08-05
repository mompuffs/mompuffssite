import { db } from "@/lib/db";
import AdminPostRow from "@/components/AdminPostRow";

export const dynamic = "force-dynamic";

// Most-recent-first, capped -- this is a moderation queue, not a full
// export tool. Fine for now; revisit with pagination/search if the feed
// outgrows a single page of recent activity being enough to catch problems.
const PAGE_SIZE = 100;

export default async function AdminPostsPage() {
  const posts = await db.post.findMany({
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    include: {
      author: { select: { username: true, displayName: true } },
      group: { select: { name: true, slug: true } },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-900 mb-1">Posts</h1>
      <p className="text-sm text-gray-500 mb-6">Most recent {posts.length} post{posts.length === 1 ? "" : "s"} across the platform.</p>

      <div className="bg-white rounded-xl shadow p-5">
        {posts.length === 0 ? (
          <p className="text-sm text-gray-500">No posts yet.</p>
        ) : (
          posts.map((p) => (
            <AdminPostRow
              key={p.id}
              post={{ ...p, createdAt: p.createdAt.toISOString() }}
            />
          ))
        )}
      </div>
    </div>
  );
}
