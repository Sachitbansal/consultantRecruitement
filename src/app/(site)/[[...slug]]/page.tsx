import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import {
  getAllPages,
  getPage,
  jsonLdFor,
  jsonLdScript,
  pageMetadata,
} from "@/lib/site-pages";

// Every marketing page is prerendered at build time from src/content/site/.
// dynamicParams stays on (the default) only so unknown paths reach notFound()
// below and get the branded (site)/not-found.tsx; with it off, Next serves its
// bare built-in 404, which has no layout.

type Props = { params: { slug?: string[] } };

export function generateStaticParams() {
  return getAllPages().map((page) => ({ slug: page.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const page = getPage(params.slug);
  if (!page) return {};
  return pageMetadata({
    title: page.meta.title,
    description: page.meta.description,
    path: page.path,
    ogImage: page.meta.ogImage,
    type: page.kind === "article" ? "article" : "website",
  });
}

// The pre-split site was a single page with in-page sections. Fragments never
// reach the server, so those old links are forwarded here, client-side.
const legacyAnchors = `(function(){var m={"#contact":"/enquiry/","#what-we-do":"/what-we-do/","#how-we-work":"/how-we-work/","#who-we-work-with":"/who-we-help/"};var t=m[location.hash];if(t)location.replace(t);})();`;

export default function SitePage({ params }: Props) {
  const page = getPage(params.slug);
  if (!page) notFound();

  return (
    <>
      <SiteHeader current={page.path} />
      {page.kind === "home" && (
        <script dangerouslySetInnerHTML={{ __html: legacyAnchors }} />
      )}
      <main id="main" dangerouslySetInnerHTML={{ __html: page.html }} />
      <SiteFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLdFor(page)) }}
      />
    </>
  );
}
