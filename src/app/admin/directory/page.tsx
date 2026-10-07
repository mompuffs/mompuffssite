import Link from "next/link";
import { db } from "@/lib/db";
import AdminListingRow from "@/components/AdminListingRow";
import AdminDirectoryBilling from "@/components/AdminDirectoryBilling";
import { fullAddress } from "@/lib/directory";
import { BILLING_SHOP_SLUG, getBillingConfig } from "@/lib/directoryBilling";

export const dynamic = "force-dynamic";

const TABS = [
  { status: "PENDING", label: "Waiting for review" },
  { status: "APPROVED", label: "Live" },
  { status: "REJECTED", label: "Not approved" },
];

export default async function AdminDirectoryPage({ searchParams }: { searchParams: { status?: string } }) {
  const status = TABS.some((t) => t.status === searchParams.status) ? searchParams.status! : "PENDING";

  const [counts, listings, billing, premiumCount] = await Promise.all([
    db.businessListing.groupBy({ by: ["status"], _count: { _all: true } }),
    db.businessListing.findMany({
      where: { status },
      orderBy: { updatedAt: status === "PENDING" ? "asc" : "desc" },
      take: 200,
      include: {
        submittedBy: { select: { username: true, displayName: true } },
        claimedBy: { select: { username: true, displayName: true } },
      },
    }),
    getBillingConfig(),
    db.businessListing.count({ where: { subscriptionStatus: "ACTIVE" } }),
  ]);
  const countFor = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2 mb-1">
        <h1 className="text-2xl font-bold text-brand-900">Business Directory</h1>
        <Link href="/directory/submit" className="text-sm font-semibold text-brand-700 hover:underline">
          + Add a business
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Member submissions wait here until approved, and so does an unclaimed listing&apos;s edit. Claimed owners&apos; edits go
        live directly. Member-added listings show only free fields unless the owner pays or you turn on Full access.
      </p>

      <AdminDirectoryBilling
        ready={billing.ready}
        reason={billing.ready ? null : billing.reason}
        environment={billing.ready ? billing.environment : null}
        shopSlug={BILLING_SHOP_SLUG}
        activeSubscriptions={premiumCount}
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map((t) => (
          <Link
            key={t.status}
            href={`/admin/directory?status=${t.status}`}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
              status === t.status ? "bg-brand-700 text-white" : "bg-white text-gray-700 hover:bg-brand-50"
            }`}
          >
            {t.label} ({countFor(t.status)})
          </Link>
        ))}
      </div>

      {listings.length === 0 ? (
        <p className="bg-white rounded-xl shadow p-5 text-sm text-gray-500">Nothing here.</p>
      ) : (
        <div className="space-y-3">
          {listings.map((l) => (
            <AdminListingRow
              key={l.id}
              listing={{
                id: l.id,
                slug: l.slug,
                name: l.name,
                category: l.category,
                address: fullAddress(l),
                phone: l.phone,
                website: l.website,
                menuUrl: l.menuUrl,
                about: l.about,
                specials: l.specials,
                status: l.status,
                reviewNote: l.reviewNote,
                updatedAt: l.updatedAt.toISOString(),
                submittedBy: l.submittedBy,
                claimedBy: l.claimedBy,
                fullAccess: l.fullAccess,
                plan: l.plan,
                subscriptionStatus: l.subscriptionStatus,
                premiumUntil: l.premiumUntil?.toISOString() ?? null,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
