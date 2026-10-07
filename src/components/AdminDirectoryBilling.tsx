"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminDirectoryBilling({
  ready,
  reason,
  environment,
  shopSlug,
  activeSubscriptions,
}: {
  ready: boolean;
  reason: string | null;
  environment: string | null;
  shopSlug: string;
  activeSubscriptions: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsShopPayPal = !ready && reason?.includes("hasn't connected PayPal");

  async function setUp() {
    if (!confirm("Create the Directory Premium plans ($5/month and $50/year) in the MomPuffs shop's PayPal account?")) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/directory/billing", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Setup failed.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="bg-white rounded-xl shadow p-4 mb-5 text-sm">
      <p className="font-semibold mb-1">Premium billing (PayPal)</p>
      {ready ? (
        <p className="text-gray-600">
          <span className="text-green-700 font-semibold">Ready</span> ({environment}) · billed to the &quot;{shopSlug}&quot; shop&apos;s PayPal ·{" "}
          {activeSubscriptions} active subscription{activeSubscriptions === 1 ? "" : "s"}
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-amber-700">{reason}</p>
          {needsShopPayPal ? (
            <p className="text-gray-600">Connect PayPal in that shop&apos;s Payments settings first.</p>
          ) : (
            <button
              type="button"
              onClick={setUp}
              disabled={busy}
              className="bg-brand-700 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-brand-800 disabled:opacity-50"
            >
              {busy ? "Setting up…" : "Set up PayPal plans"}
            </button>
          )}
        </div>
      )}
      {error && <p className="text-red-600 mt-2 break-words">{error}</p>}
    </div>
  );
}
