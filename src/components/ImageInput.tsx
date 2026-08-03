"use client";

import { useState } from "react";
import { uploadMedia } from "@/lib/mediaUpload";

export default function ImageInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { url } = await uploadMedia(file, "image");
      onChange(url);
    } catch (err: any) {
      setError(err.message ?? "Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-9 w-9 object-cover rounded border flex-shrink-0" />
        )}
        <input
          placeholder={placeholder ?? "Image URL"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 border rounded px-2 py-1 text-xs min-w-0"
        />
      </div>
      <label className="inline-block text-xs text-brand-600 hover:underline cursor-pointer">
        {uploading ? "Uploading…" : "Upload image"}
        <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} className="hidden" />
      </label>
      {error && <p className="text-red-600 text-xs">{error}</p>}
    </div>
  );
}
