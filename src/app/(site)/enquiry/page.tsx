import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { contact, enquiry, site } from "@/lib/gop-content";
import {
  abs,
  breadcrumbNode,
  jsonLdScript,
  pageMetadata,
} from "@/lib/site-pages";

// The former single-page landing site, moved here when the root became the
// authority hub. Its framework and cost-basis sections were dropped in the move.

const PATH = "/enquiry/";
const TITLE = "Book a Free Diagnostic Call | GOP Growth Operating Partners";
const DESCRIPTION =
  "Book a free diagnostic call with GOP. Tell us about your manufacturing business and a senior operator will reply within two business days, with no pitch.";
const UPDATED = "2026-10-23";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
});

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    breadcrumbNode([
      { name: "Home", url: abs("/") },
      { name: "Enquiry", url: abs(PATH) },
    ]),
    {
      "@type": "ContactPage",
      "@id": `${abs(PATH)}#page`,
      url: abs(PATH),
      name: TITLE,
      description: DESCRIPTION,
      isPartOf: { "@id": abs("/#website") },
      about: { "@id": abs("/#organization") },
      inLanguage: "en-IN",
      dateModified: UPDATED,
    },
  ],
};

export default function EnquiryPage() {
  return (
    <>
      <SiteHeader current={PATH} />
      <main id="main">
        <section className="hero big">
          <div className="wrap">
            <nav className="crumbs" aria-label="Breadcrumb">
              <a href="/">Home</a> &rsaquo; <span>Enquiry</span>
            </nav>
            <h1>{enquiry.hero.heading}</h1>
            <p className="lead">{enquiry.hero.sub}</p>
            <p className="hindi">{site.hindi}</p>
            <p className="byline">
              By <strong>GOP Editorial</strong> &middot; Updated{" "}
              <time dateTime={UPDATED}>23 October 2026</time>
            </p>
            <p>
              <a className="btn" href="#form">
                Go to the form
              </a>
            </p>
          </div>
        </section>

        <div className="wrap prose">
          <p className="answer">
            <strong>How do I book a diagnostic call with GOP?</strong>{" "}
            {enquiry.answer}
          </p>

          <h2>{enquiry.moment.heading}</h2>
          {enquiry.moment.paragraphs.map((text) => (
            <p key={text}>{text}</p>
          ))}
          <p className="pull">{enquiry.moment.pull}</p>

          <h2>{enquiry.changes.heading}</h2>
          <p>{enquiry.changes.intro}</p>
          <div className="grid">
            {enquiry.changes.columns.map((column) => (
              <div className="card" key={column.title}>
                <h3>{column.title}</h3>
                <ul>
                  {column.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <h2>{enquiry.steps.heading}</h2>
          <p>{enquiry.steps.intro}</p>
          <div className="grid">
            {enquiry.steps.items.map((step, i) => (
              <div className="card" key={step.title}>
                <span className="num">{i + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>

          <h2>{enquiry.fit.heading}</h2>
          <p>
            {enquiry.fit.statement} See <a href="/who-we-help/">who we help</a>.
          </p>

          <h2 id="form">{contact.heading}</h2>
          <p>
            Email <a href={`mailto:${contact.email}`}>{contact.email}</a> or use
            the form. Response time: {contact.responseTime.toLowerCase()}.
          </p>
          <ContactForm />
          <p className="note">
            We use your details only to respond to your enquiry. {site.about}
          </p>
        </div>
      </main>
      <SiteFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />
    </>
  );
}
