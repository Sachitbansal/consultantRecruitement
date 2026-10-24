import { cta } from "@/lib/gop-content";
import { audienceLinks, mainAfterServices, services } from "./nav";

/**
 * Plain <a> links, not next/link: every marketing page is static HTML, and a
 * full navigation keeps the CSS-only burger (checkbox) from staying open
 * across pages. "What We Do" is a <details> dropdown for the same reason.
 */
export default function SiteHeader({ current }: { current: string }) {
  const isCurrent = (href: string) =>
    current === href || (href !== "/" && current.startsWith(href));
  const inServices = current === "/what-we-do/" || current.startsWith("/services/");
  const link = (l: { href: string; label: string }) => (
    <a key={l.href} href={l.href} aria-current={isCurrent(l.href) ? "page" : undefined}>
      {l.label}
    </a>
  );
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
          {audienceLinks.map(link)}
          <details className="dd">
            <summary data-current={inServices ? "" : undefined}>What We Do</summary>
            <div className="ddmenu">
              {link({ href: "/what-we-do/", label: "All capabilities" })}
              {services.map(link)}
            </div>
          </details>
          {mainAfterServices.map(link)}
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
