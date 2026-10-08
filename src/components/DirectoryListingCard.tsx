import Link from "next/link";
import { categoryFor, formatPhone, fullAddress, listingShowsAll } from "@/lib/directory";

// The Prisma select a card needs.
export const LISTING_CARD_SELECT = {
  id: true,
  slug: true,
  name: true,
  category: true,
  street: true,
  city: true,
  state: true,
  zip: true,
  phone: true,
  imageUrl: true,
  about: true,
  specials: true,
  menuUrl: true,
  fullAccess: true,
  premiumUntil: true,
  claimedById: true,
  licenseNumber: true,
} as const;

export type ListingCardData = {
  id: string;
  slug: string;
  name: string;
  category: string;
  street: string | null;
  city: string | null;
  state: string;
  zip: string | null;
  phone: string | null;
  imageUrl: string | null;
  about: string;
  specials: string | null;
  menuUrl: string | null;
  fullAccess: boolean;
  premiumUntil: Date | null;
  claimedById: string | null;
  licenseNumber: string | null;
};

// One business in a directory list (directory page and location pages).
export default function DirectoryListingCard({
  l,
  headingLevel = "h2",
  distanceMiles,
}: {
  l: ListingCardData;
  headingLevel?: "h2" | "h3";
  // Shown when the list is a "near this ZIP/city" search.
  distanceMiles?: number;
}) {
  const cat = categoryFor(l.category);
  const showAll = listingShowsAll(l);
  const Heading = headingLevel;
  return (
    <Link href={`/directory/${l.slug}`} className="group flex gap-3 bg-white rounded-xl shadow p-3 hover:shadow-md transition">
      <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-lg overflow-hidden bg-brand-50 flex items-center justify-center text-3xl">
        {l.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={l.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
        ) : (
          cat?.icon
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
          {cat && (
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: cat.color }}>
              {cat.name}
            </span>
          )}
          {l.claimedById && <span className="text-[11px] font-semibold bg-brand-100 text-brand-800 px-1.5 py-0.5 rounded">✓ Owner</span>}
          {l.licenseNumber && (
            <span className="text-[11px] font-semibold bg-green-100 text-green-800 px-1.5 py-0.5 rounded">✓ Licensed</span>
          )}
          {showAll && l.specials && (
            <span className="text-[11px] font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">Deals</span>
          )}
          {showAll && l.menuUrl && (
            <span className="text-[11px] font-semibold bg-green-100 text-green-800 px-1.5 py-0.5 rounded">Menu</span>
          )}
        </div>
        <Heading className="font-bold leading-snug group-hover:text-brand-700 truncate">{l.name}</Heading>
        <p className="text-sm text-gray-500 truncate">
          {distanceMiles !== undefined && (
            <span className="font-semibold text-brand-700">{distanceMiles < 10 ? distanceMiles.toFixed(1) : Math.round(distanceMiles)} mi · </span>
          )}
          {fullAddress(l)}
        </p>
        {l.phone && <p className="text-sm text-gray-500">{formatPhone(l.phone)}</p>}
        <p className="text-sm text-gray-600 mt-1 line-clamp-1">{l.about}</p>
      </div>
    </Link>
  );
}
