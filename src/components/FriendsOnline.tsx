"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useOverlay } from "@/components/OverlayProvider";

type Friend = { id: string; username: string; displayName: string; avatarUrl: string | null };

const POLL_MS = 45_000;

export default function FriendsOnline() {
  const { openChat } = useOverlay();
  const [friends, setFriends] = useState<Friend[] | null>(null);

  useEffect(() => {
    function load() {
      fetch("/api/friends/online")
        .then((r) => r.json())
        .then((data) => setFriends(Array.isArray(data.friends) ? data.friends : []))
        .catch(() => {});
    }
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="font-semibold text-sm mb-3">Friends Online</h3>
      {friends === null ? (
        <p className="text-xs text-gray-500">Loading…</p>
      ) : friends.length === 0 ? (
        <p className="text-xs text-gray-500">No friends online right now.</p>
      ) : (
        <ul className="space-y-2">
          {friends.map((f) => (
            <li key={f.id}>
              <button
                onClick={() => openChat(f.username)}
                className="w-full flex items-center gap-2.5 text-left hover:bg-gray-50 rounded-lg px-1.5 py-1 -mx-1.5"
              >
                <span className="relative flex-shrink-0">
                  {f.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <span className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold">
                      {f.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white" />
                </span>
                <span className="text-sm font-medium truncate">{f.displayName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Link href="/messages" className="block mt-3 text-xs text-brand-600 hover:underline">
        View all messages →
      </Link>
    </div>
  );
}
