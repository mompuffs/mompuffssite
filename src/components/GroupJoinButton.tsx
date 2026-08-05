"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type MembershipStatus = "ACTIVE" | "PENDING" | null;

export default function GroupJoinButton({
  slug,
  isOwner,
  initialStatus,
  joinPolicy,
}: {
  slug: string;
  isOwner: boolean;
  initialStatus: MembershipStatus;
  joinPolicy: "OPEN" | "APPROVAL";
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/groups/${slug}/join`, { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't join.");
      return;
    }
    setStatus(data.status);
    router.refresh();
  }

  async function leave() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/groups/${slug}/leave`, { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Couldn't leave.");
      return;
    }
    setStatus(null);
    router.refresh();
  }

  if (isOwner) {
    return <span className="text-sm text-gray-500 font-medium">You own this group</span>;
  }

  if (status === "ACTIVE") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-green-700 font-medium">✓ Member</span>
        <button onClick={leave} disabled={loading} className="text-xs text-gray-500 hover:underline">
          Leave
        </button>
      </div>
    );
  }

  if (status === "PENDING") {
    return <span className="text-sm text-gray-500">Request pending approval</span>;
  }

  return (
    <div>
      <button
        onClick={join}
        disabled={loading}
        className="bg-brand-600 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? "…" : joinPolicy === "APPROVAL" ? "Request to join" : "Join group"}
      </button>
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}
