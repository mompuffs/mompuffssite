"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteListingButton({
  id,
  name,
  redirectTo = "/directory/mine",
  compact = false,
}: {
  id: string;
  name: string;
  redirectTo?: string | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${name}" from the directory? Any PayPal subscription for it is cancelled too. This can't be undone.`)) return;
    setBusy(true);
    const res = await fetch(`/api/directory/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Something went wrong.");
      return;
    }
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={busy}
      className={compact ? "text-xs text-red-600 hover:underline disabled:opacity-40" : "text-sm text-red-600 hover:underline disabled:opacity-40"}
    >
      {busy ? "Deleting…" : compact ? "Delete" : "Delete this listing"}
    </button>
  );
}
