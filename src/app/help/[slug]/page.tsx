import Link from "next/link";
import { notFound } from "next/navigation";
import { getVisitorHelpTopic, VISITOR_HELP_TOPICS } from "@/lib/visitorHelp";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return VISITOR_HELP_TOPICS.map((t) => ({ slug: t.slug }));
}

export default function VisitorHelpTopicPage({ params }: { params: { slug: string } }) {
  const topic = getVisitorHelpTopic(params.slug);
  if (!topic) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/help" className="text-sm text-brand-600 hover:underline">
          ← All help topics
        </Link>
        <h1 className="text-2xl font-bold mt-1">{topic.title}</h1>
        <p className="text-sm text-gray-500 mt-1">{topic.summary}</p>
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
