import { site } from "@/lib/gop-content";
import { audienceLinks, legalLinks } from "./nav";

const explore = [
  ...audienceLinks,
  { href: "/what-we-do/", label: "What We Do" },
  { href: "/our-approach/", label: "Our Approach" },
  { href: "/about/", label: "About GOP" },
  { href: "/our-people/", label: "Our People" },
  { href: "/experience-outcomes/", label: "Experience and Outcomes" },
  { href: "/insights/", label: "Insights" },
  { href: "/glossary/", label: "Glossary" },
  { href: "/contact/", label: "Contact" },
];

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="fcols">
          <div>
            <h2>Growth Operating Partners</h2>
            <p>{site.tagline}</p>
            <p className="tag">{site.hindi}</p>
            <p>
              A vertical of{" "}
              <a href={site.parent.url} rel="noopener">
                {site.parent.name}
              </a>
              .
            </p>
          </div>
          <div>
            <h2>Explore</h2>
            <ul>
              {explore.map((link) => (
                <li key={link.href}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2>Contact</h2>
            <ul>
              <li>
                <a href={`mailto:${site.email}`}>{site.email}</a>
              </li>
              <li>
                <a href={site.linkedin} rel="noopener me" target="_blank">
                  GOP on LinkedIn
                </a>
              </li>
            </ul>
            <h2 style={{ marginTop: "1.2em" }}>Legal</h2>
            <ul>
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="fine">gop.sbssdigital.com</p>
        <p className="fine2">
          &copy; {new Date().getFullYear()} Growth Operating Partners. All rights reserved.
          Outcomes shown on this site are prior-career work of GOP practice leads, not
          GOP client results, unless stated otherwise.
        </p>
      </div>
    </footer>
  );
}
