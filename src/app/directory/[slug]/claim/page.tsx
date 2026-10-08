import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { DIRECTORY_PRICES, categoryFor, fullAddress } from "@/lib/directory";
import ClaimListingButton from "@/components/ClaimListingButton";
import { privateMeta } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = privateMeta("Claim your listing");

const FREE = ["Business name and category", "Logo or photo", "Address and map pin", "Phone number", "Website link", "About your business"];
const PREMIUM = ["Everything in Free", "Email address", "Hours", "Specials and deals", "Link to your menu"];

export default async function ClaimListingPage({ params }: { params: { slug: string } }) {
  const [l, user] = await Promise.all([
    db.businessListing.findUnique({
      where: { slug: params.slug },
      select: { id: true, slug: true, name: true, category: true, street: true, city: true, state: true, zip: true, status: true, claimedById: true },
    }),
    getCurrentUser(),
  ]);
  if (!l || l.status !== "APPROVED") notFound();
  const cat = categoryFor(l.category);
  const mine = Boolean(user && l.claimedById === (user as any).id);

  return (
    <div className="max-w-3xl space-y-4">
      <Link href={`/directory/${l.slug}`} className="text-sm text-brand-600 hover:underline">
        ← Back to listing
      </Link>

      <div className="bg-white rounded-xl shadow p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: cat?.color }}>
          {cat?.icon} {cat?.name}
        </p>
        <h1 className="text-2xl font-bold mt-1">Claim {l.name}</h1>
        <p className="text-gray-600">{fullAddress(l)}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <section className="bg-white rounded-xl shadow p-5">
          <h2 className="font-bold text-lg">Free</h2>
          <p className="text-2xl font-bold text-brand-800 my-1">$0</p>
          <ul className="text-sm text-gray-700 space-y-1 mt-2">
            {FREE.map((f) => (
              <li key={f}>✓ {f}</li>
            ))}
          </ul>
        </section>
        <section className="bg-white rounded-xl shadow p-5 border-2 border-brand-400">
          <h2 className="font-bold text-lg">Premium</h2>
          <p className="text-2xl font-bold text-brand-800 my-1">
            {DIRECTORY_PRICES.MONTHLY.display.replace("/", " / ")}
          </p>
          <p className="text-sm text-gray-500">or {DIRECTORY_PRICES.YEARLY.display} (save $10)</p>
          <ul className="text-sm text-gray-700 space-y-1 mt-2">
            {PREMIUM.map((f) => (
              <li key={f}>✓ {f}</li>
            ))}
          </ul>
          <p className="text-xs text-gray-500 mt-3">
            Billed automatically through PayPal. We email you a week before each charge, and you can cancel anytime.
          </p>
        </section>
      </div>

      <section className="bg-white rounded-xl shadow p-5">
        {mine ? (
          <p className="text-sm">
            You manage this listing.{" "}
            <Link href={`/directory/${l.slug}/edit`} className="text-brand-600 font-semibold hover:underline">
              Go to your listing settings
            </Link>
          </p>
        ) : l.claimedById ? (
          <p className="text-sm text-gray-600">
            This listing has already been claimed. If you think that&apos;s a mistake,{" "}
            <Link href="/contact" className="text-brand-600 hover:underline">
              contact us
            </Link>
            .
          </p>
        ) : user ? (
          <>
            <p className="text-sm text-gray-600 mb-3">
              Claiming is free. Afterwards you can update the listing and upgrade to Premium whenever you like.
            </p>
            <ClaimListingButton listingId={l.id} slug={l.slug} />
          </>
        ) : (
          <div className="text-sm">
            <p className="mb-3">Log in or create a free MomPuffs account to claim this listing.</p>
            <div className="flex gap-2">
              <Link href="/login" className="bg-brand-600 text-white font-semibold px-4 py-2 rounded-full hover:bg-brand-700">
                Log in
              </Link>
              <Link href="/register" className="text-brand-700 font-semibold px-4 py-2 rounded-full hover:bg-brand-50">
                Sign up
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
