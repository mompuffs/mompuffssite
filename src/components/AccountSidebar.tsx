"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Person = { id: string; username: string; displayName: string; avatarUrl: string | null };
type FriendRequest = { id: string; sender: Person };

function Avatar({ person }: { person: Person }) {
  return person.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={person.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
  ) : (
    <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
      {person.displayName.charAt(0).toUpperCase()}
    </div>
  );
}

export default function AccountSidebar() {
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[] | null>(null);
  const [blocked, setBlocked] = useState<Person[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function loadFriends() {
    fetch("/api/friends")
      .then((r) => r.json())
      .then((data) => setIncomingRequests(data.incomingRequests ?? []));
  }
  function loadBlocked() {
    fetch("/api/blocks")
      .then((r) => r.json())
      .then((data) => setBlocked(Array.isArray(data) ? data : []));
  }

  useEffect(() => {
    loadFriends();
    loadBlocked();
  }, []);

  async function respond(requestId: string, action: "accept" | "decline") {
    setBusyId(requestId);
    await fetch(`/api/friends/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusyId(null);
    loadFriends();
  }

  async function unblock(userId: string) {
    setBusyId(userId);
    await fetch(`/api/blocks/${userId}`, { method: "DELETE" });
    setBusyId(null);
    loadBlocked();
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="font-semibold text-sm mb-2">Friend requests</h2>
        {!incomingRequests ? (
          <p className="text-xs text-gray-500">Loading…</p>
        ) : incomingRequests.length === 0 ? (
          <p className="text-xs text-gray-500">No pending requests.</p>
        ) : (
          <div className="space-y-2">
            {incomingRequests.map((req) => (
              <div key={req.id} className="flex items-center gap-2">
                <Avatar person={req.sender} />
                <Link
                  href={`/profile/${req.sender.username}`}
                  className="text-sm font-medium hover:underline flex-1 min-w-0 truncate"
                >
                  {req.sender.displayName}
                </Link>
                <button
                  onClick={() => respond(req.id, "accept")}
                  disabled={busyId === req.id}
                  className="text-xs bg-brand-600 text-white px-2 py-1 rounded-full hover:bg-brand-700 disabled:opacity-60"
                >
                  Accept
                </button>
                <button
                  onClick={() => respond(req.id, "decline")}
                  disabled={busyId === req.id}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Decline
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="font-semibold text-sm mb-2">Blocked users</h2>
        {!blocked ? (
          <p className="text-xs text-gray-500">Loading…</p>
        ) : blocked.length === 0 ? (
          <p className="text-xs text-gray-500">You haven't blocked anyone.</p>
        ) : (
          <div className="space-y-2">
            {blocked.map((person) => (
              <div key={person.id} className="flex items-center gap-2">
                <Avatar person={person} />
                <Link
                  href={`/profile/${person.username}`}
                  className="text-sm font-medium hover:underline flex-1 min-w-0 truncate"
                >
                  {person.displayName}
                </Link>
                <button
                  onClick={() => unblock(person.id)}
                  disabled={busyId === person.id}
                  className="text-xs text-gray-500 hover:underline flex-shrink-0"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
