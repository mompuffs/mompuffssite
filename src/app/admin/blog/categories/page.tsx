import { db } from "@/lib/db";
import BlogAdminNav from "@/components/BlogAdminNav";
import BlogCategoryManager from "@/components/BlogCategoryManager";

export const dynamic = "force-dynamic";

export default async function AdminBlogCategoriesPage() {
  const categories = await db.blogCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { articles: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-900 mb-1">Blog categories</h1>
      <p className="text-sm text-gray-500 mb-4">
        Visitors filter the blog by these. A new article from Socrates lands in the category matching its pillar
        (created if needed); after that, the category you pick on its edit page sticks.
      </p>
      <BlogAdminNav />
      <BlogCategoryManager
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description,
          parentId: c.parentId,
          count: c._count.articles,
        }))}
      />
    </div>
  );
}
