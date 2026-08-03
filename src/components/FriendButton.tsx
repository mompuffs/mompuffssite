"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type FriendState = "NONE" | "OUTGOING" | "INCOMING" | "FRIENDS";

export default function FriendButton({
  targetUserId,
  initialState,
  initialRequestId,
}: {
  targetUserId: string;
  initialState: FriendState;
  initialRequestId: string | null;
}) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [requestId, setRequestId] = useState(initialRequestId);
  const [loading, setLoading] = useState(false);

  async function sendRequest() {
    setLoading(true);
    const res = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setRequestId(data.id);
      setState("OUTGOING");
    }
    router.refresh();
  }

  async function cancelOrUnfriend() {
    if (!requestId) return;
    setLoading(true);
    await fetch(`/api/friends/${requestId}`, { method: "DELETE" });
    setLoading(false);
    setState("NONE");
    setRequestId(null);
    router.refresh();
  }

  async function respond(action: "accept" | "decline") {
    if (!requestId) return;
    setLoading(true);
    await fetch(`/api/friends/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setLoading(false);
    setState(action === "accept" ? "FRIENDS" : "NONE");
    if (action === "decline") setRequestId(null);
    router.refresh();
  }

  if (state === "FRIENDS") {
    return (
      <button
        onClick={cancelOrUnfriend}
        disabled={loading}
        className="px-4 py-1.5 rounded-full text-sm font-medium border border-gray-300 hover:bg-gray-50"
      >
        Friends
      </button>
    );
  }

  if (state === "OUTGOING") {
    return (
      <button
        onClick={cancelOrUnfriend}
        disabled={loading}
        className="px-4 py-1.5 rounded-full text-sm font-medium border border-gray-300 hover:bg-gray-50"
      >
        Requested
      </button>
    );
  }

  if (state === "INCOMING") {
    return (
      <div className="flex gap-1.5">
        <button
          onClick={() => respond("accept")}
          disabled={loading}
          className="px-3 py-1.5 rounded-full text-sm font-medium bg-brand-600 text-white hover:bg-brand-700"
        >
          Accept
        </button>
        <button
          onClick={() => respond("decline")}
          disabled={loading}
          className="px-3 py-1.5 rounded-full text-sm font-medium border border-gray-300 hover:bg-gray-50"
        >
          Decline
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={sendRequest}
      disabled={loading}
      className="px-4 py-1.5 rounded-full text-sm font-medium bg-brand-600 text-white hover:bg-brand-700"
    >
      + Add Friend
    </button>
  );
}
