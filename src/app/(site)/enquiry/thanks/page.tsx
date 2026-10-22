import type { Metadata } from "next";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { contact } from "@/lib/gop-content";
import { pageMetadata } from "@/lib/site-pages";

export const metadata: Metadata = pageMetadata({
  title: "Thank you | GOP Growth Operating Partners",
  description:
    "Your enquiry has reached GOP. A senior operator will reply within two business days to set up your free diagnostic call. No pitch, no obligation.",
  path: "/enquiry/thanks/",
  noindex: true,
});

export default function ThanksPage() {
  return (
    <>
      <SiteHeader current="/enquiry/thanks/" />
      <main id="main">
        <section className="hero">
          <div className="wrap">
            <h1>Thank you</h1>
          </div>
        </section>
        <div className="wrap prose">
          <p className="ok" role="status">
            Your enquiry has been sent. We will reply to the email address you
            provided, {contact.responseTime.toLowerCase()}.
          </p>
          <p>
            While you wait, read <a href="/how-we-work/">how a GOP engagement works</a>{" "}
            or browse our <a href="/insights/">insights</a>.
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
