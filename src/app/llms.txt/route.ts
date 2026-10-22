import { site } from "@/lib/gop-content";
import { abs, getAllPages, h1Of, type SitePage } from "@/lib/site-pages";

export const dynamic = "force-static";

/**
 * /llms.txt: a plain-text map of the site for language models
 * (https://llmstxt.org). Generated from src/content/site so every page,
 * including new insights, is listed with its own one-line summary.
 */
export function GET() {
  const pages = getAllPages();
  const line = (p: SitePage) => `- [${h1Of(p.html)}](${abs(p.path)}): ${p.meta.description}`;
  const hubs = pages.filter((p) => p.kind === "hub");
  const levers = pages.filter((p) => p.kind === "lever");
  const articles = pages.filter((p) => p.kind === "article");

  const text = `# ${site.name}

> ${site.about} GOP helps promoter-led and family-owned manufacturers with INR 150-500 crore revenue transform into institution-grade enterprises, working as operators alongside the promoter. ${site.tagline} ${site.hindi}

- Contact: ${site.email} (no phone or office address is published)
- Enquiries: ${abs("/enquiry/")}
- LinkedIn: ${site.linkedin}
- Parent company: ${site.parent.name}, ${site.parent.url}
- Founded: ${site.foundingDate}; serves clients across India

## Core pages

- [Home](${site.url}): ${pages.find((p) => p.kind === "home")?.meta.description}
${hubs.map(line).join("\n")}
- [Book a free diagnostic call](${abs("/enquiry/")}): Contact form and email for enquiries.

## The Five Levers

${levers.map(line).join("\n")}

## Insights

${articles.map(line).join("\n")}
`;
  return new Response(text, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
