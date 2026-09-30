"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Cat = { id: string; name: string; slug: string; description: string | null; count: number };

function CategoryRow({ cat }: { cat: Cat }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cat.name);
  const [slug, setSlug] = useState(cat.slug);
  const [description, setDescription] = useState(cat.description ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/admin/blog/categories/${cat.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, slug, description }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    const note = cat.count ? ` Its ${cat.count} article${cat.count === 1 ? "" : "s"} will become uncategorized.` : "";
    if (!confirm(`Delete "${cat.name}"?${note}`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/blog/categories/${cat.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      alert("Something went wrong.");
      return;
    }
    router.refresh();
  }

  if (editing) {
    return (
      <div className="py-3 space-y-2">
        <div className="grid sm:grid-cols-2 gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className="border rounded px-3 py-1.5 text-sm" placeholder="Name" />
          <input value={slug} onChange={(e) => setSlug(e.target.value)} className="border rounded px-3 py-1.5 text-sm font-mono" placeholder="slug" />
        </div>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border rounded px-3 py-1.5 text-sm"
          placeholder="Description (optional)"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-3">
          <button onClick={save} disabled={busy} className="text-sm bg-brand-600 text-white px-3 py-1 rounded-full disabled:opacity-40">
            Save
          </button>
          <button onClick={() => setEditing(false)} className="text-sm text-gray-500 hover:underline">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-sm">
          {cat.name} <span className="text-gray-400 font-mono text-xs ml-1">/{cat.slug}</span>
        </p>
        {cat.description && <p className="text-xs text-gray-500 truncate">{cat.description}</p>}
      </div>
      <div className="flex items-center gap-4 text-xs shrink-0">
        <span className="text-gray-400">
          {cat.count} article{cat.count === 1 ? "" : "s"}
        </span>
        <button onClick={() => setEditing(true)} className="text-brand-600 hover:underline">
          Edit
        </button>
        <button onClick={remove} disabled={busy} className="text-red-600 hover:underline disabled:opacity-40">
          Delete
        </button>
      </div>
    </div>
  );
}

export default function BlogCategoryManager({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/blog/categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }
    setName("");
    setDescription("");
    router.refresh();
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6 items-start">
      <form onSubmit={create} className="bg-white rounded-xl shadow p-5 space-y-3">
        <p className="font-semibold text-sm">New category</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          required
          className="w-full border rounded px-3 py-1.5 text-sm"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="w-full border rounded px-3 py-1.5 text-sm"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-brand-700 disabled:opacity-40"
        >
          {busy ? "Adding…" : "Add category"}
        </button>
      </form>

      <div className="bg-white rounded-xl shadow px-5 py-2 lg:col-span-2 divide-y divide-gray-100">
        {categories.length === 0 ? (
          <p className="text-sm text-gray-500 py-3">No categories yet.</p>
        ) : (
          categories.map((c) => <CategoryRow key={c.id} cat={c} />)
        )}
      </div>
    </div>
  );
}
