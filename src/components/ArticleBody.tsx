import { renderMarkdown } from "@/lib/blog";

// TL;DR box, markdown body, FAQ and sources: shared by blog articles and
// the state cannabis-law pages.
export default function ArticleBody({
  tldr,
  body,
  faq,
  sources,
}: {
  tldr: string | null;
  body: string;
  faq: { q: string; a: string }[];
  sources: { title: string; url: string }[];
}) {
  return (
    <>
      {tldr && (
        <div className="mt-6 bg-brand-50 border-l-4 border-brand-500 rounded p-4 text-sm">
          <p className="font-semibold text-brand-800 mb-1">TL;DR</p>
          <p className="text-gray-700">{tldr}</p>
        </div>
      )}

      <div className="blog-prose mt-6" dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />

      {faq.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold mb-3">FAQ</h2>
          <div className="space-y-2">
            {faq.map((f, i) => (
              <details key={i} className="border rounded-lg p-3">
                <summary className="font-medium cursor-pointer">{f.q}</summary>
                <p className="text-sm text-gray-700 mt-2">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {sources.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-2">Sources</h2>
          <ol className="list-decimal pl-5 text-sm space-y-1">
            {sources.map((s, i) => (
              <li key={i} className="break-words">
                <a href={s.url} target="_blank" rel="nofollow noopener noreferrer" className="text-brand-600 hover:underline">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}
