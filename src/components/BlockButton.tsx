"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BlockButton({
  targetUserId,
  initiallyBlocked,
}: {
  targetUserId: string;
  initiallyBlocked: boolean;
}) {
  const router = useRouter();
  const [blocked, setBlocked] = useState(initiallyBlocked);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!blocked && !confirm("Block this user? They won't be able to follow, friend-request, or message you.")) {
      return;
    }
    setLoading(true);
    if (blocked) {
      await fetch(`/api/blocks/${targetUserId}`, { method: "DELETE" });
    } else {
      await fetch("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
    }
    setLoading(false);
    setBlocked(!blocked);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={
        blocked
          ? "px-4 py-1.5 rounded-full text-sm font-medium border border-gray-300 hover:bg-gray-50 text-gray-600"
          : "px-4 py-1.5 rounded-full text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50"
      }
    >
      {blocked ? "Unblock" : "Block"}
    </button>
  );
}
