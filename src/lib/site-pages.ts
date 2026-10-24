import fs from "node:fs";
import path from "node:path";
import { site } from "@/lib/gop-content";

/**
 * The marketing site's pages live as HTML fragments in src/content/site/:
 *
 *   src/content/site/<route>/page.html   what goes inside <main>
 *   src/content/site/<route>/meta.json   title, description, OG image and the
 *                                        page-specific JSON-LD nodes
 *
 * `index/` is the home page. Adding a directory adds a page: the catch-all
 * route, the sitemaps and scripts/verify-site.mjs all discover pages from this
 * tree, so there is no second list to keep in sync.
 *
 * Everything JSON-LD can derive from the visible page is derived here rather
 * than stored, so schema and copy cannot drift apart: breadcrumbs come from
 * the crumbs <nav>, FAQPage from the "Frequently asked questions" section,
 * and published/updated dates from the byline <time> elements.
 */

const CONTENT_DIR = path.join(process.cwd(), "src/content/site");

export type PageKind = "home" | "lever" | "article" | "hub";

type JsonLdNode = Record<string, unknown>;

export interface PageMeta {
  title: string;
  description: string;
  ogImage: string;
  nodes: JsonLdNode[];
  /** Insights only: the heading it is listed under on /insights/. */
  category?: string;
  /** Kept out of search, the sitemaps and llms.txt (e.g. legal drafts under review). */
  noindex?: boolean;
}

export interface SitePage {
  /** Route segments, [] for home. */
  slug: string[];
  /** Canonical path with trailing slash, "/" for home. */
  path: string;
  kind: PageKind;
  html: string;
  meta: PageMeta;
  published?: string;
  modified?: string;
}

function kindOf(route: string): PageKind {
  if (route === "") return "home";
  if (route.startsWith("services/")) return "lever";
  if (route.startsWith("insights/")) return "article";
  return "hub";
}

function walk(dir: string, rel = ""): string[] {
  const routes: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const childRel = rel ? `${rel}/${entry.name}` : entry.name;
    const childDir = path.join(dir, entry.name);
    if (fs.existsSync(path.join(childDir, "page.html"))) routes.push(childRel);
    routes.push(...walk(childDir, childRel));
  }
  return routes;
}

function times(html: string): string[] {
  const byline = html.match(/<p class="byline">[\s\S]*?<\/p>/)?.[0] ?? "";
  return Array.from(byline.matchAll(/<time datetime="([^"]+)">/g), (m) => m[1]);
}

let cache: SitePage[] | null = null;

export function getAllPages(): SitePage[] {
  if (cache) return cache;
  cache = walk(CONTENT_DIR)
    .map((dirRel) => {
      const route = dirRel === "index" ? "" : dirRel;
      const dir = path.join(CONTENT_DIR, dirRel);
      const html = fs.readFileSync(path.join(dir, "page.html"), "utf8");
      const meta = JSON.parse(
        fs.readFileSync(path.join(dir, "meta.json"), "utf8"),
      ) as PageMeta & { modified?: string };
      const [published, modified] = times(html);
      return {
        slug: route ? route.split("/") : [],
        path: route ? `/${route}/` : "/",
        kind: kindOf(route),
        html,
        meta,
        published,
        modified: modified ?? published ?? meta.modified,
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
  for (const page of cache) {
    if (page.html.includes(INSIGHTS_INDEX)) {
      page.html = page.html.replace(INSIGHTS_INDEX, insightsIndex(cache));
    }
  }
  return cache;
}

// ----------------------------------------------------------- insights index

/** Placeholder in insights/page.html, replaced with the article cards. */
const INSIGHTS_INDEX = "<!-- insights-index -->";

/** Display order on /insights/. A category not listed here goes last. */
const CATEGORY_ORDER = [
  "Profitable Growth",
  "Commercial Excellence",
  "Operational Improvement",
  "Investment Readiness",
  "Growth Capital",
  "Portfolio Value Creation",
  "Digital Growth and AI",
  "Governance and Leadership",
];

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function insightsIndex(pages: SitePage[]): string {
  const articles = pages.filter((p) => p.kind === "article");
  const categories = Array.from(new Set(articles.map((a) => a.meta.category ?? "More insights")));
  const rank = (c: string) => {
    const i = CATEGORY_ORDER.indexOf(c);
    return i < 0 ? CATEGORY_ORDER.length : i;
  };
  categories.sort((a, b) => rank(a) - rank(b));
  return categories
    .map((category) => {
      const cards = articles
        .filter((a) => (a.meta.category ?? "More insights") === category)
        .map((a) => {
          const author = a.html.match(/<p class="byline">By <strong>([\s\S]*?)<\/strong>/)?.[1] ?? "GOP Editorial";
          return (
            `<div class="card"><h3><a href="${a.path}">${h1Html(a.html)}</a></h3>` +
            `<p>${escapeHtml(a.meta.description)}</p><p class="byline">By ${author}</p></div>`
          );
        })
        .join("\n");
      return `<h2>${escapeHtml(category)}</h2><div class="grid">\n${cards}\n</div>`;
    })
    .join("\n");
}

function h1Html(html: string): string {
  return html.match(/<h1>([\s\S]*?)<\/h1>/)?.[1] ?? "";
}

export function getPage(slug: string[] = []): SitePage | undefined {
  const p = slug.length ? `/${slug.join("/")}/` : "/";
  return getAllPages().find((page) => page.path === p);
}

/** Absolute URL on the canonical host. */
export function abs(p: string): string {
  return new URL(p, site.url).toString();
}

// ------------------------------------------------------------------ JSON-LD

const ORG_ID = abs("/#organization");
const WEBSITE_ID = abs("/#website");

const decode = (s: string) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&rsaquo;/g, "›")
    .replace(/&middot;/g, "·")
    .replace(/&rarr;/g, "→")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

export function h1Of(html: string): string {
  return decode(html.match(/<h1>([\s\S]*?)<\/h1>/)?.[1] ?? "");
}

/** Q&A pairs from the visible FAQ section (h3 question, following p answer). */
export function faqOf(html: string): { q: string; a: string }[] {
  const start = html.search(/<h2>Frequently asked questions<\/h2>/);
  if (start < 0) return [];
  const rest = html.slice(start + 1);
  const end = rest.search(/<h2>|<\/div>\s*<section class="cta"/);
  const section = end < 0 ? rest : rest.slice(0, end);
  return Array.from(
    section.matchAll(/<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g),
    (m) => ({ q: decode(m[1]), a: decode(m[2]) }),
  );
}

/**
 * The FAQ section as an accordion: each h3 question + p answer pair becomes a
 * <details> disclosure. Only the rendered HTML changes; faqOf() reads the
 * source fragment, and the answers stay in the DOM (closed, not removed), so
 * the FAQPage schema still matches visible content.
 */
export function faqAccordion(html: string): string {
  const start = html.search(/<h2>Frequently asked questions<\/h2>/);
  if (start < 0) return html;
  const rest = html.slice(start + 1);
  const endRel = rest.search(/<h2>|<\/div>\s*<section class="cta"/);
  const end = endRel < 0 ? html.length : start + 1 + endRel;
  const section = html
    .slice(start, end)
    .replace(
      /<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g,
      '<details class="faq"><summary><h3>$1</h3></summary><p>$2</p></details>',
    );
  return html.slice(0, start) + section + html.slice(end);
}

/** Breadcrumb trail from the visible crumbs nav. */
export function crumbsOf(html: string, page: SitePage): { name: string; url: string }[] {
  const nav = html.match(/<nav class="crumbs"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  if (!nav) return [];
  const items = Array.from(nav.matchAll(/<a href="([^"]+)">([\s\S]*?)<\/a>/g), (m) => ({
    name: decode(m[2]),
    url: abs(m[1]),
  }));
  const last = nav.match(/<span>([\s\S]*?)<\/span>\s*$/)?.[1];
  if (last) items.push({ name: decode(last), url: abs(page.path) });
  return items;
}

export function organizationNode(): JsonLdNode {
  return {
    "@type": ["Organization", "ProfessionalService"],
    "@id": ORG_ID,
    name: site.name,
    alternateName: ["GOP", "Growth Operating Partners"],
    url: site.url,
    logo: abs("/assets/img/gop-growth-operating-partners-logo.webp"),
    image: abs(site.ogImage),
    slogan: site.tagline,
    description: site.about,
    email: site.email,
    foundingDate: site.foundingDate,
    areaServed: { "@type": "Country", name: "India" },
    knowsAbout: [
      "Profitable growth",
      "Market expansion",
      "Commercial excellence",
      "Brand growth",
      "Operational excellence",
      "Margin improvement",
      "Corporate governance",
      "Investment readiness",
      "Growth capital",
      "Post-investment value creation",
      "Portfolio value creation",
      "Digital growth and AI enablement",
    ],
    audience: {
      "@type": "BusinessAudience",
      audienceType: "Promoter-led businesses (primarily INR 150-500 crore revenue), investors and PE/VC funds",
    },
    parentOrganization: {
      "@type": "Organization",
      "@id": `${site.parent.url}/#organization`,
      name: site.parent.name,
      url: site.parent.url,
    },
    sameAs: [site.linkedin, site.parent.url],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "enquiries",
      email: site.email,
      availableLanguage: ["English", "Hindi"],
      url: abs("/contact/"),
    },
  };
}

export function websiteNode(): JsonLdNode {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: site.url,
    name: site.name,
    publisher: { "@id": ORG_ID },
    inLanguage: "en-IN",
  };
}

export function breadcrumbNode(items: { name: string; url: string }[]): JsonLdNode {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function faqNode(faq: { q: string; a: string }[]): JsonLdNode {
  return {
    "@type": "FAQPage",
    mainEntity: faq.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

const PAGE_TYPES = new Set(["WebPage", "AboutPage", "ContactPage", "CollectionPage"]);
const typeOf = (n: JsonLdNode) =>
  (Array.isArray(n["@type"]) ? n["@type"][0] : n["@type"]) as string;

export function jsonLdFor(page: SitePage): JsonLdNode {
  const graph: JsonLdNode[] = [];
  const isHomeOrAbout = page.kind === "home" || page.path === "/about/";

  if (isHomeOrAbout) graph.push(organizationNode());
  if (page.kind === "home") graph.push(websiteNode());

  const crumbs = crumbsOf(page.html, page);
  if (crumbs.length) graph.push(breadcrumbNode(crumbs));

  // Page-specific nodes from meta.json, with dates forced to the visible byline.
  for (const node of page.meta.nodes) {
    const n: JsonLdNode = { ...node };
    const t = typeOf(n);
    if (t === "Article") {
      n.headline = h1Of(page.html);
      n.description = page.meta.description;
      if (page.published) n.datePublished = page.published;
      if (page.modified) n.dateModified = page.modified;
    }
    if (PAGE_TYPES.has(t)) {
      n.isPartOf = { "@id": WEBSITE_ID };
      n.inLanguage = "en-IN";
      if (page.modified) n.dateModified = page.modified;
    }
    graph.push(n);
  }

  if (!page.meta.nodes.some((n) => PAGE_TYPES.has(typeOf(n)))) {
    graph.push({
      "@type": "WebPage",
      "@id": `${abs(page.path)}#page`,
      url: abs(page.path),
      name: page.meta.title,
      description: page.meta.description,
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": ORG_ID },
      inLanguage: "en-IN",
      ...(page.modified ? { dateModified: page.modified } : {}),
    });
  }

  const faq = faqOf(page.html);
  if (faq.length) graph.push(faqNode(faq));

  return { "@context": "https://schema.org", "@graph": graph };
}

/** JSON for a <script> body: `<` escaped so content can never close the tag. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

// ----------------------------------------------------------------- metadata

export function pageMetadata(opts: {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
  type?: "website" | "article";
  noindex?: boolean;
}): import("next").Metadata {
  const image = abs(opts.ogImage ?? site.ogImage);
  return {
    // absolute: every page title is written in full, within 62 characters.
    title: { absolute: opts.title },
    description: opts.description,
    alternates: { canonical: abs(opts.path) },
    robots: opts.noindex
      ? { index: false, follow: true }
      : {
          index: true,
          follow: true,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
    openGraph: {
      type: opts.type ?? "website",
      siteName: site.name,
      locale: "en_IN",
      url: abs(opts.path),
      title: opts.title,
      description: opts.description,
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      images: [image],
    },
  };
}
