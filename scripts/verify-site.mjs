#!/usr/bin/env node
/**
 * Post-build checks for the public marketing site. Runs after `next build`
 * (see package.json) against the prerendered output in .next/server/app, so
 * no server is needed and a failure stops the Docker build.
 *
 *   node scripts/verify-site.mjs            checks, exit 1 on any error
 *   node scripts/verify-site.mjs --verbose  also print per-page word counts
 *
 * Errors (fail the build):
 *   - confidentiality: internal framework names, fee / commercial-terms
 *     language, non-public partner names, anywhere in the public output
 *   - exactly one <h1>; title 1–62 chars; meta description 120–160 chars
 *   - canonical present and equal to the page URL; lang="en-IN"
 *   - Open Graph / Twitter tags present
 *   - every <img> has non-empty alt, width and height
 *   - every internal link resolves to a page, public file or app route, and
 *     uses the canonical trailing-slash form
 *   - JSON-LD parses, no duplicate @id or duplicate singleton types, FAQPage
 *     questions are visible on the page, Article headline/dates match the page
 *   - no duplicate titles or descriptions across pages
 *   - noindex pages are noindex and absent from the sitemap
 *
 * Warnings (reported, do not fail): content depth below the target word
 * count, answer-first paragraph outside 40–60 words.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const APP_OUT = path.join(ROOT, ".next/server/app");
const PUBLIC = path.join(ROOT, "public");
const ORIGIN = "https://gop.sbssdigital.com";
const VERBOSE = process.argv.includes("--verbose");

// ------------------------------------------------------------ confidentiality

// Word-bounded and case-insensitive unless noted. "SCALE" alone is not here:
// "scale" is an ordinary verb on this site; the framework name is caught by
// its punctuated and "Matrix" forms.
const BANNED = [
  [/S\.\s?C\.\s?A\.\s?L\.\s?E\.?/, "S.C.A.L.E. framework name"],
  [/\bSCALE\s+Matrix\b/i, "S.C.A.L.E. framework name"],
  [/\bBRIDGE\b/, "BRIDGE framework name"],
  [/\bBRIDGE\s+(framework|model|method)/i, "BRIDGE framework name"],
  [/skin\s+in\s+the\s+game/i, "skin-in-the-game language"],
  [/project[-\s]cost/i, "project-cost language"],
  [/cost[-\s]basis/i, "cost-basis language"],
  [/\bfees?\b/i, "fee language"],
  [/\bretainers?\b/i, "retainer language"],
  [/performance[-\s]linked/i, "performance-linked fee language"],
  [/milestone[-\s]linked/i, "milestone-linked fee language"],
  [/outcome[-\s]linked/i, "outcome-linked fee language"],
  [/\bupside\b/i, "upside-sharing language"],
  [/fixed[-\s]scope\s+and\s+(fee|price)/i, "fixed scope and fee language"],
  [/\bpriced\s+per\b/i, "pricing-terms language"],
  [/\bRashmi\b/i, "non-public partner name"],
  [/\bAvne+e?sh\b/i, "non-public partner name"],
  [/\bAvnish\b/i, "non-public partner name"],
  [/\bSheetal\b/i, "non-public partner name"],
  [/\bShailesh\b/i, "non-public partner name"],
  [/\bPankaj\b/i, "non-public partner name"],
  [/\bIDOS\b/i, "non-public entity name"],
];

// ---------------------------------------------------------------- utilities

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

const decode = (s) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&rsaquo;/g, "›")
    .replace(/&middot;/g, "·")
    .replace(/&rarr;/g, "→")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

const attr = (tag, name) =>
  tag.match(new RegExp(`\\b${name}="([^"]*)"`, "i"))?.[1];

function metaContent(html, key, value) {
  const tag = html.match(new RegExp(`<meta[^>]*${key}="${value}"[^>]*>`, "i"))?.[0];
  return tag ? decode(attr(tag, "content") ?? "") : undefined;
}

const words = (s) => (s ? s.split(/\s+/).filter(Boolean).length : 0);

// ------------------------------------------------------------ collect output

if (!fs.existsSync(APP_OUT)) {
  console.error(`verify-site: ${APP_OUT} not found. Run \`next build\` first.`);
  process.exit(1);
}

/** Route (with trailing slash) → prerendered HTML file. */
const pages = new Map();
for (const file of walk(APP_OUT)) {
  if (!file.endsWith(".html")) continue;
  const rel = path.relative(APP_OUT, file).replace(/\\/g, "/").replace(/\.html$/, "");
  // Next's built-in fallback. Real 404s render (site)/not-found.tsx on demand
  // through the catch-all route, so they are not in the prerendered output.
  if (rel === "_not-found") continue;
  // The (app) side is internal and noindex; it is not part of the public site.
  if (/^(apply|admin)(\/|$)/.test(rel)) continue;
  pages.set(rel === "index" ? "/" : `/${rel}/`, file);
}

const sitemapXml = fs.readFileSync(path.join(APP_OUT, "sitemap.xml.body"), "utf8");
const sitemapUrls = new Set(Array.from(sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g), (m) => m[1]));
const publicFiles = new Set(walk(PUBLIC).map((f) => "/" + path.relative(PUBLIC, f).replace(/\\/g, "/")));
const APP_ROUTES = [/^\/apply$/, /^\/admin(\/login)?$/, /^\/api\//];
const GENERATED = new Set(["/robots.txt", "/sitemap.xml", "/image-sitemap.xml", "/llms.txt", "/favicon.ico"]);

// ---------------------------------------------------------- confidentiality

const scanTargets = [
  ...walk(APP_OUT).filter(
    (f) =>
      /\.(html|rsc|body|meta)$/.test(f) &&
      // The internal app (consultant intake, admin) is noindex and asks
      // consultants for their own rates; it is not public marketing copy.
      !/^(apply|admin)(\.|[/\\])/.test(path.relative(APP_OUT, f)),
  ),
  ...walk(PUBLIC).filter((f) => /\.(txt|xml|html|json|md)$/.test(f)),
  // Client JS shipped to marketing pages (e.g. the enquiry form's copy).
  ...walk(path.join(ROOT, ".next/static/chunks/app/(site)")).filter((f) => f.endsWith(".js")),
  ...walk(path.join(ROOT, "src/content")),
  path.join(ROOT, "src/lib/gop-content.ts"),
];
for (const file of scanTargets) {
  const text = fs.readFileSync(file, "utf8");
  for (const [re, label] of BANNED) {
    const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    for (const m of text.matchAll(g)) {
      const line = text.slice(0, m.index).split("\n").length;
      const ctx = text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40).replace(/\s+/g, " ");
      err(`${path.relative(ROOT, file)}:${line}`, `CONFIDENTIAL (${label}) "${m[0]}" … ${ctx}`);
    }
  }
}

// --------------------------------------------------------------- per page

const titles = new Map();
const descriptions = new Map();

for (const [route, file] of [...pages].sort()) {
  const html = fs.readFileSync(file, "utf8");
  const where = route;
  const url = ORIGIN + route;
  const robots = metaContent(html, "name", "robots") ?? "";
  const noindex = /noindex/.test(robots);

  if (!/<html lang="en-IN"/.test(html)) err(where, 'missing lang="en-IN"');

  const h1s = html.match(/<h1[\s>]/g)?.length ?? 0;
  if (h1s !== 1) err(where, `expected exactly one <h1>, found ${h1s}`);
  const h1 = decode(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "");

  const title = decode(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
  if (!title) err(where, "missing <title>");
  else if (title.length > 62) err(where, `title is ${title.length} chars (max 62): "${title}"`);

  if (noindex) {
    if (url && sitemapUrls.has(url)) err(where, "noindex page is listed in sitemap.xml");
  } else {
    const desc = metaContent(html, "name", "description");
    if (!desc) err(where, "missing meta description");
    else if (desc.length < 120 || desc.length > 160)
      err(where, `meta description is ${desc.length} chars (want 120-160): "${desc}"`);

    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    if (!canonical) err(where, "missing canonical");
    // Next writes the home canonical without its trailing slash; same URL.
    else if (canonical !== url && !(route === "/" && canonical === ORIGIN))
      err(where, `canonical ${canonical} != ${url}`);
    if (!sitemapUrls.has(url)) err(where, "indexable page missing from sitemap.xml");

    for (const [k, v] of [
      ["property", "og:title"],
      ["property", "og:description"],
      ["property", "og:image"],
      ["property", "og:url"],
      ["name", "twitter:card"],
      ["name", "twitter:image"],
    ])
      if (!metaContent(html, k, v)) err(where, `missing ${v}`);

    if (titles.has(title)) err(where, `duplicate title (also ${titles.get(title)})`);
    titles.set(title, route);
    if (desc) {
      if (descriptions.has(desc)) err(where, `duplicate description (also ${descriptions.get(desc)})`);
      descriptions.set(desc, route);
    }
  }

  // Images.
  for (const tag of html.match(/<img\b[^>]*>/g) ?? []) {
    const src = attr(tag, "src");
    if (!attr(tag, "alt")) err(where, `img without alt: ${src}`);
    if (!attr(tag, "width") || !attr(tag, "height")) err(where, `img without width/height: ${src}`);
    if (src?.startsWith("/") && !publicFiles.has(src)) err(where, `img not found: ${src}`);
  }

  // Internal links.
  for (const m of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
    let href = m[1].replace(/&amp;/g, "&");
    if (href.startsWith(ORIGIN)) href = href.slice(ORIGIN.length) || "/";
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    const p = href.split(/[?#]/)[0];
    if (p === "") continue;
    if (publicFiles.has(p) || GENERATED.has(p)) continue;
    if (APP_ROUTES.some((re) => re.test(p))) continue;
    if (pages.has(p)) continue;
    if (pages.has(p + "/")) err(where, `link ${href} lacks trailing slash (redirects)`);
    else err(where, `broken internal link ${href}`);
  }

  // JSON-LD.
  const blocks = Array.from(html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g), (m) => m[1]);
  if (!noindex && blocks.length === 0) err(where, "no JSON-LD");
  const nodes = [];
  for (const block of blocks) {
    try {
      const data = JSON.parse(block);
      nodes.push(...(data["@graph"] ?? [data]));
    } catch (e) {
      err(where, `JSON-LD does not parse: ${e.message}`);
    }
  }
  const typeOf = (n) => [].concat(n["@type"]);
  const ids = new Map();
  const singletons = ["FAQPage", "BreadcrumbList", "WebSite", "Organization", "Article", "Service"];
  const typeCount = {};
  for (const n of nodes) {
    if (n["@id"]) {
      if (ids.has(n["@id"])) err(where, `duplicate JSON-LD @id ${n["@id"]}`);
      ids.set(n["@id"], n);
    }
    for (const t of typeOf(n)) typeCount[t] = (typeCount[t] ?? 0) + 1;
  }
  for (const t of singletons) if (typeCount[t] > 1) err(where, `${typeCount[t]} ${t} nodes`);

  const visible = decode(html.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? "");
  for (const n of nodes) {
    const types = typeOf(n);
    if (types.includes("FAQPage")) {
      for (const q of n.mainEntity ?? []) {
        if (!visible.includes(q.name)) err(where, `FAQ question not visible: "${q.name}"`);
        if (!visible.includes(q.acceptedAnswer?.text ?? "")) err(where, `FAQ answer not visible for: "${q.name}"`);
      }
    }
    if (types.includes("Article")) {
      if (n.headline !== h1) err(where, `Article headline "${n.headline}" != h1 "${h1}"`);
      for (const k of ["datePublished", "dateModified"])
        if (!html.includes(`<time datetime="${n[k]}"`)) err(where, `Article ${k} ${n[k]} not shown in a <time>`);
      if (!n.author) err(where, "Article without author");
      if (!n.image) err(where, "Article without image");
    }
    if (types.includes("BreadcrumbList") && !/<nav class="crumbs"/.test(html))
      err(where, "BreadcrumbList without visible breadcrumbs");
  }
  if (route !== "/" && !noindex && !typeCount.BreadcrumbList)
    err(where, "inner page without BreadcrumbList");
  if (/<h2>Frequently asked questions<\/h2>/.test(html) && !typeCount.FAQPage)
    err(where, "visible FAQ without FAQPage schema");

  // Depth and answer-first (warnings).
  if (!noindex) {
    const n = words(visible);
    const kind =
      route === "/" ? "home" : route.startsWith("/what-we-do/") && route !== "/what-we-do/" ? "lever"
      : route.startsWith("/insights/") && route !== "/insights/" ? "article" : "hub";
    const min = { lever: 900, article: 650, home: 600 }[kind] ??
      (["/about/", "/results/"].includes(route) ? 600 : 0);
    const max = { lever: 1100, article: 1000 }[kind];
    if (min && n < min) warn(where, `${n} words (target ${min}${max ? `-${max}` : "+"})`);
    if (max && n > max + 150) warn(where, `${n} words (target ${min}-${max})`);
    if (VERBOSE) console.log(`  ${String(n).padStart(5)} words  ${route}`);

    const answer = html.match(/<p class="answer">([\s\S]*?)<\/p>/)?.[1];
    if (!answer) warn(where, "no answer-first paragraph");
    else {
      const aw = words(decode(answer.replace(/<strong>[\s\S]*?<\/strong>/, "")));
      if (aw < 40 || aw > 60) warn(where, `answer-first paragraph is ${aw} words (target 40-60)`);
    }
  }
}

// ------------------------------------------------------- site-wide files

const robotsTxt = fs.readFileSync(path.join(APP_OUT, "robots.txt.body"), "utf8");
for (const bot of ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "PerplexityBot", "Google-Extended", "Applebot-Extended", "CCBot"])
  if (!new RegExp(`User-Agent: ${bot}\\n`, "i").test(robotsTxt)) err("robots.txt", `no group for ${bot}`);
for (const p of ["/admin", "/apply", "/api"])
  if ((robotsTxt.match(new RegExp(`Disallow: ${p}\\n`, "g")) ?? []).length < 2) err("robots.txt", `${p} not disallowed in every group`);
for (const s of ["sitemap.xml", "image-sitemap.xml"])
  if (!robotsTxt.includes(`Sitemap: ${ORIGIN}/${s}`)) err("robots.txt", `missing Sitemap line for ${s}`);
for (const u of sitemapUrls)
  if (/\/(admin|apply|api)(\/|$)/.test(u) || u.includes("/enquiry/thanks/")) err("sitemap.xml", `lists non-public URL ${u}`);
if (!fs.existsSync(path.join(APP_OUT, "llms.txt.body"))) err("llms.txt", "not generated");
if (![...publicFiles].some((f) => /^\/[0-9a-f]{32}\.txt$/.test(f))) err("public", "IndexNow key file missing");

// ----------------------------------------------------------------- report

console.log(`verify-site: ${pages.size} pages, ${sitemapUrls.size} sitemap URLs, ${scanTargets.length} files scanned for confidential terms`);
for (const w of warnings) console.log(`  WARN  ${w}`);
for (const e of errors) console.log(`  ERROR ${e}`);
console.log(`verify-site: ${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
