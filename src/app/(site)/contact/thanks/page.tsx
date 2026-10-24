import type { Metadata } from "next";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { pageMetadata } from "@/lib/site-pages";

export const metadata: Metadata = pageMetadata({
  title: "Thank you | GOP Growth Operating Partners",
  description:
    "Your enquiry has reached GOP. The team will review the information and respond if there is a suitable next step.",
  path: "/contact/thanks/",
  noindex: true,
});

export default function ThanksPage() {
  return (
    <>
      <SiteHeader current="/contact/thanks/" />
      <main id="main">
        <section className="hero">
          <div className="wrap">
            <h1>Thank you for contacting GOP.</h1>
          </div>
        </section>
        <div className="wrap prose">
          <p className="ok" role="status">
            Your enquiry has been received. The team will review the information
            and respond if there is a suitable next step.
          </p>
          <p>
            Meanwhile, read about <a href="/our-approach/">our approach</a> or
            browse our <a href="/insights/">insights</a>.
          </p>
          <p>
            <a href="/">Back to home</a>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
