import { site } from "@/lib/gop-content";
import { abs, getAllPages, h1Of, type SitePage } from "@/lib/site-pages";

export const dynamic = "force-static";

/**
 * /llms.txt: a plain-text map of the site for language models
 * (https://llmstxt.org). Generated from src/content/site so every page,
 * including new insights, is listed with its own one-line summary.
 */
export function GET() {
  const pages = getAllPages().filter((p) => !p.meta.noindex);
  const line = (p: SitePage) => `- [${h1Of(p.html)}](${abs(p.path)}): ${p.meta.description}`;
  const hubs = pages.filter((p) => p.kind === "hub");
  const levers = pages.filter((p) => p.kind === "lever");
  const articles = pages.filter((p) => p.kind === "article");

  const text = `# ${site.name}

> ${site.about} ${site.origin} It works with business promoters (primarily INR 150-500 crore revenue, with deep manufacturing experience), prospective investors and PE/VC funds. GOP does not invest its own capital. ${site.hindi}

- Contact: ${site.email} (no phone or office address is published)
- Enquiries: ${abs("/contact/")}
- LinkedIn: ${site.linkedin}
- Parent company: ${site.parent.name}, ${site.parent.url}
- Founded: ${site.foundingDate}; serves clients across India

## Core pages

- [Home](${site.url}): ${pages.find((p) => p.kind === "home")?.meta.description}
${hubs.map(line).join("\n")}
- [Contact](${abs("/contact/")}): Enquiry form and email for business promoters, investors and PE/VC funds.

## Services

${levers.map(line).join("\n")}

## Insights

${articles.map(line).join("\n")}
`;
  return new Response(text, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
