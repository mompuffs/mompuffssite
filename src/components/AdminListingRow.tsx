"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { categoryFor } from "@/lib/directory";
import DeleteListingButton from "@/components/DeleteListingButton";

type AdminListing = {
  id: string;
  slug: string;
  name: string;
  category: string;
  address: string;
  phone: string | null;
  website: string | null;
  menuUrl: string | null;
  about: string;
  specials: string | null;
  status: string;
  reviewNote: string | null;
  updatedAt: string;
  submittedBy: { username: string; displayName: string };
  claimedBy: { username: string; displayName: string } | null;
  fullAccess: boolean;
  plan: string | null;
  subscriptionStatus: string | null;
  premiumUntil: string | null;
};

export default function AdminListingRow({ listing: l }: { listing: AdminListing }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const cat = categoryFor(l.category);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    const res = await fetch(`/api/admin/directory/${l.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      alert(data.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
  }

  function unclaim() {
    const sub = ["ACTIVE", "APPROVED", "SUSPENDED"].includes(l.subscriptionStatus ?? "") ? " Their PayPal subscription will be cancelled." : "";
    if (!confirm(`Remove ${l.claimedBy?.displayName}'s claim on "${l.name}"?${sub}`)) return;
    patch({ unclaim: true });
  }

  function stopSubscription() {
    if (!confirm(`Stop the PayPal subscription for "${l.name}"? They won't be charged again. Premium details stay up until the end of what they've already paid for.`)) return;
    patch({ cancelSubscription: true });
  }

  const subscribed = ["ACTIVE", "APPROVED", "SUSPENDED"].includes(l.subscriptionStatus ?? "");
  const paidUntil = l.premiumUntil && new Date(l.premiumUntil) > new Date() ? new Date(l.premiumUntil) : null;
  const tier = l.fullAccess
    ? "Full access"
    : paidUntil
      ? `Premium (${l.plan === "YEARLY" ? "yearly" : "monthly"}${subscribed ? "" : ", cancelled"}) until ${paidUntil.toLocaleDateString()}`
      : "Free";

  async function setStatus(status: string) {
    let reviewNote: string | null = null;
    if (status === "REJECTED") {
      reviewNote = prompt("Optional note to the submitter (why it wasn't approved):", "");
      if (reviewNote === null) return;
    }
    setBusy(true);
    const res = await fetch(`/api/admin/directory/${l.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reviewNote }),
    });
    setBusy(false);
    if (!res.ok) {
      alert("Something went wrong.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: cat?.color }}>
            {cat?.icon} {cat?.name ?? l.category}
          </p>
          <Link href={`/directory/${l.slug}`} className="font-bold hover:underline">
            {l.name}
          </Link>
          <p className="text-sm text-gray-500">{l.address}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            by{" "}
            <Link href={`/profile/${l.submittedBy.username}`} className="hover:underline">
              {l.submittedBy.displayName}
            </Link>{" "}
            · updated {new Date(l.updatedAt).toLocaleDateString()}
          </p>
          <p className="text-xs mt-0.5">
            <span className={`font-semibold ${tier === "Free" ? "text-gray-500" : "text-green-700"}`}>{tier}</span>
            {l.claimedBy && (
              <>
                {" "}· claimed by{" "}
                <Link href={`/profile/${l.claimedBy.username}`} className="hover:underline font-semibold">
                  {l.claimedBy.displayName}
                </Link>{" "}
                <button onClick={unclaim} disabled={busy} className="text-red-600 hover:underline disabled:opacity-40">
                  (remove claim)
                </button>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {l.status !== "APPROVED" && (
            <button
              onClick={() => setStatus("APPROVED")}
              disabled={busy}
              className="text-sm font-semibold bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-40"
            >
              Approve
            </button>
          )}
          {l.status !== "REJECTED" && (
            <button
              onClick={() => setStatus("REJECTED")}
              disabled={busy}
              className="text-sm font-semibold bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40"
            >
              {l.status === "APPROVED" ? "Unpublish" : "Reject"}
            </button>
          )}
          {subscribed && (
            <button
              onClick={stopSubscription}
              disabled={busy}
              className="text-sm font-semibold text-red-600 hover:underline disabled:opacity-40"
            >
              Stop subscription
            </button>
          )}
          <button
            onClick={() => patch({ fullAccess: !l.fullAccess })}
            disabled={busy}
            title="Show every field publicly without a paid plan"
            className="text-sm text-brand-600 hover:underline disabled:opacity-40"
          >
            {l.fullAccess ? "Remove full access" : "Give full access"}
          </button>
          <Link href={`/directory/${l.slug}/edit`} className="text-sm text-brand-600 hover:underline">
            Edit
          </Link>
          <DeleteListingButton id={l.id} name={l.name} redirectTo={null} compact />
        </div>
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-brand-600">Details</summary>
        <div className="mt-2 space-y-1 text-gray-700">
          <p className="whitespace-pre-line break-words">{l.about}</p>
          {l.specials && <p className="whitespace-pre-line break-words">Specials: {l.specials}</p>}
          {l.phone && <p>Phone: {l.phone}</p>}
          {l.website && <p className="break-all">Website: {l.website}</p>}
          {l.menuUrl && <p className="break-all">Menu: {l.menuUrl}</p>}
          {l.reviewNote && <p className="text-red-700">Note sent: {l.reviewNote}</p>}
        </div>
      </details>
    </div>
  );
}
