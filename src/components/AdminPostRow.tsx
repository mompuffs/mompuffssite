"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type AdminPost = {
  id: string;
  body: string;
  createdAt: string;
  author: { username: string; displayName: string };
  group: { name: string; slug: string } | null;
};

export default function AdminPostRow({ post }: { post: AdminPost }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete this post by ${post.author.displayName}? This can't be undone.`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/posts/${post.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      alert("Something went wrong.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="py-3 border-b border-gray-100 last:border-0 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm">
          <Link href={`/profile/${post.author.username}`} className="font-medium hover:underline">
            {post.author.displayName}
          </Link>
          {post.group && (
            <>
              <span className="text-gray-400"> in </span>
              <Link href={`/groups/${post.group.slug}`} className="text-brand-600 hover:underline">
                {post.group.name}
              </Link>
            </>
          )}
          <span className="text-gray-400 ml-2 text-xs">{new Date(post.createdAt).toLocaleString()}</span>
        </p>
        <p className="text-sm text-gray-600 truncate">{post.body}</p>
      </div>
      <button
        onClick={handleDelete}
        disabled={busy}
        className="text-xs text-red-600 hover:underline disabled:opacity-40 flex-shrink-0"
      >
        Delete
      </button>
    </div>
  );
}
