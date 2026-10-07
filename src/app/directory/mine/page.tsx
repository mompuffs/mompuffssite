import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { categoryFor } from "@/lib/directory";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My directory submissions | Mompuffs" };

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  APPROVED: { label: "Live", cls: "bg-green-100 text-green-800" },
  PENDING: { label: "Waiting for review", cls: "bg-amber-100 text-amber-800" },
  REJECTED: { label: "Not approved", cls: "bg-red-100 text-red-800" },
};

export default async function MySubmissionsPage({ searchParams }: { searchParams: { submitted?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const listings = await db.businessListing.findMany({
    where: { submittedById: (user as any).id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, slug: true, name: true, category: true, city: true, state: true, status: true, reviewNote: true },
  });

  return (
    <div className="max-w-3xl">
      <Link href="/directory" className="text-sm text-brand-600 hover:underline">
        ← Business Directory
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-2 mt-2 mb-4">
        <h1 className="text-2xl font-bold">My submissions</h1>
        <Link href="/directory/submit" className="text-sm font-semibold bg-brand-600 text-white px-4 py-2 rounded-full hover:bg-brand-700">
          + Submit a business
        </Link>
      </div>

      {searchParams.submitted && (
        <p className="bg-green-50 text-green-800 text-sm rounded-xl px-4 py-3 mb-4">
          Thanks! Your listing was sent for review. It&apos;ll show in the directory once it&apos;s approved.
        </p>
      )}

      {listings.length === 0 ? (
        <p className="bg-white rounded-xl shadow p-6 text-sm text-gray-500">You haven&apos;t submitted any businesses yet.</p>
      ) : (
        <div className="bg-white rounded-xl shadow divide-y">
          {listings.map((l) => {
            const st = STATUS_STYLE[l.status] ?? STATUS_STYLE.PENDING;
            return (
              <div key={l.id} className="p-4 flex flex-wrap items-center gap-3">
                <span className="text-2xl">{categoryFor(l.category)?.icon}</span>
                <div className="min-w-0 flex-1">
                  <Link href={`/directory/${l.slug}`} className="font-semibold hover:underline">
                    {l.name}
                  </Link>
                  <p className="text-sm text-gray-500">
                    {l.city}, {l.state}
                  </p>
                  {l.status === "REJECTED" && l.reviewNote && <p className="text-sm text-red-700 mt-1">Note: {l.reviewNote}</p>}
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${st.cls}`}>{st.label}</span>
                <Link href={`/directory/${l.slug}/edit`} className="text-sm text-brand-600 hover:underline">
                  Edit
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
