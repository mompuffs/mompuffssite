import { db } from "@/lib/db";
import AdminUserRow from "@/components/AdminUserRow";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      isAdmin: true,
      createdAt: true,
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-900 mb-1">Users</h1>
      <p className="text-sm text-gray-500 mb-6">{users.length} registered member{users.length === 1 ? "" : "s"}.</p>

      <div className="bg-white rounded-xl shadow p-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
              <th className="pb-2 pr-4 font-medium">Name</th>
              <th className="pb-2 pr-4 font-medium">Email</th>
              <th className="pb-2 pr-4 font-medium">Joined</th>
              <th className="pb-2 pr-4 font-medium">Role</th>
              <th className="pb-2 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <AdminUserRow key={u.id} user={{ ...u, createdAt: u.createdAt.toISOString() }} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
