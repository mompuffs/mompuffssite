"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useOverlay } from "@/components/OverlayProvider";

type Friend = { id: string; username: string; displayName: string; avatarUrl: string | null; online: boolean };

export default function FriendsPage() {
  const { openChat } = useOverlay();
  const [q, setQ] = useState("");
  const [friends, setFriends] = useState<Friend[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/friends/search${q ? `?q=${encodeURIComponent(q)}` : ""}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => setFriends(Array.isArray(data.friends) ? data.friends : []))
        .catch(() => {});
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Friends</h1>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search friends by name…"
        className="w-full border rounded-full px-4 py-2 mb-4 text-sm"
      />
      {friends === null ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : friends.length === 0 ? (
        <p className="text-gray-500 text-sm">
          {q ? `No friends matching "${q}".` : "You haven't added any friends yet."}
        </p>
      ) : (
        <div className="bg-white rounded-xl shadow divide-y">
          {friends.map((f) => (
            <div key={f.id} className="flex items-center gap-3 px-4 py-3">
              <Link
                href={`/profile/${f.username}`}
                className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80"
              >
                <span className="relative flex-shrink-0">
                  {f.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <span className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold">
                      {f.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                  {f.online && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="font-medium truncate">{f.displayName}</p>
                  <p className="text-xs text-gray-500">{f.online ? "Online" : "Offline"}</p>
                </div>
              </Link>
              <button
                onClick={() => openChat(f.username)}
                className="text-brand-600 text-sm font-medium flex-shrink-0 hover:underline"
              >
                Message
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
