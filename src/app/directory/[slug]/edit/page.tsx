import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import DirectoryListingForm from "@/components/DirectoryListingForm";
import DeleteListingButton from "@/components/DeleteListingButton";

export const dynamic = "force-dynamic";

export default async function EditBusinessPage({ params }: { params: { slug: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const l = await db.businessListing.findUnique({ where: { slug: params.slug } });
  if (!l) notFound();
  const isAdmin = Boolean((user as any).isAdmin);
  if (!isAdmin && l.submittedById !== (user as any).id) notFound();

  return (
    <div className="max-w-3xl">
      <Link href={`/directory/${l.slug}`} className="text-sm text-brand-600 hover:underline">
        ← Back to listing
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-5">Edit {l.name}</h1>
      <DirectoryListingForm
        listingId={l.id}
        isAdmin={isAdmin}
        initial={{
          name: l.name,
          category: l.category,
          street: l.street,
          city: l.city,
          state: l.state,
          zip: l.zip,
          phone: l.phone ?? "",
          website: l.website ?? "",
          menuUrl: l.menuUrl ?? "",
          imageUrl: l.imageUrl ?? "",
          about: l.about,
          specials: l.specials ?? "",
          hours: (l.hours as Record<string, any> | null) ?? null,
        }}
      />
      <div className="mt-8 pt-4 border-t">
        <DeleteListingButton id={l.id} name={l.name} />
      </div>
    </div>
  );
}
