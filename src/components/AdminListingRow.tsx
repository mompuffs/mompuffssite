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
};

export default function AdminListingRow({ listing: l }: { listing: AdminListing }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const cat = categoryFor(l.category);

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
