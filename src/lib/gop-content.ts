/**
 * Copy for the /contact/ page and the contact form, plus the site-wide facts
 * every page shares.
 *
 * The other marketing pages are HTML fragments in src/content/site/ — see
 * src/lib/site-pages.ts. Only the contact page is React, because it hosts the
 * interactive ContactForm.
 */

export const site = {
  name: "GOP - Growth Operating Partners",
  short: "GOP",
  /** Primary headline. Do not replace with generic institutional language. */
  headline: "We Build Businesses That Grow Profitably and Attract Capital.",
  /** Supporting statement, used as the slogan and footer line. */
  tagline:
    "Operator-led growth, institutional readiness and value creation for promoter-led businesses.",
  hindi: "Investment se pehle bhi. Investment ke baad bhi.",
  url: "https://gop.sbssdigital.com/",
  email: "gop@sbssdigital.com",
  linkedin: "https://www.linkedin.com/showcase/growthoperatingpartners/",
  parent: { name: "SBSSdigital", url: "https://sbssdigital.com" },
  foundingDate: "2021",
  /**
   * The standard brand description. Keep it word-for-word identical on the
   * website, company profile, LinkedIn and business development material.
   */
  about:
    "GOP is an operator-led growth and value-creation partner that helps promoter-led businesses scale profitably, become investment-ready, access growth capital, and deliver measurable returns after investment.",
  /** Where GOP comes from: the parent-company and credential line. */
  origin:
    "GOP (Growth Operating Partners) is the growth consulting and strategy execution vertical of SBSSdigital. Several cohort mates from the IIM Calcutta Executive Programme have come together to build and scale GOP, an operator-led collective of senior professionals with 100+ years of combined hands-on experience.",
  ogImage: "/assets/img/og-gop-operator-led-growth.png",
};

/** Primary call to action, used in the header on every page. */
export const cta = { label: "Start a Conversation", href: "/contact/" };

/** The three audience journeys. `id` is the contact form's "I am a" value. */
export const audiences = [
  { id: "promoter", label: "Business Promoter", href: "/business-promoters/", cta: "Discuss Your Business Growth" },
  { id: "investor", label: "Investor", href: "/investors/", cta: "Start an Investor Conversation" },
  { id: "fund", label: "PE/VC Fund", href: "/pe-vc-funds/", cta: "Discuss Portfolio Value Creation" },
];

export const enquiry = {
  hero: {
    heading: "Let’s Start with the Business Challenge.",
    sub: "Whether you want to grow a business, explore an investment opportunity or improve portfolio performance, tell us what you are trying to achieve.",
  },
  answer:
    "Use the form below or email gop@sbssdigital.com. Tell us who you are, what you want to achieve and what is in the way. The team reviews every enquiry and replies where there is a suitable next step. For business promoters, the first step is usually a free diagnostic conversation about the business.",
  audiences: {
    heading: "What to tell us",
    intro: "A few lines are enough to start. Please do not send confidential financial documents through this form.",
    columns: [
      {
        title: "Business promoters",
        items: [
          "Where the business is today: revenue band, sector, markets",
          "What you want it to achieve over the next two to three years",
          "What is holding growth, margins or readiness back",
          "Whether you are considering growth capital",
        ],
      },
      {
        title: "Investors",
        items: [
          "The kind of businesses and stage you are interested in",
          "Whether you want to hear about businesses preparing to raise growth capital",
          "Any business you would like to introduce to GOP",
        ],
      },
      {
        title: "PE/VC funds",
        items: [
          "The portfolio company or opportunity in question",
          "The investment thesis and what must happen after investment",
          "Where execution is falling behind the plan",
        ],
      },
    ],
  },
  steps: {
    heading: "How it starts",
    intro: "No obligation on either side until there is a clear fit.",
    items: [
      {
        title: "An initial conversation",
        body: "We discuss the business, the objective and the challenge. For promoters this can be a free diagnostic conversation: an honest first read on where the gaps are.",
      },
      {
        title: "A mutual fit check",
        body: "Both sides decide whether GOP's capabilities fit the need. If they do not, we say so.",
      },
      {
        title: "An agreed scope",
        body: "If there is a fit, we agree the scope, responsibilities, expected outputs and how progress will be measured.",
      },
    ],
  },
};

export const contact = {
  heading: "Tell us what you are trying to achieve",
  email: site.email,
  submitLabel: "Send Enquiry",
  personas: [
    { value: "promoter", label: "Business Promoter" },
    { value: "investor", label: "Investor" },
    { value: "fund", label: "PE/VC Fund" },
    { value: "other", label: "Other" },
  ],
  topics: [
    "Profitable growth and market expansion",
    "Commercial excellence and brand growth",
    "Operational excellence and margin improvement",
    "Governance and investment readiness",
    "Raising growth capital",
    "Post-investment or portfolio value creation",
    "Digital growth and AI",
    "Something else",
  ],
  revenueOptions: [
    "Below ₹150 crore",
    "₹150–300 crore",
    "₹300–500 crore",
    "Above ₹500 crore",
  ],
};
