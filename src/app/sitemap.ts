import type { MetadataRoute } from "next";
import { abs, getAllPages } from "@/lib/site-pages";

export const dynamic = "force-static";

// Marketing pages only. /contact/thanks/, legal drafts and the 404 are noindex, and the
// internal app is disallowed in robots.ts, so none of them belong here.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = getAllPages()
    .filter((page) => !page.meta.noindex)
    .map((page) => ({
    url: abs(page.path),
    lastModified: page.modified,
    changeFrequency: "monthly" as const,
    priority: page.kind === "home" ? 1 : page.kind === "article" ? 0.6 : 0.8,
  }));
  return [
    ...pages,
    {
      url: abs("/contact/"),
      lastModified: "2026-10-24",
      changeFrequency: "yearly" as const,
      priority: 0.7,
    },
  ];
}
