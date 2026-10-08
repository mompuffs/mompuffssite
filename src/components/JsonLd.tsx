// Renders schema.org structured data (see src/lib/structuredData.ts) as a
// single JSON-LD @graph. "<" is escaped so content can't close the script tag.
export default function JsonLd({ items }: { items: (Record<string, unknown> | null | undefined | false)[] }) {
  const graph = items.filter(Boolean);
  if (!graph.length) return null;
  const json = JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
