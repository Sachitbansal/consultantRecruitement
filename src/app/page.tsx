import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <section className="border-b border-hairline">
        <div className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
          <p className="font-sans text-sm font-medium tracking-wide text-navy uppercase mb-6">
            GOP &mdash; Growth Operating Partners
          </p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-[1.05] text-ink max-w-3xl">
            Operator-led Growth. Investor-ready Outcomes.
          </h1>
          {/* PLACEHOLDER COPY: confirm Hindi tagline placement/translation with client before launch */}
          <p className="font-sans text-base text-muted mt-2">
            Private Equity se pehle bhi. Private Equity ke baad bhi.
          </p>
          <p className="font-sans text-lg text-ink/80 max-w-2xl mt-8 leading-relaxed">
            {/* PLACEHOLDER COPY: replace with final positioning paragraph */}
            GOP staffs experienced operators onto live delivery engagements
            for growth-stage and PE-backed businesses. No bench, no
            generalist headcount &mdash; you are brought in to run a specific
            function, hit a specific number, and hand over a business that
            runs without you.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/apply"
              className="inline-flex items-center justify-center rounded-md bg-navy px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-navy-deep"
            >
              Apply as a Consultant
            </Link>
          </div>
        </div>
      </section>

      {/* Who GOP is */}
      <section className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
        <h2 className="font-display text-2xl sm:text-3xl text-ink mb-6">
          What we do
        </h2>
        {/* PLACEHOLDER COPY: replace with final "About GOP" narrative from client */}
        <div className="grid sm:grid-cols-2 gap-8 font-sans text-ink/80 leading-relaxed">
          <p>
            GOP is an operator-led growth firm. We work alongside founders,
            CEOs, and PE-backed management teams to deliver on the plans
            everyone agrees on but rarely has the bandwidth to execute
            &mdash; sales, operations, finance, and organisation design.
          </p>
          <p>
            We don&apos;t sell decks. We put an operator on the ground with
            the client, with a clear scope and a clear number to hit. Our
            consultants have run functions, not just advised on them
            &mdash; that&apos;s the entire premise of the firm.
          </p>
        </div>
      </section>

      {/* Dark section: why join */}
      <section className="bg-navy-deep text-white">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <h2 className="font-display text-2xl sm:text-3xl mb-8">
            Why operators join GOP
          </h2>
          {/* PLACEHOLDER COPY: replace with final value props from client */}
          <div className="grid sm:grid-cols-3 gap-8 font-sans text-white/80 leading-relaxed">
            <div>
              <h3 className="font-display text-lg text-white mb-2">
                Real delivery work
              </h3>
              <p>
                You run a function inside a live business, not a slide
                review. The engagement is judged on the number, not the
                narrative.
              </p>
            </div>
            <div>
              <h3 className="font-display text-lg text-white mb-2">
                Built for experienced operators
              </h3>
              <p>
                Roles are scoped for people with 5 to 25+ years of hands-on
                functional experience &mdash; not entry-level consulting.
              </p>
            </div>
            <div>
              <h3 className="font-display text-lg text-white mb-2">
                Flexible engagement model
              </h3>
              <p>
                Work remote or on-site, on the functions and industries you
                already know, at the cadence the engagement calls for.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-5xl px-6 py-16 sm:py-24 text-center">
        <h2 className="font-display text-2xl sm:text-3xl text-ink mb-4">
          Ready to apply?
        </h2>
        <p className="font-sans text-muted max-w-xl mx-auto mb-8">
          The application takes about ten minutes. Have your CV ready before
          you start.
        </p>
        <Link
          href="/apply"
          className="inline-flex items-center justify-center rounded-md bg-navy px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-navy-deep"
        >
          Start Application
        </Link>
      </section>
    </main>
  );
}
