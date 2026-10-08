import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Public content is open to search engines and AI search/assistant crawlers
// alike (the site wants to be cited in AI answers). Members-only areas,
// account/checkout pages and the API are off limits. Login, register and
// search pages are crawlable but carry their own noindex tags.
const PRIVATE = [
  "/api/",
  "/admin",
  "/feed",
  "/groups",
  "/profile",
  "/friends",
  "/messages",
  "/account",
  "/dashboard",
  "/checkout",
  "/orders",
  "/directory/mine",
  "/directory/*/edit",
  "/directory/*/claim",
];

const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "meta-externalagent",
  "Bingbot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: PRIVATE },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
