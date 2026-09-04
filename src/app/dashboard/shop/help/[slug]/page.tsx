import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { getHelpTopic, SHOP_HELP_TOPICS } from "@/lib/shopHelp";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return SHOP_HELP_TOPICS.map((t) => ({ slug: t.slug }));
}

export default async function ShopHelpTopicPage({
  params,
}: {
  params: { slug: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) redirect("/dashboard/shop");

  const topic = getHelpTopic(params.slug);
  if (!topic) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard/shop/help" className="text-sm text-brand-600 hover:underline">
          ← All help topics
        </Link>
        <h1 className="text-2xl font-bold mt-1">{topic.title}</h1>
        <p className="text-sm text-gray-500 mt-1">{topic.summary}</p>
        <Link
          href={topic.href}
          className="inline-block mt-3 bg-brand-600 text-white text-sm font-medium px-4 py-1.5 rounded-full hover:bg-brand-700"
        >
          Open this section →
        </Link>
      </div>

      {topic.sections.map((section) => (
        <section key={section.heading} className="bg-white rounded-xl shadow p-4 space-y-2 text-sm">
          <h2 className="font-semibold">{section.heading}</h2>
          {section.paragraphs.map((p) => (
            <p key={p} className="text-gray-700">
              {p}
            </p>
          ))}
          {section.steps && section.steps.length > 0 && (
            <ol className="list-decimal list-inside space-y-1 text-gray-700">
              {section.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          )}
          {section.note && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">{section.note}</p>
          )}
        </section>
      ))}
    </div>
  );
}
