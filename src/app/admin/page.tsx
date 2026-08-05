import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl shadow p-5 hover:shadow-md transition block"
    >
      <p className="text-3xl font-bold text-brand-900">{value.toLocaleString()}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </Link>
  );
}

export default async function AdminDashboardPage() {
  const [
    userCount,
    adminCount,
    postCount,
    groupCount,
    shopCount,
    productCount,
    orderCount,
    pendingRefunds,
    recentUsers,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { isAdmin: true } }),
    db.post.count(),
    db.group.count(),
    db.shop.count(),
    db.product.count(),
    db.order.count(),
    db.refundRequest.count({ where: { status: "PENDING" } }),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, username: true, displayName: true, email: true, createdAt: true },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-900 mb-1">Dashboard</h1>
      <p className="text-sm text-gray-500 mb-6">Platform-wide overview.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Users" value={userCount} href="/admin/users" />
        <StatCard label="Posts" value={postCount} href="/admin/posts" />
        <StatCard label="Groups" value={groupCount} href="/admin/groups" />
        <StatCard label="Shops" value={shopCount} href="/admin/shops" />
        <StatCard label="Products" value={productCount} href="/admin/shops" />
        <StatCard label="Orders" value={orderCount} href="/admin/shops" />
        <StatCard label="Admins" value={adminCount} href="/admin/users" />
        <StatCard label="Pending refunds" value={pendingRefunds} href="/admin/shops" />
      </div>

      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">Newest members</h2>
          <Link href="/admin/users" className="text-sm text-brand-600 hover:underline">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {recentUsers.map((u) => (
            <div key={u.id} className="py-2 flex items-center justify-between text-sm">
              <div>
                <span className="font-medium">{u.displayName}</span>
                <span className="text-gray-400 ml-2">@{u.username}</span>
              </div>
              <span className="text-gray-400">{u.email}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
