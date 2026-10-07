"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ClaimListingButton({ listingId, slug }: { listingId: string; slug: string }) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/directory/${listingId}/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    router.push(`/directory/${slug}/edit?claimed=1`);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <label className="flex items-start gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-1 accent-brand-600"
        />
        <span>I own this business or I&apos;m authorized to manage its listing.</span>
      </label>
      <button
        type="button"
        onClick={claim}
        disabled={!confirmed || busy}
        className="bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-full hover:bg-brand-700 disabled:opacity-50"
      >
        {busy ? "Claiming…" : "Claim this listing"}
      </button>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
