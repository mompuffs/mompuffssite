import { db } from "@/lib/db";
import AdminGroupRow from "@/components/AdminGroupRow";

export const dynamic = "force-dynamic";

export default async function AdminGroupsPage() {
  const groups = await db.group.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { username: true, displayName: true } },
      _count: { select: { members: true, posts: true } },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-900 mb-1">Groups</h1>
      <p className="text-sm text-gray-500 mb-6">{groups.length} group{groups.length === 1 ? "" : "s"}.</p>

      <div className="bg-white rounded-xl shadow p-5 overflow-x-auto">
        {groups.length === 0 ? (
          <p className="text-sm text-gray-500">No groups yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Owner</th>
                <th className="pb-2 pr-4 font-medium">Visibility / Join</th>
                <th className="pb-2 pr-4 font-medium">Members</th>
                <th className="pb-2 pr-4 font-medium">Posts</th>
                <th className="pb-2 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <AdminGroupRow key={g.id} group={{ ...g, createdAt: g.createdAt.toISOString() }} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
