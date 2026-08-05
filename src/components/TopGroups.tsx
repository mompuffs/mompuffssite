"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Group = { id: string; name: string; slug: string; avatarUrl: string | null; memberCount: number };

export default function TopGroups() {
  const [groups, setGroups] = useState<Group[] | null>(null);

  useEffect(() => {
    fetch("/api/groups/top")
      .then((r) => r.json())
      .then(setGroups)
      .catch(() => {});
  }, []);

  if (groups !== null && groups.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow p-3 mt-3">
      <p className="px-2 pt-1 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Top Groups</p>
      {groups === null ? (
        <p className="px-2 pb-1 text-xs text-gray-500">Loading…</p>
      ) : (
        <div className="space-y-0.5">
          {groups.map((g) => (
            <Link
              key={g.id}
              href={`/groups/${g.slug}`}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50"
            >
              {g.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={g.avatarUrl} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />
              ) : (
                <span className="w-7 h-7 rounded bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                  {g.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="text-sm truncate flex-1">{g.name}</span>
              <span className="text-xs text-gray-400 flex-shrink-0">{g.memberCount}</span>
            </Link>
          ))}
        </div>
      )}
      <Link href="/groups" className="block px-2 pt-2 text-xs text-brand-600 hover:underline">
        Browse all groups →
      </Link>
    </div>
  );
}
