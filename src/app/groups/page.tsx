"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ImageInput from "@/components/ImageInput";

type Group = {
  id: string;
  name: string;
  slug: string;
  topic: string | null;
  description: string | null;
  avatarUrl: string | null;
  visibility: "PUBLIC" | "PRIVATE";
  joinPolicy: "OPEN" | "APPROVAL";
  isOwner: boolean;
  memberCount: number;
  membershipStatus: "ACTIVE" | "PENDING" | null;
};

export default function GroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [q, setQ] = useState("");
  const [joiningSlug, setJoiningSlug] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [joinPolicy, setJoinPolicy] = useState<"OPEN" | "APPROVAL">("OPEN");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  function load(query: string) {
    fetch(`/api/groups${query ? `?q=${encodeURIComponent(query)}` : ""}`)
      .then((r) => r.json())
      .then(setGroups)
      .catch(() => {});
  }

  useEffect(() => load(""), []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(q);
  }

  async function handleJoin(group: Group) {
    setJoiningSlug(group.slug);
    const res = await fetch(`/api/groups/${group.slug}/join`, { method: "POST" });
    setJoiningSlug(null);
    if (res.ok) load(q);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setCreateError(null);
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, topic, description, avatarUrl, visibility, joinPolicy }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setCreateError(data.error ?? "Could not create group.");
      return;
    }
    router.push(`/groups/${data.slug}`);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Groups</h1>
        <button
          onClick={() => setShowCreate((s) => !s)}
          className="bg-brand-600 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-brand-700"
        >
          {showCreate ? "Cancel" : "+ Create group"}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow p-4 mb-6 space-y-3">
          <input
            required
            placeholder="Group name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          />
          <input
            placeholder="Topic (e.g. Gardening, Local moms, Book club)"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full border rounded px-3 py-2 text-sm resize-none"
          />
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Group photo (optional)</label>
            <ImageInput value={avatarUrl} onChange={setAvatarUrl} placeholder="Image URL" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Visibility</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as "PUBLIC" | "PRIVATE")}
                className="w-full border rounded px-2 py-1.5 text-sm"
              >
                <option value="PUBLIC">Public — anyone can see posts</option>
                <option value="PRIVATE">Private — only members see posts</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Joining</label>
              <select
                value={joinPolicy}
                onChange={(e) => setJoinPolicy(e.target.value as "OPEN" | "APPROVAL")}
                className="w-full border rounded px-2 py-1.5 text-sm"
              >
                <option value="OPEN">Open — anyone can join instantly</option>
                <option value="APPROVAL">Approval required</option>
              </select>
            </div>
          </div>
          {createError && <p className="text-red-600 text-sm">{createError}</p>}
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="bg-brand-600 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create group"}
          </button>
        </form>
      )}

      <form onSubmit={handleSearch} className="mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search groups by name or topic…"
          className="w-full border rounded-full px-4 py-2 text-sm"
        />
      </form>

      {groups === null ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="text-gray-500 text-sm">No groups found.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {groups.map((g) => (
            <div key={g.id} className="bg-white rounded-xl shadow p-4 flex gap-3">
              <Link href={`/groups/${g.slug}`} className="flex-shrink-0">
                {g.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.avatarUrl} alt="" className="w-14 h-14 rounded-lg object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-lg">
                    {g.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/groups/${g.slug}`} className="font-semibold hover:underline block truncate">
                  {g.name}
                </Link>
                {g.topic && <p className="text-xs text-gray-500 truncate">{g.topic}</p>}
                <p className="text-xs text-gray-400 mt-0.5">
                  {g.memberCount} member{g.memberCount === 1 ? "" : "s"} ·{" "}
                  {g.visibility === "PRIVATE" ? "Private" : "Public"}
                </p>
                <div className="mt-2">
                  {g.isOwner ? (
                    <Link href={`/groups/${g.slug}`} className="text-xs text-brand-600 hover:underline">
                      Manage →
                    </Link>
                  ) : g.membershipStatus === "ACTIVE" ? (
                    <span className="text-xs text-green-700">✓ Joined</span>
                  ) : g.membershipStatus === "PENDING" ? (
                    <span className="text-xs text-gray-500">Request pending</span>
                  ) : (
                    <button
                      onClick={() => handleJoin(g)}
                      disabled={joiningSlug === g.slug}
                      className="text-xs bg-brand-600 text-white px-3 py-1 rounded-full hover:bg-brand-700 disabled:opacity-60"
                    >
                      {joiningSlug === g.slug ? "…" : g.joinPolicy === "APPROVAL" ? "Request to join" : "Join"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
