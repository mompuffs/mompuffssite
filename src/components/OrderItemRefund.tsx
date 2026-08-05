"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// status is "PENDING" | "APPROVED" | "DENIED" -- kept as plain string since
// the Prisma model stores it unenforced (see prisma/schema.prisma), same as
// every other status-ish field in this codebase.
type RefundRequest = {
  id: string;
  status: string;
  reason: string;
  responseNote: string | null;
};

export default function OrderItemRefund({
  orderItemId,
  latestRequest,
}: {
  orderItemId: string;
  latestRequest: RefundRequest | null;
}) {
  const router = useRouter();
  const [requesting, setRequesting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!reason.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/order-items/${orderItemId}/refund-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not submit that request.");
      return;
    }
    setRequesting(false);
    setReason("");
    router.refresh();
  }

  if (latestRequest && latestRequest.status !== "DENIED") {
    return (
      <div className="mt-1">
        <span
          className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
            latestRequest.status === "PENDING" ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
          }`}
        >
          {latestRequest.status === "PENDING" ? "Refund requested" : "Refund approved"}
        </span>
        {latestRequest.responseNote && (
          <p className="text-xs text-gray-500 mt-1">Seller note: {latestRequest.responseNote}</p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-1">
      {latestRequest?.status === "DENIED" && (
        <p className="text-xs text-gray-500 mb-1">
          Previous refund request was denied.
          {latestRequest.responseNote ? ` Seller note: ${latestRequest.responseNote}` : ""}
        </p>
      )}
      {!requesting ? (
        <button onClick={() => setRequesting(true)} className="text-xs text-brand-600 hover:underline">
          {latestRequest?.status === "DENIED" ? "Request refund again" : "Request a refund"}
        </button>
      ) : (
        <div className="space-y-1.5 max-w-sm">
          <textarea
            autoFocus
            placeholder="Why are you requesting a refund?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="w-full border rounded px-2 py-1.5 text-xs resize-none"
          />
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={saving || !reason.trim()}
              className="bg-brand-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? "Submitting…" : "Submit request"}
            </button>
            <button
              onClick={() => {
                setRequesting(false);
                setError(null);
              }}
              className="text-gray-500 text-xs hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
