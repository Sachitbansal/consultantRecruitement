/**
 * Copy for the /enquiry/ page and the contact form, plus the site-wide facts
 * every page shares.
 *
 * The other marketing pages are HTML fragments in src/content/site/ — see
 * src/lib/site-pages.ts. Only the enquiry page is React, because it hosts the
 * interactive ContactForm.
 */

export const site = {
  name: "GOP - Growth Operating Partners",
  short: "GOP",
  tagline: "Operator-led Growth. Investor-ready Outcomes.",
  hindi: "Investment se pehle bhi. Investment ke baad bhi.",
  url: "https://gop.sbssdigital.com/",
  email: "gop@sbssdigital.com",
  linkedin: "https://www.linkedin.com/showcase/growthoperatingpartners/",
  parent: { name: "SBSSdigital", url: "https://sbssdigital.com" },
  foundingDate: "2021",
  /** The one-line description. Keep it word-for-word identical everywhere. */
  about:
    "GOP (Growth Operating Partners) is the growth consulting and strategy execution vertical of SBSSdigital. Several cohort mates from the IIM Calcutta Executive Programme have come together to build and scale GOP, an operator-led collective of senior professionals with 100+ years of combined hands-on experience.",
  ogImage: "/assets/img/og-gop-operator-led-growth.png",
};

/** Primary call to action, used on every page. */
export const cta = { label: "Book a Free Diagnostic Call", href: "/enquiry/" };

export const enquiry = {
  hero: {
    heading: "Book a free diagnostic call with GOP",
    sub: "We turn promoter-led businesses into institution-grade enterprises: reducing promoter dependency and building the systems that let you scale profitably, faster. So when you raise capital, bring in a partner, or plan an exit, your business is valued for what it's actually worth.",
  },
  answer:
    "Fill in the form below or email gop@sbssdigital.com. Tell us where your business is today and where you want it to be. A senior GOP operator will reply within two business days to set up a free diagnostic call: no pitch, no obligation, and an honest read on whether and how we can help.",
  moment: {
    heading: "The moment you're in",
    paragraphs: [
      "Your order book is strong. The market opportunity is real. But growth is starting to outpace your systems. Costing is fuzzy. MIS is outdated. Working capital is stretched thinner every quarter.",
      "And when an investor or a larger customer asks for numbers that hold up under scrutiny, you're not fully ready to hand them over.",
    ],
    pull: "You don't need another consulting report. You need someone who has actually run a business like yours to sit beside you and fix it.",
  },
  changes: {
    heading: "What changes",
    intro: "Less dependence on you. More clarity for everyone else.",
    columns: [
      {
        title: "For you, the promoter",
        items: [
          "MIS and trackers that keep you connected to the ground, without being in every conversation",
          "A business that runs without depending on you being everywhere at once",
          "Confidence to walk into a diligence room",
        ],
      },
      {
        title: "For your people",
        items: [
          "Clear KPIs and KRAs, with no ambiguity about what “good” looks like",
          "Skill gaps closed with real tools, not just training decks",
          "Faster, more confident decisions with less hand-holding",
        ],
      },
      {
        title: "For the business",
        items: [
          "Stronger topline and healthier margins",
          "A brand that communicates its true value to the market",
          "A valuation that reflects what's actually been built",
        ],
      },
    ],
  },
  steps: {
    heading: "How it starts",
    intro: "Three steps. No obligation until you're ready.",
    items: [
      {
        title: "A free diagnostic call",
        body: "No pitch, no obligation: just an honest read on where your business stands and where the gaps are.",
      },
      {
        title: "A focused engagement plan",
        body: "We tell you exactly what we'll fix, in what order, and how we'll measure it.",
      },
      {
        title: "Hands-on execution",
        body: "We work inside your business until the systems are running and the results are visible.",
      },
    ],
  },
  fit: {
    heading: "Who we work best with",
    statement:
      "Promoter-led and family-owned manufacturers in the ₹150–500 crore revenue range: businesses with real momentum that are ready to professionalise, but haven't found the right partner to do it with.",
  },
};

export const contact = {
  heading: "Tell us about your business",
  email: site.email,
  responseTime: "Within 2 business days",
  submitLabel: cta.label,
  consent:
    "By submitting, you agree to be contacted about your enquiry. We don't share your information.",
  revenueOptions: [
    "Below ₹150 crore",
    "₹150–300 crore",
    "₹300–500 crore",
    "Above ₹500 crore",
  ],
};
