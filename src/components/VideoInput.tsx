"use client";

import { useState } from "react";
import { uploadMedia } from "@/lib/mediaUpload";

export default function VideoInput({
  url,
  thumbnailUrl,
  onChange,
}: {
  url: string;
  thumbnailUrl: string;
  onChange: (value: { url: string; thumbnailUrl: string }) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const result = await uploadMedia(file, "video");
      onChange({ url: result.url, thumbnailUrl: result.thumbnailUrl ?? "" });
    } catch (err: any) {
      setError(err.message ?? "Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-1">
      {url && (
        <div className="relative inline-block">
          <video src={url} poster={thumbnailUrl || undefined} controls className="h-32 rounded border" />
          <button
            type="button"
            onClick={() => onChange({ url: "", thumbnailUrl: "" })}
            className="absolute -top-2 -right-2 bg-white border rounded-full w-5 h-5 text-xs text-red-500 hover:bg-red-50"
          >
            ×
          </button>
        </div>
      )}
      {!url && (
        <label className="inline-block text-xs text-brand-600 hover:underline cursor-pointer">
          {uploading ? "Uploading & processing… (may take a bit for video)" : "+ Add video (up to 1 min)"}
          <input type="file" accept="video/*" onChange={handleFile} disabled={uploading} className="hidden" />
        </label>
      )}
      {error && <p className="text-red-600 text-xs">{error}</p>}
    </div>
  );
}
