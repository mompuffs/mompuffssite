"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageInput from "@/components/ImageInput";
import VideoInput from "@/components/VideoInput";

export default function PostComposer() {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoThumbnailUrl, setVideoThumbnailUrl] = useState("");
  const [attachmentType, setAttachmentType] = useState<"none" | "image" | "video">("none");
  const [posting, setPosting] = useState(false);

  function pickImage() {
    setAttachmentType("image");
    setVideoUrl("");
    setVideoThumbnailUrl("");
  }
  function pickVideo() {
    setAttachmentType("video");
    setImageUrl("");
  }
  function clearAttachment() {
    setAttachmentType("none");
    setImageUrl("");
    setVideoUrl("");
    setVideoThumbnailUrl("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body,
        imageUrl: imageUrl || undefined,
        videoUrl: videoUrl || undefined,
        videoThumbnailUrl: videoThumbnailUrl || undefined,
      }),
    });
    setBody("");
    clearAttachment();
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

      {attachmentType === "image" && (
        <div>
          <ImageInput value={imageUrl} onChange={setImageUrl} placeholder="Image URL (optional)" />
          <button type="button" onClick={clearAttachment} className="text-xs text-gray-500 hover:underline mt-1">
            Remove photo
          </button>
        </div>
      )}

      {attachmentType === "video" && (
        <VideoInput
          url={videoUrl}
          thumbnailUrl={videoThumbnailUrl}
          onChange={({ url, thumbnailUrl }) => {
            setVideoUrl(url);
            setVideoThumbnailUrl(thumbnailUrl);
            if (!url) setAttachmentType("none");
          }}
        />
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-xs">
          {attachmentType === "none" && (
            <>
              <button type="button" onClick={pickImage} className="text-brand-600 hover:underline">
                + Photo
              </button>
              <button type="button" onClick={pickVideo} className="text-brand-600 hover:underline">
                + Video
              </button>
            </>
          )}
        </div>
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
