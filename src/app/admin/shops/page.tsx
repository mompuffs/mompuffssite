import Link from "next/link";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminShopsPage() {
  const shops = await db.shop.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { username: true, displayName: true } },
      _count: { select: { products: true } },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-900 mb-1">Shops</h1>
      <p className="text-sm text-gray-500 mb-6">
        {shops.length} shop{shops.length === 1 ? "" : "s"}. Read-only overview -- shop owners manage their own
        products, orders, and payments from their own dashboard.
      </p>

      <div className="bg-white rounded-xl shadow p-5 overflow-x-auto">
        {shops.length === 0 ? (
          <p className="text-sm text-gray-500">No shops yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                <th className="pb-2 pr-4 font-medium">Shop</th>
                <th className="pb-2 pr-4 font-medium">Owner</th>
                <th className="pb-2 pr-4 font-medium">Products</th>
                <th className="pb-2 pr-4 font-medium">Flat shipping</th>
                <th className="pb-2 font-medium">Views</th>
              </tr>
            </thead>
            <tbody>
              {shops.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2.5 pr-4">
                    <Link href={`/shop/${s.slug}`} className="font-medium hover:underline">
                      {s.name}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4 text-gray-500">
                    <Link href={`/profile/${s.owner.username}`} className="hover:underline">
                      {s.owner.displayName}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4 text-gray-500">{s._count.products}</td>
                  <td className="py-2.5 pr-4 text-gray-500">{formatCents(s.flatShippingCents)}</td>
                  <td className="py-2.5 text-gray-500">{s.visitCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
