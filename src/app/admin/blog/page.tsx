import Link from "next/link";
import { db } from "@/lib/db";
import { socratesConfig } from "@/lib/socrates";
import BlogImportButton from "@/components/BlogImportButton";
import BlogAdminNav from "@/components/BlogAdminNav";

export const dynamic = "force-dynamic";

function fmt(d: Date | null) {
  return d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
}

export default async function AdminBlogPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q?.trim();
  const cfg = socratesConfig();
  const [articles, total] = await Promise.all([
    db.blogArticle.findMany({
      where: q ? { title: { contains: q, mode: "insensitive" } } : undefined,
      orderBy: { publishedAt: "desc" },
      include: { category: { select: { name: true } } },
    }),
    db.blogArticle.count(),
  ]);

  const checks = [
    { label: "SOCRATES_SITE_ID", ok: Boolean(cfg.siteId) },
    { label: "SOCRATES_FEED_KEY", ok: Boolean(cfg.feedKey) },
    { label: "SOCRATES_WEBHOOK_SECRET", ok: Boolean(cfg.webhookSecret) },
  ];
  const ready = checks.every((c) => c.ok);

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-900 mb-1">Blog</h1>
      <p className="text-sm text-gray-500 mb-4">
        Articles are written in Socrates and arrive here when published there. {total} article{total === 1 ? "" : "s"}.
      </p>
      <BlogAdminNav />

      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="text-sm min-w-0">
            <p className="font-semibold mb-1">Socrates connection</p>
            <p className="text-gray-500 break-all">
              Desk:{" "}
              <a href={cfg.url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                {cfg.url}
              </a>
              {cfg.siteId && (
                <>
                  {" "}· profile <span className="font-mono">{cfg.siteId}</span>
                </>
              )}
            </p>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {checks.map((c) => (
                <li key={c.label} className={c.ok ? "text-green-700" : "text-red-600"}>
                  {c.ok ? "✓" : "✗"} <span className="font-mono text-xs">{c.label}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-400 mt-2">
              In Socrates, set this profile&apos;s publishing to <em>Custom website</em> with the receiving address{" "}
              <span className="font-mono break-all">https://mompuffs.com/api/webhooks/socrates</span>.
            </p>
          </div>
          <BlogImportButton disabled={!cfg.siteId || !cfg.feedKey} />
        </div>
        {!ready && (
          <p className="text-xs text-red-600 mt-3">Set the missing environment variables in Vercel to turn on sync.</p>
        )}
      </div>

      <div className="bg-white rounded-xl shadow p-5">
        <form action="/admin/blog" method="GET" className="mb-4">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search titles…"
            className="w-full sm:w-72 border rounded-full px-3 py-1.5 text-sm"
          />
        </form>
        {articles.length === 0 ? (
          <p className="text-sm text-gray-500">
            {q ? `No articles matching "${q}".` : "No articles yet. Import from Socrates or publish one there."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                  <th className="pb-2 pr-4 font-medium">Title</th>
                  <th className="pb-2 pr-4 font-medium">Category</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Published</th>
                  <th className="pb-2 pr-4 font-medium">Last synced</th>
                  <th className="pb-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((a) => (
                  <tr key={a.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-2.5 pr-4 font-medium max-w-xs truncate">
                      <Link href={`/admin/blog/${a.id}`} className="hover:underline">
                        {a.title}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-500">{a.category?.name ?? "—"}</td>
                    <td className="py-2.5 pr-4">
                      <span className={a.status === "PUBLISHED" ? "text-green-700" : "text-gray-400"}>
                        {a.status === "PUBLISHED" ? "Live" : "Hidden"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap">{fmt(a.publishedAt)}</td>
                    <td className="py-2.5 pr-4 whitespace-nowrap">
                      {!a.socratesId ? (
                        <span className="text-gray-400">Local</span>
                      ) : (
                        <span className="text-gray-500">{fmt(a.lastSyncedAt)}</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      <Link href={`/admin/blog/${a.id}`} className="text-xs text-brand-600 hover:underline mr-3">
                        Edit
                      </Link>
                      <Link href={`/blog/${a.slug}`} className="text-xs text-gray-500 hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
