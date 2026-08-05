"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCents } from "@/lib/money";

type RefundRequest = {
  id: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "DENIED";
  responseNote: string | null;
  createdAt: string;
  respondedAt: string | null;
  orderItem: {
    id: string;
    orderId: string;
    quantity: number;
    unitPriceCents: number;
    variantLabel: string | null;
    product: { title: string };
    order: { buyer: { username: string; displayName: string; email: string } };
  };
};

export default function RefundsPage() {
  const [requests, setRequests] = useState<RefundRequest[] | null>(null);
  const [filter, setFilter] = useState<"pending" | "resolved" | "all">("pending");
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    fetch("/api/shop/refund-requests")
      .then((r) => r.json())
      .then(setRequests);
  }

  useEffect(load, []);

  async function respond(id: string, status: "APPROVED" | "DENIED") {
    setSaving(true);
    await fetch(`/api/shop/refund-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, responseNote: note }),
    });
    setSaving(false);
    setRespondingId(null);
    setNote("");
    load();
  }

  const visible = (requests ?? []).filter((r) => {
    if (filter === "pending") return r.status === "PENDING";
    if (filter === "resolved") return r.status !== "PENDING";
    return true;
  });

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">Refund requests</h1>
        <Link href="/dashboard/shop" className="text-sm text-brand-600 hover:underline">
          ← Back to shop
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Approving or denying a request only updates its status and lets the buyer know -- it doesn't move any
        money. Issue the actual refund from your own Stripe or PayPal dashboard.
      </p>

      <div className="flex gap-1 mb-4 text-sm">
        {(["pending", "resolved", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full border ${
              filter === f ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f === "pending" ? "Pending" : f === "resolved" ? "Resolved" : "All"}
          </button>
        ))}
      </div>

      {!requests ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-gray-500">No {filter === "all" ? "" : filter} refund requests.</p>
      ) : (
        <div className="space-y-3">
          {visible.map((r) => (
            <div key={r.id} className="bg-white rounded-xl shadow p-4">
              <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                <span>{new Date(r.createdAt).toLocaleString()}</span>
                <span
                  className={`font-medium px-2 py-0.5 rounded-full text-xs ${
                    r.status === "PENDING"
                      ? "bg-amber-100 text-amber-800"
                      : r.status === "APPROVED"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {r.status === "PENDING" ? "Pending" : r.status === "APPROVED" ? "Approved" : "Denied"}
                </span>
              </div>

              <p className="text-sm mb-1">
                <span className="font-medium">
                  {r.orderItem.product.title}
                  {r.orderItem.variantLabel ? ` (${r.orderItem.variantLabel})` : ""} × {r.orderItem.quantity}
                </span>{" "}
                <span className="text-gray-500">{formatCents(r.orderItem.unitPriceCents * r.orderItem.quantity)}</span>
              </p>
              <p className="text-xs text-gray-500 mb-2">
                {r.orderItem.order.buyer.displayName} (@{r.orderItem.order.buyer.username} ·{" "}
                {r.orderItem.order.buyer.email})
              </p>

              <div className="text-sm bg-gray-50 border rounded p-2 mb-2">
                <p className="font-medium text-gray-700 text-xs mb-0.5">Buyer's reason</p>
                <p className="whitespace-pre-wrap">{r.reason}</p>
              </div>

              {r.responseNote && (
                <div className="text-sm bg-gray-50 border rounded p-2 mb-2">
                  <p className="font-medium text-gray-700 text-xs mb-0.5">Your note</p>
                  <p className="whitespace-pre-wrap">{r.responseNote}</p>
                </div>
              )}

              {r.status === "PENDING" && (
                <>
                  {respondingId === r.id ? (
                    <div className="space-y-2">
                      <textarea
                        placeholder="Optional note to the buyer (e.g. refund reference, timeline)"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        className="w-full border rounded px-2 py-1.5 text-sm resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => respond(r.id, "APPROVED")}
                          disabled={saving}
                          className="bg-brand-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-brand-700 disabled:opacity-60"
                        >
                          {saving ? "Saving…" : "Approve"}
                        </button>
                        <button
                          onClick={() => respond(r.id, "DENIED")}
                          disabled={saving}
                          className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded text-xs font-medium hover:bg-gray-200 disabled:opacity-60"
                        >
                          {saving ? "Saving…" : "Deny"}
                        </button>
                        <button
                          onClick={() => {
                            setRespondingId(null);
                            setNote("");
                          }}
                          className="text-gray-500 text-xs hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRespondingId(r.id)}
                      className="text-brand-600 text-xs font-medium hover:underline"
                    >
                      Respond →
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
