"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Article = {
  id: string;
  slug: string;
  title: string;
  dek: string;
  tldr: string;
  body: string;
  metaTitle: string;
  metaDescription: string;
  heroImage: string;
  heroAlt: string;
  author: string;
  tags: string;
  status: string;
  categoryId: string;
  linked: boolean;
  lastSyncedAt: string | null;
  syncError: string | null;
};

type Notice = { tone: "ok" | "warn" | "error"; text: string } | null;

const input = "w-full border rounded px-3 py-1.5 text-sm";
const label = "block text-xs font-medium text-gray-600 mb-1";

// The edit page for one blog article. Content fields sync to the matching
// Socrates article on save; category and visibility are mompuffs-only.
export default function BlogArticleEditor({
  article,
  categories,
  socratesEditUrl,
}: {
  article: Article;
  categories: { id: string; name: string }[];
  socratesEditUrl: string | null;
}) {
  const router = useRouter();
  const [a, setA] = useState(article);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(
    article.syncError ? { tone: "warn", text: `Last save didn't reach Socrates: ${article.syncError}` } : null,
  );
  const [conflict, setConflict] = useState(false);

  const set = (k: keyof Article) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setA((cur) => ({ ...cur, [k]: e.target.value }));

  async function save(force = false) {
    setBusy(true);
    setNotice(null);
    const res = await fetch(`/api/admin/blog/articles/${a.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: a.title,
        dek: a.dek,
        tldr: a.tldr,
        body: a.body,
        metaTitle: a.metaTitle,
        metaDescription: a.metaDescription,
        heroImage: a.heroImage,
        heroAlt: a.heroAlt,
        author: a.author,
        tags: a.tags.split(",").map((t) => t.trim()).filter(Boolean),
        status: a.status,
        categoryId: a.categoryId || null,
        force,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.status === 409 && data.conflict) {
      setConflict(true);
      setNotice({
        tone: "error",
        text: "This article was changed in Socrates after it was last synced here. Pull the latest version, or overwrite Socrates with your edits.",
      });
      return;
    }
    if (!res.ok) {
      setNotice({ tone: "error", text: data.error || "Something went wrong." });
      return;
    }
    setConflict(false);
    if (data.syncError) {
      setNotice({ tone: "warn", text: `Saved here, but Socrates wasn't updated: ${data.syncError}. Save again to retry.` });
    } else {
      setNotice({ tone: "ok", text: data.synced ? "Saved and synced to Socrates." : "Saved." });
    }
    router.refresh();
  }

  async function pull() {
    if (!confirm("Replace this article's content with the current Socrates version? Unsaved edits here are lost.")) return;
    setBusy(true);
    setNotice(null);
    const res = await fetch(`/api/admin/blog/articles/${a.id}/pull`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setNotice({ tone: "error", text: data.error || "Couldn't pull from Socrates." });
      return;
    }
    // Server props carry the fresh content; a full reload resets local state to it.
    window.location.reload();
  }

  async function remove() {
    if (
      !confirm(
        "Delete this article from mompuffs? The Socrates original isn't touched and would come back on the next import. To just take it off the blog, set Visibility to Hidden instead.",
      )
    )
      return;
    setBusy(true);
    const res = await fetch(`/api/admin/blog/articles/${a.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setNotice({ tone: "error", text: "Couldn't delete." });
      return;
    }
    router.push("/admin/blog");
    router.refresh();
  }

  const toneClass = {
    ok: "bg-green-50 text-green-800 border-green-200",
    warn: "bg-amber-50 text-amber-800 border-amber-200",
    error: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6 items-start">
      <div className="lg:col-span-2 bg-white rounded-xl shadow p-5 space-y-4 min-w-0">
        <label className="block">
          <span className={label}>Title</span>
          <input value={a.title} onChange={set("title")} className={`${input} text-base font-semibold`} />
        </label>
        <label className="block">
          <span className={label}>Dek (standfirst shown under the title and on gallery cards)</span>
          <textarea value={a.dek} onChange={set("dek")} rows={2} className={input} />
        </label>
        <label className="block">
          <span className={label}>TL;DR</span>
          <textarea value={a.tldr} onChange={set("tldr")} rows={3} className={input} />
        </label>
        <label className="block">
          <span className={label}>Body (Markdown)</span>
          <textarea value={a.body} onChange={set("body")} rows={24} className={`${input} font-mono text-xs leading-relaxed`} />
        </label>
      </div>

      <div className="space-y-4 min-w-0">
        <div className="bg-white rounded-xl shadow p-5 space-y-3">
          {notice && <p className={`text-xs border rounded p-2 ${toneClass[notice.tone]}`}>{notice.text}</p>}
          <button
            onClick={() => save(false)}
            disabled={busy || !a.title.trim()}
            className="w-full bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-brand-700 disabled:opacity-40"
          >
            {busy ? "Working…" : a.linked ? "Save & sync to Socrates" : "Save"}
          </button>
          {conflict && (
            <button
              onClick={() => save(true)}
              disabled={busy}
              className="w-full border border-red-300 text-red-700 text-sm px-4 py-2 rounded-full hover:bg-red-50 disabled:opacity-40"
            >
              Overwrite Socrates with my edits
            </button>
          )}
          {a.linked && (
            <>
              <button
                onClick={pull}
                disabled={busy}
                className="w-full border text-sm px-4 py-2 rounded-full hover:bg-gray-50 disabled:opacity-40"
              >
                Pull latest from Socrates
              </button>
              {socratesEditUrl && (
                <a
                  href={socratesEditUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-center text-sm text-brand-600 hover:underline"
                >
                  Open in Socrates editor ↗
                </a>
              )}
              <p className="text-xs text-gray-400">
                {a.lastSyncedAt ? `Last synced ${new Date(a.lastSyncedAt).toLocaleString()}. ` : ""}
                Edits saved in Socrates show up here automatically. In Socrates, switch to the mompuffs profile
                before opening the editor link.
              </p>
            </>
          )}
        </div>

        <div className="bg-white rounded-xl shadow p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">On mompuffs only</p>
          <label className="block">
            <span className={label}>Category</span>
            <select value={a.categoryId} onChange={set("categoryId")} className={input}>
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={label}>Visibility</span>
            <select value={a.status} onChange={set("status")} className={input}>
              <option value="PUBLISHED">Live on the blog</option>
              <option value="HIDDEN">Hidden</option>
            </select>
          </label>
          <p className="text-xs text-gray-400 font-mono break-all">/blog/{a.slug}</p>
        </div>

        <div className="bg-white rounded-xl shadow p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Details</p>
          {a.heroImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.heroImage} alt={a.heroAlt} className="w-full aspect-video object-cover rounded" />
          )}
          <label className="block">
            <span className={label}>Cover image URL</span>
            <input value={a.heroImage} onChange={set("heroImage")} className={input} />
          </label>
          <label className="block">
            <span className={label}>Cover alt text</span>
            <input value={a.heroAlt} onChange={set("heroAlt")} className={input} />
          </label>
          <label className="block">
            <span className={label}>Author</span>
            <input value={a.author} onChange={set("author")} className={input} />
          </label>
          <label className="block">
            <span className={label}>Tags (comma separated)</span>
            <input value={a.tags} onChange={set("tags")} className={input} />
          </label>
          <label className="block">
            <span className={label}>SEO title</span>
            <input value={a.metaTitle} onChange={set("metaTitle")} className={input} />
          </label>
          <label className="block">
            <span className={label}>SEO description</span>
            <textarea value={a.metaDescription} onChange={set("metaDescription")} rows={3} className={input} />
          </label>
        </div>

        <button onClick={remove} disabled={busy} className="text-xs text-red-600 hover:underline disabled:opacity-40">
          Delete from mompuffs
        </button>
      </div>
    </div>
  );
}
