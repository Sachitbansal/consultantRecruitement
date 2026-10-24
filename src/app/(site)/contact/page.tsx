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

// React rather than an HTML fragment because it hosts the interactive form.

const PATH = "/contact/";
const TITLE = "Contact GOP | Start a Conversation";
const DESCRIPTION =
  "Contact GOP about profitable growth, investment readiness, growth capital or portfolio value creation. For business promoters, investors and PE/VC funds.";
const UPDATED = "2026-10-24";

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
      { name: "Contact", url: abs(PATH) },
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

export default function ContactPage() {
  return (
    <>
      <SiteHeader current={PATH} />
      <main id="main">
        <section className="hero big">
          <div className="wrap">
            <nav className="crumbs" aria-label="Breadcrumb">
              <a href="/">Home</a> &rsaquo; <span>Contact</span>
            </nav>
            <h1>{enquiry.hero.heading}</h1>
            <p className="lead">{enquiry.hero.sub}</p>
            <p className="hindi">{site.hindi}</p>
            <p className="byline">
              By <strong>GOP Editorial</strong> &middot; Updated{" "}
              <time dateTime={UPDATED}>24 October 2026</time>
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
            <strong>How do I contact GOP?</strong> {enquiry.answer}
          </p>

          <h2>{enquiry.audiences.heading}</h2>
          <p>{enquiry.audiences.intro}</p>
          <div className="grid">
            {enquiry.audiences.columns.map((column) => (
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

          <h2 id="form">{contact.heading}</h2>
          <p>
            Email <a href={`mailto:${contact.email}`}>{contact.email}</a> or use
            the form.
          </p>
          <ContactForm />
          <p className="note">
            We use your details only to respond to your enquiry. See the{" "}
            <a href="/privacy-policy/">privacy policy</a>.
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
