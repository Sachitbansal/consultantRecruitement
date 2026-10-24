import { abs, getAllPages } from "@/lib/site-pages";

export const dynamic = "force-static";

const esc = (s: string) =>
  s
    .replace(/&(?!amp;|lt;|gt;|quot;|#)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** Every content image, listed under the page that shows it. */
export function GET() {
  const urls = getAllPages()
    .filter((page) => !page.meta.noindex)
    .map((page) => {
      const images = Array.from(
        page.html.matchAll(/<img src="([^"]+)" alt="([^"]*)"/g),
        (m) => ({ src: m[1], alt: m[2] }),
      );
      if (!images.length) return "";
      const entries = images
        .map(
          (img) =>
            `<image:image><image:loc>${esc(abs(img.src))}</image:loc><image:caption>${esc(img.alt)}</image:caption></image:image>`,
        )
        .join("");
      return `<url><loc>${esc(abs(page.path))}</loc>${entries}</url>`;
    })
    .filter(Boolean)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>
`;
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
