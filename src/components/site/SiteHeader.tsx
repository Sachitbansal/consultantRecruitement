import { cta } from "@/lib/gop-content";

const links = [
  { href: "/what-we-do/", label: "What we do" },
  { href: "/how-we-work/", label: "How we work" },
  { href: "/results/", label: "Results" },
  { href: "/team/", label: "Team" },
  { href: "/insights/", label: "Insights" },
];

/**
 * Plain <a> links, not next/link: every marketing page is static HTML, and a
 * full navigation keeps the CSS-only burger (checkbox) from staying open
 * across pages.
 */
export default function SiteHeader({ current }: { current: string }) {
  const isCurrent = (href: string) =>
    current === href || (href !== "/" && current.startsWith(href));
  return (
    <header className="site-header">
      <div className="wrap hdr">
        <a className="brand" href="/" aria-label="GOP Growth Operating Partners - home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/img/gop-monogram.webp"
            alt="GOP Growth Operating Partners logo"
            width={120}
            height={45}
          />
        </a>
        <input type="checkbox" id="navtoggle" className="navtoggle" aria-label="Toggle menu" />
        <label htmlFor="navtoggle" className="burger" aria-hidden="true">
          <span />
          <span />
          <span />
        </label>
        <nav className="nav" aria-label="Main">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-current={isCurrent(link.href) ? "page" : undefined}
            >
              {link.label}
            </a>
          ))}
          <a
            className="navcta"
            href={cta.href}
            aria-current={isCurrent(cta.href) ? "page" : undefined}
          >
            {cta.label}
          </a>
        </nav>
      </div>
    </header>
  );
}
