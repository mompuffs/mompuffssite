// Someone counts as "online" if their last heartbeat was within this window.
// The client heartbeat fires every HEARTBEAT_INTERVAL_MS while the app is
// open in a tab; the threshold needs enough slack over that interval to
// tolerate a missed beat (tab backgrounded/throttled, brief network blip)
// without flickering someone's status on and off.
export const HEARTBEAT_INTERVAL_MS = 60_000;
export const ONLINE_THRESHOLD_MS = 5 * 60_000;

export function onlineSinceThreshold(): Date {
  return new Date(Date.now() - ONLINE_THRESHOLD_MS);
}
