"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type AdminGroup = {
  id: string;
  name: string;
  slug: string;
  visibility: string;
  joinPolicy: string;
  createdAt: string;
  owner: { username: string; displayName: string };
  _count: { members: number; posts: number };
};

export default function AdminGroupRow({ group }: { group: AdminGroup }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${group.name}"? This removes all its posts and memberships too.`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/groups/${group.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      alert("Something went wrong.");
      return;
    }
    router.refresh();
  }

  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-2.5 pr-4">
        <Link href={`/groups/${group.slug}`} className="font-medium hover:underline">
          {group.name}
        </Link>
      </td>
      <td className="py-2.5 pr-4 text-gray-500">
        <Link href={`/profile/${group.owner.username}`} className="hover:underline">
          {group.owner.displayName}
        </Link>
      </td>
      <td className="py-2.5 pr-4 text-gray-500">{group.visibility} / {group.joinPolicy}</td>
      <td className="py-2.5 pr-4 text-gray-500">{group._count.members}</td>
      <td className="py-2.5 pr-4 text-gray-500">{group._count.posts}</td>
      <td className="py-2.5 text-right">
        <button
          onClick={handleDelete}
          disabled={busy}
          className="text-xs text-red-600 hover:underline disabled:opacity-40"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}
