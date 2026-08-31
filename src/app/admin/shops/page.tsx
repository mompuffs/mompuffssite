import { db } from "@/lib/db";
import AdminShopRow from "@/components/AdminShopRow";

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
        {shops.length} shop{shops.length === 1 ? "" : "s"}. Deleting a shop removes its products and this shop's
        line items from existing orders. The owner's account stays.
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
                <th className="pb-2 pr-4 font-medium">Views</th>
                <th className="pb-2 font-medium text-right"> </th>
              </tr>
            </thead>
            <tbody>
              {shops.map((s) => (
                <AdminShopRow key={s.id} shop={s} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
