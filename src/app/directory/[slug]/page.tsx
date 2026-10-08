import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  PREMIUM_FIELDS_LABEL,
  canEditListing,
  categoryFor,
  directionsUrl,
  formatPhone,
  fullAddress,
  listingShowsAll,
  parseHours,
  stateName,
  CATEGORY_SINGULAR,
} from "@/lib/directory";
import { pageMeta } from "@/lib/seo";
import DirectoryMap from "@/components/DirectoryMap";
import DirectoryHours from "@/components/DirectoryHours";
import JsonLd from "@/components/JsonLd";
import { breadcrumbs, localBusiness } from "@/lib/structuredData";

export const dynamic = "force-dynamic";

async function getListing(slug: string) {
  return db.businessListing.findUnique({
    where: { slug },
    include: { submittedBy: { select: { username: true, displayName: true } } },
  });
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const l = await getListing(params.slug);
  if (!l || l.status !== "APPROVED") return { title: "Business not found | Mompuffs", robots: { index: false } };
  const where = l.city ? `${l.city}, ${l.state}` : stateName(l.state);
  const kind = CATEGORY_SINGULAR[l.category] ?? "business";
  const licensed = l.licenseNumber ? `state-licensed ${kind}` : kind;
  const at = l.street ? ` at ${l.street}` : "";
  // Imported listings carry a generated one-liner ("Cannabis dispensary in
  // X."); only an owner-written About adds anything to the description.
  const generatedAbout = /^(state-licensed )?(cannabis dispensary|vape and smoke shop|medical marijuana doctor|recreational|medical)/i.test(l.about);
  const contact = [l.phone ? `Call ${formatPhone(l.phone)}` : null, l.website ? "visit their website" : null].filter(Boolean).join(" or ");
  const description = [
    `${l.name} is a ${licensed}${at} in ${where}.`,
    generatedAbout ? null : l.about,
    contact ? `${contact[0].toUpperCase()}${contact.slice(1)}, or get directions on the map.` : "Find it on the map.",
  ]
    .filter(Boolean)
    .join(" ");
  // Bare listings (just a name and a state) stay out of search until an
  // owner or import fills them in; licensed and claimed ones always count.
  const thin = !l.licenseNumber && !l.claimedById && !l.fullAccess && !l.street && !l.website;
  return pageMeta({
    title: `${l.name} – ${kind.replace(/^./, (c) => c.toUpperCase())} in ${where} | Mompuffs`,
    description,
    path: `/directory/${l.slug}`,
    image: l.imageUrl,
    imageAlt: l.name,
    noindex: thin,
  });
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Imported listings must credit their data sources. source is "osm",
// "overture" or "osm+overture" (OSM listing with details filled from Overture).
function SourceCredit({ source, sourceId }: { source: string; sourceId: string | null }) {
  const parts = source.split("+");
  const osmId = sourceId && /^(node|way|relation)\//.test(sourceId) ? sourceId : null;
  const credits: React.ReactNode[] = [];
  if (parts.includes("osm")) {
    credits.push(
      <span key="osm">
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="hover:underline">
          OpenStreetMap contributors
        </a>
        {osmId && (
          <>
            {" "}(
            <a href={`https://www.openstreetmap.org/${osmId}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
              source
            </a>
            )
          </>
        )}
      </span>
    );
  }
  if (parts.includes("mo-dcr")) {
    credits.push(
      <a
        key="mo-dcr"
        href={LICENSE_LOOKUP.MO}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline"
      >
        Missouri Division of Cannabis Regulation
      </a>
    );
  }
  if (parts.includes("overture")) {
    credits.push(
      <a key="overture" href="https://overturemaps.org" target="_blank" rel="noopener noreferrer" className="hover:underline">
        Overture Maps Foundation
      </a>
    );
  }
  if (credits.length === 0) return null;
  return (
    <>
      Listing info from{" "}
      {credits.map((c, i) => (
        <span key={i}>
          {i > 0 && (i === credits.length - 1 ? " and " : ", ")}
          {c}
        </span>
      ))}
      .
    </>
  );
}

// Where a visitor can confirm a state cannabis license.
const LICENSE_LOOKUP: Record<string, string> = {
  MO: "https://health.mo.gov/business-professionals/cannabis-regulation/licensee-compliance-guidance/licensed-dispensary-map",
};

function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export default async function DirectoryListingPage({ params }: { params: { slug: string } }) {
  const [l, user] = await Promise.all([getListing(params.slug), getCurrentUser()]);
  if (!l) notFound();
  const userId = (user as any)?.id as string | undefined;
  const isAdmin = Boolean((user as any)?.isAdmin);
  const canEdit = canEditListing(l, userId, isAdmin);
  // Pending/rejected listings are only visible to whoever can edit them.
  if (l.status !== "APPROVED" && !canEdit) notFound();

  const cat = categoryFor(l.category);
  // Free listings show name/category/logo/address/phone/about only.
  const showAll = listingShowsAll(l);
  const website = l.website; // free field
  const email = showAll ? l.email : null;
  const menuUrl = showAll ? l.menuUrl : null;
  const specials = showAll ? l.specials : null;
  const hours = showAll ? parseHours(l.hours) : null;
  const isOwner = Boolean(userId && l.claimedById === userId);
  const hasHiddenFields = !showAll && Boolean(l.email || l.menuUrl || l.specials || l.hours);
  const hasMap = l.lat != null && l.lng != null;

  const btn = "inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full";
  const softBtn = `${btn} bg-brand-50 text-brand-700 hover:bg-brand-100`;

  const structured =
    l.status === "APPROVED"
      ? [
          // Mirrors what this page shows: premium-only fields only when visible.
          localBusiness({ ...l, email, hours }),
          breadcrumbs([
            { name: "Home", path: "/" },
            { name: "Directory", path: "/directory" },
            { name: stateName(l.state), path: `/directory?state=${l.state}` },
            ...(cat ? [{ name: cat.name, path: `/directory?state=${l.state}&category=${cat.slug}` }] : []),
            { name: l.name },
          ]),
        ]
      : [];

  return (
    <div className="space-y-4">
      <JsonLd items={structured} />
      <nav className="text-sm flex flex-wrap items-center justify-between gap-2">
        <Link href="/directory" className="text-brand-600 hover:underline">
          ← Business Directory
        </Link>
        {canEdit && (
          <Link href={`/directory/${l.slug}/edit`} className="text-brand-600 hover:underline font-semibold">
            {isOwner ? "Manage listing" : "Edit listing"}
          </Link>
        )}
      </nav>

      {l.status !== "APPROVED" && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            l.status === "REJECTED" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800"
          }`}
        >
          {l.status === "REJECTED" ? (
            <>
              This listing wasn&apos;t approved{l.reviewNote ? `: ${l.reviewNote}` : "."} You can edit it and resubmit.
            </>
          ) : (
            <>This listing is waiting for review and isn&apos;t public yet.</>
          )}
        </div>
      )}

      {isOwner && hasHiddenFields && (
        <div className="rounded-xl px-4 py-3 text-sm bg-brand-50 text-brand-800 flex flex-wrap items-center justify-between gap-2">
          <span>Your {PREMIUM_FIELDS_LABEL} are saved but hidden from visitors on the free plan.</span>
          <Link href={`/directory/${l.slug}/edit#plan`} className="font-semibold underline">
            Upgrade to show them
          </Link>
        </div>
      )}

      <header className="bg-white rounded-xl shadow p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-6">
        <div className="w-28 h-28 sm:w-36 sm:h-36 shrink-0 rounded-xl overflow-hidden bg-brand-50 flex items-center justify-center text-5xl">
          {l.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={l.imageUrl} alt={l.name} className="w-full h-full object-cover" />
          ) : (
            cat?.icon
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {cat && (
              <Link
                href={`/directory?category=${cat.slug}`}
                className="text-xs font-bold uppercase tracking-wide hover:underline"
                style={{ color: cat.color }}
              >
                {cat.icon} {cat.name}
              </Link>
            )}
            {l.claimedById && (
              <span className="text-xs font-semibold bg-brand-100 text-brand-800 px-2 py-0.5 rounded-full">
                ✓ Owner verified
              </span>
            )}
            {l.licenseNumber && (
              <a
                href={LICENSE_LOOKUP[l.state] ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                title={`State license ${l.licenseNumber}`}
                className="text-xs font-semibold bg-green-100 text-green-800 px-2 py-0.5 rounded-full hover:bg-green-200"
              >
                ✓ Licensed by the State of {stateName(l.state)} · {l.licenseNumber}
              </a>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight mt-1 break-words">{l.name}</h1>
          <p className="text-gray-600 mt-1">{fullAddress(l)}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {menuUrl && (
              <a
                href={menuUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className={`${btn} bg-brand-600 text-white hover:bg-brand-700`}
              >
                📋 View menu
              </a>
            )}
            {l.street && (
              <a href={directionsUrl(l)} target="_blank" rel="noopener noreferrer" className={softBtn}>
                🧭 Directions
              </a>
            )}
            {l.phone && (
              <a href={telHref(l.phone)} className={softBtn}>
                📞 Call
              </a>
            )}
            {website && (
              <a href={website} target="_blank" rel="noopener noreferrer nofollow" className={softBtn}>
                🌐 Website
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className={softBtn}>
                ✉️ Email
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4 min-w-0">
          {specials && (
            <section className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-5">
              <h2 className="font-bold text-amber-900 mb-1">🏷️ Specials</h2>
              <p className="text-sm text-amber-900 whitespace-pre-line break-words">{specials}</p>
            </section>
          )}
          <section className="bg-white rounded-xl shadow p-4 sm:p-5">
            <h2 className="font-bold text-lg mb-2">About</h2>
            <p className="text-gray-700 whitespace-pre-line break-words">{l.about}</p>
          </section>
          {hasMap && (
            <section className="bg-white rounded-xl shadow p-4 sm:p-5">
              <h2 className="font-bold text-lg mb-3">Location</h2>
              <DirectoryMap
                mode="single"
                points={[
                  { id: l.id, slug: l.slug, name: l.name, category: l.category, lat: l.lat!, lng: l.lng!, city: l.city, state: l.state },
                ]}
                className="h-64 sm:h-80"
              />
              <p className="text-sm text-gray-600 mt-3">
                {fullAddress(l)} ·{" "}
                <a href={directionsUrl(l)} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                  Get directions
                </a>
              </p>
            </section>
          )}
        </div>

        <aside className="space-y-4 min-w-0">
          {hours && (
            <section className="bg-white rounded-xl shadow p-4 sm:p-5">
              <h2 className="font-bold text-lg mb-2">Hours</h2>
              <DirectoryHours hours={hours} />
            </section>
          )}
          <section className="bg-white rounded-xl shadow p-4 sm:p-5 text-sm space-y-2">
            <h2 className="font-bold text-lg">Contact</h2>
            <p className="text-gray-700">{fullAddress(l)}</p>
            {l.phone && (
              <p>
                <a href={telHref(l.phone)} className="text-brand-600 hover:underline">
                  {formatPhone(l.phone)}
                </a>
              </p>
            )}
            {email && (
              <p className="truncate">
                <a href={`mailto:${email}`} className="text-brand-600 hover:underline">
                  {email}
                </a>
              </p>
            )}
            {website && (
              <p className="truncate">
                <a href={website} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-600 hover:underline">
                  {hostOf(website)}
                </a>
              </p>
            )}
            {menuUrl && (
              <p>
                <a href={menuUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-600 hover:underline">
                  View menu
                </a>
              </p>
            )}
          </section>

          {!l.claimedById && l.status === "APPROVED" && (
            <section className="bg-white rounded-xl shadow p-4 sm:p-5 text-sm">
              <h2 className="font-bold text-lg mb-1">Is this your business?</h2>
              <p className="text-gray-600 mb-3">Claim it for free to update the details and add more about what you offer.</p>
              <Link
                href={`/directory/${l.slug}/claim`}
                className="inline-block bg-brand-600 text-white font-semibold px-4 py-2 rounded-full hover:bg-brand-700"
              >
                Claim this listing
              </Link>
            </section>
          )}

          <p className="text-xs text-gray-400 px-1">
            {l.source ? (
              <>
                <SourceCredit source={l.source} sourceId={l.sourceId} />{" "}
              </>
            ) : !l.claimedById && (
              <>
                Submitted by{" "}
                {/* Member names are members-only. */}
                {user ? (
                  <Link href={`/profile/${l.submittedBy.username}`} className="hover:underline">
                    {l.submittedBy.displayName}
                  </Link>
                ) : (
                  "a Mompuffs member"
                )}
                .{" "}
              </>
            )}
            See something wrong?{" "}
            <Link href="/contact" className="hover:underline">
              Let us know
            </Link>
            .
          </p>
        </aside>
      </div>
    </div>
  );
}
