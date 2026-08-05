"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { HEARTBEAT_INTERVAL_MS } from "@/lib/presence";

// Invisible -- just pings the server periodically while signed in so
// lastActiveAt stays fresh, which is what "Friends Online" is computed from.
export default function PresenceHeartbeat() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;

    function beat() {
      fetch("/api/presence/heartbeat", { method: "POST" }).catch(() => {});
    }

    beat();
    const interval = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [status]);

  return null;
}
