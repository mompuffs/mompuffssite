import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { categoryFor, directionsUrl, formatPhone, fullAddress, parseHours } from "@/lib/directory";
import DirectoryMap from "@/components/DirectoryMap";
import DirectoryHours from "@/components/DirectoryHours";

export const dynamic = "force-dynamic";

async function getListing(slug: string) {
  return db.businessListing.findUnique({
    where: { slug },
    include: { submittedBy: { select: { username: true, displayName: true } } },
  });
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const l = await getListing(params.slug);
  if (!l || l.status !== "APPROVED") return { title: "Business not found | Mompuffs" };
  const cat = categoryFor(l.category);
  return {
    title: `${l.name} – ${l.city}, ${l.state} | Mompuffs Directory`,
    description: `${cat?.name ?? "Business"} at ${fullAddress(l)}. ${l.about.slice(0, 140)}`,
    openGraph: { images: l.imageUrl ? [{ url: l.imageUrl }] : undefined },
  };
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export default async function DirectoryListingPage({ params }: { params: { slug: string } }) {
  const [l, user] = await Promise.all([getListing(params.slug), getCurrentUser()]);
  if (!l) notFound();
  const isAdmin = Boolean((user as any)?.isAdmin);
  const canEdit = isAdmin || (user && (user as any).id === l.submittedById);
  // Pending/rejected listings are only visible to their submitter and admins.
  if (l.status !== "APPROVED" && !canEdit) notFound();

  const cat = categoryFor(l.category);
  const hours = parseHours(l.hours);
  const btn = "inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full";
  const softBtn = `${btn} bg-brand-50 text-brand-700 hover:bg-brand-100`;

  return (
    <div className="space-y-4">
      <nav className="text-sm flex flex-wrap items-center justify-between gap-2">
        <Link href="/directory" className="text-brand-600 hover:underline">
          ← Business Directory
        </Link>
        {canEdit && (
          <Link href={`/directory/${l.slug}/edit`} className="text-brand-600 hover:underline font-semibold">
            Edit listing
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
          {cat && (
            <Link
              href={`/directory?category=${cat.slug}`}
              className="text-xs font-bold uppercase tracking-wide hover:underline"
              style={{ color: cat.color }}
            >
              {cat.icon} {cat.name}
            </Link>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight mt-1 break-words">{l.name}</h1>
          <p className="text-gray-600 mt-1">{fullAddress(l)}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {l.menuUrl && (
              <a
                href={l.menuUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className={`${btn} bg-brand-600 text-white hover:bg-brand-700`}
              >
                📋 View menu
              </a>
            )}
            <a href={directionsUrl(l)} target="_blank" rel="noopener noreferrer" className={softBtn}>
              🧭 Directions
            </a>
            {l.phone && (
              <a href={telHref(l.phone)} className={softBtn}>
                📞 Call
              </a>
            )}
            {l.website && (
              <a href={l.website} target="_blank" rel="noopener noreferrer nofollow" className={softBtn}>
                🌐 Website
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4 min-w-0">
          {l.specials && (
            <section className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-5">
              <h2 className="font-bold text-amber-900 mb-1">🏷️ Specials</h2>
              <p className="text-sm text-amber-900 whitespace-pre-line break-words">{l.specials}</p>
            </section>
          )}
          <section className="bg-white rounded-xl shadow p-4 sm:p-5">
            <h2 className="font-bold text-lg mb-2">About</h2>
            <p className="text-gray-700 whitespace-pre-line break-words">{l.about}</p>
          </section>
          <section className="bg-white rounded-xl shadow p-4 sm:p-5">
            <h2 className="font-bold text-lg mb-3">Location</h2>
            <DirectoryMap
              mode="single"
              points={[
                { id: l.id, slug: l.slug, name: l.name, category: l.category, lat: l.lat, lng: l.lng, city: l.city, state: l.state },
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
        </div>

        <aside className="space-y-4 min-w-0">
          <section className="bg-white rounded-xl shadow p-4 sm:p-5">
            <h2 className="font-bold text-lg mb-2">Hours</h2>
            {hours ? <DirectoryHours hours={hours} /> : <p className="text-sm text-gray-500">Hours not listed.</p>}
          </section>
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
            {l.website && (
              <p className="truncate">
                <a href={l.website} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-600 hover:underline">
                  {hostOf(l.website)}
                </a>
              </p>
            )}
            {l.menuUrl && (
              <p>
                <a href={l.menuUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-600 hover:underline">
                  View menu
                </a>
              </p>
            )}
          </section>
          <p className="text-xs text-gray-400 px-1">
            Submitted by{" "}
            <Link href={`/profile/${l.submittedBy.username}`} className="hover:underline">
              {l.submittedBy.displayName}
            </Link>
            . See something wrong?{" "}
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
