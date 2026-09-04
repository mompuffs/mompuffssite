import Link from "next/link";
import { VISITOR_HELP_TOPICS } from "@/lib/visitorHelp";

export const dynamic = "force-dynamic";

export default function VisitorHelpPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Help &amp; Support</h1>
        <p className="text-sm text-gray-500 mt-1">
          How to use MomPuffs as a visitor: feed, groups, marketplace, checkout, and your account.
        </p>
      </div>
      <section className="bg-white rounded-xl shadow divide-y">
        {VISITOR_HELP_TOPICS.map((topic) => (
          <Link key={topic.slug} href={`/help/${topic.slug}`} className="block p-4 hover:bg-gray-50">
            <p className="font-semibold text-sm text-brand-700">{topic.title}</p>
            <p className="text-sm text-gray-600 mt-0.5">{topic.summary}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
