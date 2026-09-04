import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { SHOP_HELP_TOPICS } from "@/lib/shopHelp";

export const dynamic = "force-dynamic";

export default async function ShopHelpPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) redirect("/dashboard/shop");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard/shop" className="text-sm text-brand-600 hover:underline">
          ← My Shop
        </Link>
        <h1 className="text-2xl font-bold mt-1">Help &amp; Support</h1>
        <p className="text-sm text-gray-500 mt-1">
          Open a topic for step-by-step instructions. Sections that need keys from another site include where to copy them.
        </p>
      </div>

      <section className="bg-white rounded-xl shadow divide-y">
        {SHOP_HELP_TOPICS.map((topic) => (
          <Link
            key={topic.slug}
            href={`/dashboard/shop/help/${topic.slug}`}
            className="block p-4 hover:bg-gray-50"
          >
            <p className="font-semibold text-sm text-brand-700">{topic.title}</p>
            <p className="text-sm text-gray-600 mt-0.5">{topic.summary}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
