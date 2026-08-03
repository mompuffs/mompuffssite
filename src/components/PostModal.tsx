"use client";

import { useEffect, useState } from "react";
import PostCard from "@/components/PostCard";

export default function PostModal({ postId, onClose }: { postId: string; onClose: () => void }) {
  const [post, setPost] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/posts/${postId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Post not found.");
        return r.json();
      })
      .then(setPost)
      .catch((err) => setError(err.message));
  }, [postId]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="max-w-xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end mb-2">
          <button
            onClick={onClose}
            className="bg-white rounded-full w-8 h-8 flex items-center justify-center shadow hover:bg-gray-50"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {error && <p className="bg-white rounded-xl shadow p-4 text-red-600 text-sm">{error}</p>}
        {!post && !error && <p className="bg-white rounded-xl shadow p-4 text-gray-500 text-sm">Loading…</p>}
        {post && <PostCard post={post} />}
      </div>
    </div>
  );
}
