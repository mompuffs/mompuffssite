import Link from "next/link";
import { db } from "@/lib/db";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

const FULL_LIMIT = 24;

function Avatar({ url, name }: { url: string | null; name: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
  ) : (
    <span className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold flex-shrink-0">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q?.trim();

  if (!q) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-2">Search</h1>
        <p className="text-gray-500">Search for people, groups, shops, and products from the box up top.</p>
      </div>
    );
  }

  const [users, groups, shops, products] = await Promise.all([
    db.user.findMany({
      where: {
        OR: [
          { displayName: { contains: q, mode: "insensitive" } },
          { username: { contains: q, mode: "insensitive" } },
        ],
      },
      take: FULL_LIMIT,
      orderBy: { displayName: "asc" },
      select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true },
    }),
    db.group.findMany({
      where: {
        OR: [{ name: { contains: q, mode: "insensitive" } }, { topic: { contains: q, mode: "insensitive" } }],
      },
      take: FULL_LIMIT,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        avatarUrl: true,
        topic: true,
        _count: { select: { members: { where: { status: "ACTIVE" } } } },
      },
    }),
    db.shop.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: FULL_LIMIT,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        bannerUrl: true,
        _count: { select: { products: { where: { archivedAt: null } } } },
      },
    }),
    db.product.findMany({
      where: {
        archivedAt: null,
        OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }],
      },
      take: FULL_LIMIT,
      orderBy: { createdAt: "desc" },
      include: { shop: { select: { name: true, slug: true } } },
    }),
  ]);

  const totalCount = users.length + groups.length + shops.length + products.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Search results for "{q}"</h1>
        <p className="text-gray-500 text-sm">
          {totalCount === 0 ? "No matches found." : `${totalCount} result${totalCount === 1 ? "" : "s"}`}
        </p>
      </div>

      {totalCount === 0 && (
        <p className="text-gray-500">
          Try a different spelling, or browse{" "}
          <Link href="/marketplace" className="text-brand-600 hover:underline">
            the marketplace
          </Link>{" "}
          and{" "}
          <Link href="/groups" className="text-brand-600 hover:underline">
            groups
          </Link>{" "}
          directly.
        </p>
      )}

      {users.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">People</h2>
          <div className="bg-white rounded-xl shadow divide-y">
            {users.map((u) => (
              <Link key={u.id} href={`/profile/${u.username}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                <Avatar url={u.avatarUrl} name={u.displayName} />
                <div className="min-w-0">
                  <p className="font-medium truncate">{u.displayName}</p>
                  <p className="text-xs text-gray-500 truncate">@{u.username}{u.bio ? ` · ${u.bio}` : ""}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {groups.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Groups</h2>
          <div className="bg-white rounded-xl shadow divide-y">
            {groups.map((g) => (
              <Link key={g.id} href={`/groups/${g.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                <Avatar url={g.avatarUrl} name={g.name} />
                <div className="min-w-0">
                  <p className="font-medium truncate">{g.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {g._count.members} member{g._count.members === 1 ? "" : "s"}
                    {g.topic ? ` · ${g.topic}` : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {shops.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Shops</h2>
          <div className="bg-white rounded-xl shadow divide-y">
            {shops.map((s) => (
              <Link key={s.id} href={`/shop/${s.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                <Avatar url={s.bannerUrl} name={s.name} />
                <div className="min-w-0">
                  <p className="font-medium truncate">{s.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {s._count.products} product{s._count.products === 1 ? "" : "s"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {products.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Products</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p as any} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
