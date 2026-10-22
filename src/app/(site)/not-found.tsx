import type { Metadata } from "next";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";

export const metadata: Metadata = {
  title: { absolute: "Page not found | GOP" },
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <SiteHeader current="" />
      <main id="main">
        <section className="hero">
          <div className="wrap">
            <h1>Page not found</h1>
          </div>
        </section>
        <div className="wrap prose">
          <p>
            The page you are looking for does not exist. Try the{" "}
            <a href="/">home page</a>, <a href="/what-we-do/">what we do</a> or{" "}
            <a href="/insights/">insights</a>.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
