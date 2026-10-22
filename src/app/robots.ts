import type { MetadataRoute } from "next";
import { site } from "@/lib/gop-content";

export const dynamic = "force-static";

// The internal app is never crawlable. Every group below carries the same
// Disallow lines, because a crawler obeys only the most specific group that
// names it and ignores `*` once it finds its own.
const APP_PATHS = ["/admin", "/apply", "/api"];

// Named explicitly so the welcome to search and AI crawlers is on record,
// rather than implied by the `*` group.
const BOTS = [
  "Googlebot",
  "Bingbot",
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot",
  "Applebot-Extended",
  "CCBot",
  "Meta-ExternalAgent",
  "DuckDuckBot",
  "Amazonbot",
  "cohere-ai",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      ...BOTS.map((userAgent) => ({ userAgent, allow: "/", disallow: APP_PATHS })),
      { userAgent: "*", allow: "/", disallow: APP_PATHS },
    ],
    sitemap: [`${site.url}sitemap.xml`, `${site.url}image-sitemap.xml`],
  };
}
