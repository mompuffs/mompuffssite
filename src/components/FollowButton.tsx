"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FollowButton({
  targetUserId,
  initiallyFollowing,
}: {
  targetUserId: string;
  initiallyFollowing: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initiallyFollowing);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const res = await fetch("/api/follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId }),
    });
    const data = await res.json();
    setFollowing(data.following);
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={
        following
          ? "px-4 py-1.5 rounded-full text-sm font-medium border border-gray-300 hover:bg-gray-50"
          : "px-4 py-1.5 rounded-full text-sm font-medium bg-brand-600 text-white hover:bg-brand-700"
      }
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
