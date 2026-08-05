"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GroupSettings({
  slug,
  initialDescription,
  initialVisibility,
  initialJoinPolicy,
}: {
  slug: string;
  initialDescription: string;
  initialVisibility: "PUBLIC" | "PRIVATE";
  initialJoinPolicy: "OPEN" | "APPROVAL";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(initialDescription);
  const [visibility, setVisibility] = useState(initialVisibility);
  const [joinPolicy, setJoinPolicy] = useState(initialJoinPolicy);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/groups/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, visibility, joinPolicy }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Couldn't save.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function deleteGroup() {
    if (!confirm("Delete this group? This can't be undone.")) return;
    setDeleting(true);
    const res = await fetch(`/api/groups/${slug}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) window.location.href = "/groups";
  }

  return (
    <div className="mb-4">
      <button onClick={() => setOpen((o) => !o)} className="text-xs text-brand-600 hover:underline">
        {open ? "Hide settings" : "Group settings ▾"}
      </button>
      {open && (
        <div className="bg-white rounded-xl shadow p-4 mt-2 space-y-3">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            rows={2}
            className="w-full border rounded px-3 py-2 text-sm resize-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as "PUBLIC" | "PRIVATE")}
              className="border rounded px-2 py-1.5 text-sm"
            >
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE">Private</option>
            </select>
            <select
              value={joinPolicy}
              onChange={(e) => setJoinPolicy(e.target.value as "OPEN" | "APPROVAL")}
              className="border rounded px-2 py-1.5 text-sm"
            >
              <option value="OPEN">Open join</option>
              <option value="APPROVAL">Approval required</option>
            </select>
          </div>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <div className="flex items-center justify-between">
            <button
              onClick={save}
              disabled={saving}
              className="bg-brand-600 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={deleteGroup} disabled={deleting} className="text-xs text-red-600 hover:underline">
              {deleting ? "Deleting…" : "Delete group"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
