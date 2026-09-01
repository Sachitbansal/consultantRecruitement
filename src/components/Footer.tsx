import Image from "next/image";
import markLight from "@/public/gop-mark-light.png";
import { footer, nav, site } from "@/lib/gop-content";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-top">
          <div className="footer-brand">
            <Image src={markLight} alt={site.name} height={40} />
            <p className="wordmark">Growth Operating Partners</p>
            <p className="tagline">{site.tagline}</p>
          </div>
          <nav className="footer-links" aria-label="Footer">
            {nav.links.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="footer-bottom">
          <span>{footer.copyright}</span>
        </div>
      </div>
    </footer>
  );
}
