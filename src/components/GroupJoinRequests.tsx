"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type PendingRequest = {
  user: { id: string; username: string; displayName: string; avatarUrl: string | null };
  requestedAt: string;
};

export default function GroupJoinRequests({ slug, requests }: { slug: string; requests: PendingRequest[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(requests);
  const [actingId, setActingId] = useState<string | null>(null);

  async function respond(userId: string, action: "approve" | "decline") {
    setActingId(userId);
    await fetch(`/api/groups/${slug}/requests/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setActingId(null);
    setPending((p) => p.filter((r) => r.user.id !== userId));
    router.refresh();
  }

  if (pending.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow p-4 mb-4">
      <h3 className="font-semibold text-sm mb-3">
        Join requests <span className="text-gray-400 font-normal">({pending.length})</span>
      </h3>
      <div className="space-y-2">
        {pending.map((r) => (
          <div key={r.user.id} className="flex items-center justify-between gap-2">
            <Link href={`/profile/${r.user.username}`} className="flex items-center gap-2 min-w-0 hover:underline">
              {r.user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              ) : (
                <span className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                  {r.user.displayName.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="text-sm font-medium truncate">{r.user.displayName}</span>
            </Link>
            <div className="flex gap-1.5 flex-shrink-0">
              <button
                onClick={() => respond(r.user.id, "approve")}
                disabled={actingId === r.user.id}
                className="text-xs bg-brand-600 text-white px-2.5 py-1 rounded-full hover:bg-brand-700 disabled:opacity-60"
              >
                Approve
              </button>
              <button
                onClick={() => respond(r.user.id, "decline")}
                disabled={actingId === r.user.id}
                className="text-xs border border-gray-300 px-2.5 py-1 rounded-full hover:bg-gray-50 disabled:opacity-60"
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
