"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PostComposer() {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [posting, setPosting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, imageUrl: imageUrl || undefined }),
    });
    setBody("");
    setImageUrl("");
    setPosting(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-4 mb-4 space-y-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What's on your mind?"
        rows={3}
        className="w-full border rounded px-3 py-2 resize-none"
      />
      <input
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="Image URL (optional)"
        className="w-full border rounded px-3 py-2 text-sm"
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={posting || !body.trim()}
          className="bg-brand-600 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
        >
          {posting ? "Posting…" : "Post"}
        </button>
      </div>
    </form>
  );
}
