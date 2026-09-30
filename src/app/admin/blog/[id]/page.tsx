import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { socratesEditUrl } from "@/lib/socrates";
import BlogArticleEditor from "@/components/BlogArticleEditor";

export const dynamic = "force-dynamic";

export default async function AdminBlogArticlePage({ params }: { params: { id: string } }) {
  const [article, categories] = await Promise.all([
    db.blogArticle.findUnique({ where: { id: params.id } }),
    db.blogCategory.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!article) notFound();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <Link href="/admin/blog" className="text-sm text-brand-600 hover:underline">
          ← All articles
        </Link>
        <Link href={`/blog/${article.slug}`} target="_blank" className="text-sm text-gray-500 hover:underline">
          View on site ↗
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-brand-900 mb-4 break-words">Edit article</h1>
      <BlogArticleEditor
        categories={categories}
        socratesEditUrl={article.socratesId ? socratesEditUrl(article.socratesId) : null}
        article={{
          id: article.id,
          slug: article.slug,
          title: article.title,
          dek: article.dek ?? "",
          tldr: article.tldr ?? "",
          body: article.body,
          metaTitle: article.metaTitle ?? "",
          metaDescription: article.metaDescription ?? "",
          heroImage: article.heroImage ?? "",
          heroAlt: article.heroAlt ?? "",
          author: article.author ?? "",
          tags: article.tags.join(", "),
          status: article.status,
          categoryId: article.categoryId ?? "",
          linked: Boolean(article.socratesId),
          lastSyncedAt: article.lastSyncedAt?.toISOString() ?? null,
          syncError: article.syncError,
        }}
      />
    </div>
  );
}
