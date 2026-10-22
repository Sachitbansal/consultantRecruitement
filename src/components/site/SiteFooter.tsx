import { site } from "@/lib/gop-content";

const explore = [
  { href: "/about/", label: "About GOP" },
  { href: "/what-we-do/", label: "What we do" },
  { href: "/how-we-work/", label: "How we work" },
  { href: "/who-we-help/", label: "Who we help" },
  { href: "/gop-vs-consultants/", label: "GOP vs consultants" },
  { href: "/results/", label: "Results" },
  { href: "/team/", label: "Team" },
  { href: "/insights/", label: "Insights" },
  { href: "/enquiry/", label: "Enquiry" },
];

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="fcols">
          <div>
            <h2>{site.name}</h2>
            <p>{site.about}</p>
            <p className="tag">{site.tagline}</p>
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
            <h2>Connect</h2>
            <ul>
              <li>
                <a href={`mailto:${site.email}`}>{site.email}</a>
              </li>
              <li>
                <a href={site.linkedin} rel="noopener me" target="_blank">
                  GOP on LinkedIn
                </a>
              </li>
              <li>
                A vertical of{" "}
                <a href={site.parent.url} rel="noopener">
                  {site.parent.name}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <p className="fine">gop.sbssdigital.com</p>
        <p className="fine2">
          &copy; {new Date().getFullYear()} {site.name}, a vertical of {site.parent.name}.
          Results shown are anonymised and delivered by GOP practice leads in earlier
          engagements.
        </p>
      </div>
    </footer>
  );
}
