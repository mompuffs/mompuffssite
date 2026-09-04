"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatCents } from "@/lib/money";
import EmojiPicker from "@/components/EmojiPicker";
import { REACTIONS, reactionById } from "@/lib/reactions";

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
  editedAt?: string | null;
  author: { id: string; username: string; displayName: string; avatarUrl: string | null };
  product: { id: string; title: string; priceCents: number; currency: string; imageUrl: string | null } | null;
  group: { id: string; name: string; slug: string } | null;
  likes: { userId: string; emoji?: string }[];
  comments: Comment[];
};

export default function PostCard({ post: initialPost }: { post: Post }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [post, setPost] = useState(initialPost);
  const myId = session?.user ? (session.user as any).id : null;
  const [mine, setMine] = useState<string | null>(
    post.likes.find((l) => l.userId === myId)?.emoji ?? (post.likes.some((l) => l.userId === myId) ? "like" : null)
  );
  const [counts, setCounts] = useState<Record<string, number>>(() => {
    const next: Record<string, number> = {};
    for (const like of post.likes) {
      const key = like.emoji || "like";
      next[key] = (next[key] ?? 0) + 1;
    }
    return next;
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState(post.comments);
  const [showComments, setShowComments] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(post.body);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOwnPost = !!myId && myId === post.author.id;
  const menuRef = useRef<HTMLDivElement>(null);
  const reactRef = useRef<HTMLDivElement>(null);

  const total = useMemo(() => Object.values(counts).reduce((sum, n) => sum + n, 0), [counts]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (reactRef.current && !reactRef.current.contains(e.target as Node)) setPickerOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function saveEdit() {
    if (!editBody.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: editBody }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't save changes.");
      return;
    }
    setPost((p) => ({ ...p, body: data.body, editedAt: data.editedAt }));
    setEditing(false);
  }

  async function deletePost() {
    if (!confirm("Delete this post? This can't be undone.")) return;
    setDeleting(true);
    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      setDeleted(true);
      router.refresh();
    }
  }

  async function setReaction(emoji: string) {
    if (!session) return router.push("/login");
    const res = await fetch(`/api/posts/${post.id}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    const data = await res.json();
    if (!res.ok) return;
    setMine(data.mine);
    setCounts(data.counts ?? {});
    setPickerOpen(false);
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

  if (deleted) return null;

  const mineMeta = mine ? reactionById(mine) : null;

  return (
    <div className="bg-white rounded-xl shadow p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold">
            {post.author.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <Link href={`/profile/${post.author.username}`} className="font-semibold hover:underline">
              {post.author.displayName}
            </Link>
            {post.group && (
              <>
                {" "}
                <span className="text-xs text-gray-500">
                  → posted in{" "}
                  <Link href={`/groups/${post.group.slug}`} className="text-brand-600 hover:underline">
                    {post.group.name}
                  </Link>
                </span>
              </>
            )}
            <p className="text-xs text-gray-500">
              {new Date(post.createdAt).toLocaleString()}
              {post.editedAt && " · edited"}
            </p>
          </div>
        </div>
        {isOwnPost && !editing && (
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen((o) => !o)} className="text-gray-400 hover:text-gray-700 px-2 leading-none" aria-label="Post options">
              ⋯
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-100 py-1 text-sm z-10 w-28">
                <button onClick={() => { setMenuOpen(false); setEditBody(post.body); setEditing(true); }} className="block w-full text-left px-3 py-1.5 hover:bg-gray-50">Edit</button>
                <button onClick={() => { setMenuOpen(false); deletePost(); }} disabled={deleting} className="block w-full text-left px-3 py-1.5 hover:bg-gray-50 text-red-600">{deleting ? "Deleting…" : "Delete"}</button>
              </div>
            )}
          </div>
        )}
      </div>

      {editing ? (
        <div className="mb-2 space-y-1.5">
          <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={3} className="w-full border rounded px-3 py-2 text-sm resize-none" />
          <EmojiPicker onPick={(emoji) => setEditBody((b) => b + emoji)} />
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button onClick={saveEdit} disabled={saving || !editBody.trim()} className="bg-brand-600 text-white px-3 py-1 rounded-full text-xs font-medium hover:bg-brand-700 disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
            <button onClick={() => { setEditing(false); setError(null); }} className="text-gray-500 text-xs hover:underline">Cancel</button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap mb-2">{post.body}</p>
      )}

      {post.videoUrl ? (
        <video src={post.videoUrl} poster={post.videoThumbnailUrl ?? undefined} controls className="rounded-lg w-full max-h-96 mb-2 bg-black" />
      ) : (
        post.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.imageUrl} alt="" className="rounded-lg w-full max-h-96 object-cover mb-2" />
        )
      )}

      {post.product && (
        <Link href={`/product/${post.product.id}`} className="flex items-center gap-3 border rounded-lg p-2 mb-2 hover:bg-gray-50">
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

      {total > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {REACTIONS.filter((r) => counts[r.id]).map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setReaction(r.id)}
              className={`text-xs px-1.5 py-0.5 rounded-full border ${
                mine === r.id ? "border-brand-600 bg-brand-50" : "border-gray-200 bg-gray-50"
              }`}
              title={r.label}
            >
              {r.emoji} {counts[r.id]}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-4 text-sm text-gray-600 border-t pt-2">
        <div className="relative" ref={reactRef}>
          <button type="button" onClick={() => setPickerOpen((o) => !o)} className={mine ? "text-brand-600 font-medium" : "hover:text-brand-600"}>
            {mineMeta ? `${mineMeta.emoji} ${mineMeta.label}` : "👍 React"}
          </button>
          {pickerOpen && (
            <div className="absolute left-0 bottom-full mb-1 bg-white border rounded-full shadow-lg px-2 py-1 flex gap-1 z-20">
              {REACTIONS.map((r) => (
                <button key={r.id} type="button" title={r.label} onClick={() => setReaction(r.id)} className={`text-lg leading-none p-1 rounded-full hover:bg-gray-100 ${
                  mine === r.id ? "ring-1 ring-brand-600" : ""
                }`}>
                  {r.emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => setShowComments((s) => !s)} className="hover:text-brand-600">
          💬 Comment {comments.length > 0 && `(${comments.length})`}
        </button>
      </div>

      {showComments && (
        <div className="mt-3 space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="text-sm bg-gray-50 rounded px-3 py-1.5">
              <Link href={`/profile/${c.author.username}`} className="font-semibold hover:underline">{c.author.displayName}</Link>{" "}{c.body}
            </div>
          ))}
          <form onSubmit={submitComment} className="flex gap-2 items-center">
            <input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Write a comment…" className="flex-1 border rounded-full px-3 py-1 text-sm" />
            <EmojiPicker onPick={(emoji) => setCommentText((t) => t + emoji)} />
            <button type="submit" className="text-brand-600 text-sm font-medium">Send</button>
          </form>
        </div>
      )}
    </div>
  );
}
