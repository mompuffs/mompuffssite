"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatCents } from "@/lib/money";

type Comment = {
  id: string;
  body: string;
  author: { username: string; displayName: string };
};

type Post = {
  id: string;
  body: string;
  imageUrl: string | null;
  videoUrl: string | null;
  videoThumbnailUrl: string | null;
  createdAt: string;
  author: { id: string; username: string; displayName: string; avatarUrl: string | null };
  product: { id: string; title: string; priceCents: number; currency: string; imageUrl: string | null } | null;
  likes: { userId: string }[];
  comments: Comment[];
};

export default function PostCard({ post }: { post: Post }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [liked, setLiked] = useState(
    !!session?.user && post.likes.some((l) => l.userId === (session.user as any).id)
  );
  const [likeCount, setLikeCount] = useState(post.likes.length);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState(post.comments);
  const [showComments, setShowComments] = useState(false);

  async function toggleLike() {
    if (!session) return router.push("/login");
    const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
    const data = await res.json();
    setLiked(data.liked);
    setLikeCount((c) => c + (data.liked ? 1 : -1));
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return router.push("/login");
    if (!commentText.trim()) return;
    const res = await fetch(`/api/posts/${post.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: commentText }),
    });
    const comment = await res.json();
    setComments((c) => [...c, comment]);
    setCommentText("");
  }

  return (
    <div className="bg-white rounded-xl shadow p-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold">
          {post.author.displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <Link href={`/profile/${post.author.username}`} className="font-semibold hover:underline">
            {post.author.displayName}
          </Link>
          <p className="text-xs text-gray-500">{new Date(post.createdAt).toLocaleString()}</p>
        </div>
      </div>

      <p className="whitespace-pre-wrap mb-2">{post.body}</p>

      {post.videoUrl ? (
        <video
          src={post.videoUrl}
          poster={post.videoThumbnailUrl ?? undefined}
          controls
          className="rounded-lg w-full max-h-96 mb-2 bg-black"
        />
      ) : (
        post.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.imageUrl} alt="" className="rounded-lg w-full max-h-96 object-cover mb-2" />
        )
      )}

      {post.product && (
        <Link
          href={`/product/${post.product.id}`}
          className="flex items-center gap-3 border rounded-lg p-2 mb-2 hover:bg-gray-50"
        >
          {post.product.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.product.imageUrl} alt="" className="w-14 h-14 object-cover rounded" />
          )}
          <div>
            <p className="font-medium text-sm">{post.product.title}</p>
            <p className="text-sm text-brand-600">{formatCents(post.product.priceCents, post.product.currency)}</p>
          </div>
        </Link>
      )}

      <div className="flex gap-4 text-sm text-gray-600 border-t pt-2">
        <button onClick={toggleLike} className={liked ? "text-brand-600 font-medium" : "hover:text-brand-600"}>
          👍 Like {likeCount > 0 && `(${likeCount})`}
        </button>
        <button onClick={() => setShowComments((s) => !s)} className="hover:text-brand-600">
          💬 Comment {comments.length > 0 && `(${comments.length})`}
        </button>
      </div>

      {showComments && (
        <div className="mt-3 space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="text-sm bg-gray-50 rounded px-3 py-1.5">
              <Link href={`/profile/${c.author.username}`} className="font-semibold hover:underline">
                {c.author.displayName}
              </Link>{" "}
              {c.body}
            </div>
          ))}
          <form onSubmit={submitComment} className="flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment…"
              className="flex-1 border rounded-full px-3 py-1 text-sm"
            />
            <button type="submit" className="text-brand-600 text-sm font-medium">
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
