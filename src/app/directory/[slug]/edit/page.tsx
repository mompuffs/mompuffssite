import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { canEditListing, listingShowsAll } from "@/lib/directory";
import { getBillingConfig } from "@/lib/directoryBilling";
import DirectoryListingForm from "@/components/DirectoryListingForm";
import DirectoryPlanPanel from "@/components/DirectoryPlanPanel";
import DeleteListingButton from "@/components/DeleteListingButton";
import { privateMeta } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = privateMeta("Edit listing");

export default async function EditBusinessPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { claimed?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const l = await db.businessListing.findUnique({ where: { slug: params.slug } });
  if (!l) notFound();
  const userId = (user as any).id as string;
  const isAdmin = Boolean((user as any).isAdmin);
  if (!canEditListing(l, userId, isAdmin)) notFound();
  const isOwner = l.claimedById === userId;

  const billing = isOwner ? await getBillingConfig() : null;

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <Link href={`/directory/${l.slug}`} className="text-sm text-brand-600 hover:underline">
          ← Back to listing
        </Link>
        <h1 className="text-2xl font-bold mt-2">{isOwner ? `Manage ${l.name}` : `Edit ${l.name}`}</h1>
      </div>

      {searchParams.claimed && (
        <p className="bg-green-50 text-green-800 text-sm rounded-xl px-4 py-3">
          You&apos;ve claimed this listing! Update anything below. Changes go live as soon as you save.
        </p>
      )}

      {isOwner && (
        <DirectoryPlanPanel
          listingId={l.id}
          fullAccess={l.fullAccess}
          plan={l.plan}
          subscriptionStatus={l.subscriptionStatus}
          nextBillingAt={l.nextBillingAt?.toISOString() ?? null}
          premiumUntil={l.premiumUntil?.toISOString() ?? null}
          billing={billing?.ready ? { clientId: billing.clientId, plans: billing.plans } : null}
        />
      )}

      <DirectoryListingForm
        listingId={l.id}
        isAdmin={isAdmin}
        isOwner={isOwner}
        showsAll={isAdmin || listingShowsAll(l)}
        initial={{
          name: l.name,
          category: l.category,
          street: l.street ?? "",
          city: l.city ?? "",
          state: l.state,
          zip: l.zip ?? "",
          phone: l.phone ?? "",
          email: l.email ?? "",
          website: l.website ?? "",
          menuUrl: l.menuUrl ?? "",
          imageUrl: l.imageUrl ?? "",
          about: l.about,
          specials: l.specials ?? "",
          hours: (l.hours as Record<string, any> | null) ?? null,
        }}
      />
      <div className="pt-4 border-t">
        <DeleteListingButton id={l.id} name={l.name} />
      </div>
    </div>
  );
}
