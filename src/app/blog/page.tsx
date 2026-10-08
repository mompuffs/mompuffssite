import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { pageMeta } from "@/lib/seo";
import { BLOG_PER_PAGE, parseSort } from "@/lib/blog";
import { pageCount, parsePage } from "@/lib/pagination";
import BlogFilters from "@/components/BlogFilters";
import ProductPagination from "@/components/ProductPagination";
import JsonLd from "@/components/JsonLd";
import { breadcrumbs, itemList } from "@/lib/structuredData";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMeta({
  title: "Cannabis News, Recipes & Articles for Moms | Mompuffs Blog",
  description:
    "Cannabis news, recipes, health guides and honest articles for canna-loving women and moms, from the Mompuffs community.",
  path: "/blog",
});

function fmt(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; sort?: string; page?: string };
}) {
  const q = searchParams.q?.trim() || undefined;
  const sort = parseSort(searchParams.sort);
  const page = parsePage(searchParams.page);

  const where: Prisma.BlogArticleWhereInput = {
    status: "PUBLISHED",
    ...(searchParams.category ? { category: { slug: searchParams.category } } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { dek: { contains: q, mode: "insensitive" } },
            { body: { contains: q, mode: "insensitive" } },
            { tags: { has: q } },
          ],
        }
      : {}),
  };

  const [categories, total, articles] = await Promise.all([
    db.blogCategory.findMany({
      where: { articles: { some: { status: "PUBLISHED" } } },
      orderBy: { name: "asc" },
      select: { name: true, slug: true },
    }),
    db.blogArticle.count({ where }),
    db.blogArticle.findMany({
      where,
      orderBy: { publishedAt: sort === "oldest" ? "asc" : "desc" },
      skip: (page - 1) * BLOG_PER_PAGE,
      take: BLOG_PER_PAGE,
      select: {
        slug: true,
        title: true,
        dek: true,
        heroImage: true,
        heroAlt: true,
        publishedAt: true,
        category: { select: { name: true, slug: true } },
      },
    }),
  ]);

  const pages = pageCount(total, BLOG_PER_PAGE);
  const filtered = Boolean(q || searchParams.category);

  return (
    <div>
      <JsonLd
        items={[
          itemList("Mompuffs blog articles", articles.map((a) => `/blog/${a.slug}`)),
          breadcrumbs([{ name: "Home", path: "/" }, { name: "Blog" }]),
        ]}
      />
      <h1 className="text-2xl font-bold mb-4">Blog</h1>

      <BlogFilters categories={categories} q={q ?? ""} category={searchParams.category ?? ""} sort={sort} />

      <p className="text-sm text-gray-500 mb-3">
        {total} article{total === 1 ? "" : "s"}
        {filtered && (
          <>
            {" "}·{" "}
            <Link href={sort === "oldest" ? "/blog?sort=oldest" : "/blog"} className="text-brand-600 hover:underline">
              clear filters
            </Link>
          </>
        )}
      </p>

      {articles.length === 0 ? (
        <p className="text-gray-500 bg-white rounded-xl shadow p-6">
          {filtered ? "No articles match those filters." : "No articles yet. Check back soon!"}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {articles.map((a) => (
              <Link
                key={a.slug}
                href={`/blog/${a.slug}`}
                className="group bg-white rounded-xl shadow overflow-hidden hover:shadow-md transition flex flex-col"
              >
                <div className="aspect-[16/10] bg-brand-100 overflow-hidden">
                  {a.heroImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.heroImage}
                      alt={a.heroAlt ?? a.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">📰</div>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-center justify-between gap-2 text-xs mb-2">
                    {a.category ? (
                      <span className="bg-brand-50 text-brand-700 font-medium px-2 py-0.5 rounded-full truncate">
                        {a.category.name}
                      </span>
                    ) : (
                      <span />
                    )}
                    <time className="text-gray-400 shrink-0">{fmt(a.publishedAt)}</time>
                  </div>
                  <h2 className="font-semibold leading-snug group-hover:text-brand-700">{a.title}</h2>
                  {a.dek && <p className="text-sm text-gray-500 mt-1 line-clamp-3">{a.dek}</p>}
                </div>
              </Link>
            ))}
          </div>
          <ProductPagination
            page={Math.min(page, pages)}
            pageCount={pages}
            basePath="/blog"
            query={{ q, category: searchParams.category, sort: sort === "oldest" ? "oldest" : undefined }}
          />
        </>
      )}
    </div>
  );
}
