/**
 * Every word on the page lives here.
 *
 * Components read from this file and never hardcode copy, so revising the site
 * text means editing one file and never touching layout or markup.
 */

export const site = {
  name: "Growth Operating Partners",
  short: "GOP",
  tagline: "Operator-led Growth. Investor-ready Outcomes.",
  url: "https://gop.sbssdigital.com/",
  description:
    "We turn promoter-led businesses into institution-grade enterprises — reducing promoter dependency and building the systems that let you scale profitably.",
};

export const nav = {
  links: [
    { label: "What We Do", href: "#what-we-do" },
    { label: "How We Work", href: "#how-we-work" },
    { label: "Who We Work With", href: "#who-we-work-with" },
    { label: "Contact", href: "#contact" },
  ],
  cta: { label: "Book a Diagnostic Call", href: "#contact" },
};

export const hero = {
  eyebrow: "Growth Operating Partners",
  heading: "We turn promoter-led businesses into institution-grade enterprises.",
  sub: "We reduce promoter dependency and build the systems that let you scale profitably, faster. So when you raise capital, bring in a partner, or plan an exit — your business is valued for what it's actually worth.",
  primary: { label: "Book a Free Diagnostic Call", href: "#contact" },
  secondary: { label: "See What We Do", href: "#what-we-do" },
};

export const moment = {
  eyebrow: "The moment you're in",
  paragraphs: [
    "Your order book is strong. The market opportunity is real. But growth is starting to outpace your systems. Costing is fuzzy. MIS is outdated. Working capital is stretched thinner every quarter.",
    "And when an investor or a larger customer asks for numbers that hold up under scrutiny, you're not fully ready to hand them over.",
  ],
  pull: "You don't need another consulting report. You need someone who has actually run a business like yours to sit beside you and fix it.",
};

export const scale = {
  eyebrow: "How we create value — the S.C.A.L.E. Matrix",
  heading: "We diagnose first. Then we build the systems around what we find.",
  intro:
    "We start by understanding what's actually working, what's weak, and where the pain really sits — then build around that reality: doubling down on strengths, reinforcing weak points, and removing the friction that's slowing you down.",
  items: [
    {
      n: "01",
      title: "Business Transformation",
      body: "Diagnostic-to-execution support across strategy, operations, and organisation design — so change doesn't stop at a recommendation, it runs.",
    },
    {
      n: "02",
      title: "Revenue & Growth Acceleration",
      body: "New business development to open fresh revenue streams, upsell and cross-sell playbooks for your existing customers, and pricing strategy built for margin.",
    },
    {
      n: "03",
      title: "Operations & Financial Discipline",
      body: "Costing architecture, MIS systems, working capital discipline, and financial controls built to hold up under institutional scrutiny.",
    },
    {
      n: "04",
      title: "People & Performance",
      body: "Closing skill gaps, and building trackers and MIS templates that give your team clarity on what they own — and the tools to deliver faster.",
    },
    {
      n: "05",
      title: "AI-Led Efficiency",
      body: "Practical AI adoption built into how your business actually runs — sharpening decisions, cutting manual effort, and freeing your best people for higher-value work.",
    },
    {
      n: "06",
      title: "PE Readiness & Institutional Infrastructure",
      body: "QoE-grade reporting, governance structures, and the systems investors expect — so when diligence starts, you're ready, not scrambling.",
    },
    {
      n: "07",
      title: "Capital & Ecosystem Access",
      body: "Warm pathways into the PE/VC ecosystem, enabled by standing inside active investment committees — not placement agent services.",
    },
  ],
};

export const changes = {
  eyebrow: "What changes",
  heading: "Less dependence on you. More clarity for everyone else.",
  columns: [
    {
      title: "For You, the Promoter",
      items: [
        "MIS and trackers that keep you connected to the ground — without being in every conversation",
        "A business that runs without depending on you being everywhere at once",
        "Confidence to walk into a diligence room",
      ],
    },
    {
      title: "For Your People",
      items: [
        "Clear KPIs and KRAs — no ambiguity about what “good” looks like",
        "Skill gaps closed with real tools, not just training decks",
        "Faster, more confident decisions with less hand-holding",
      ],
    },
    {
      title: "For the Business",
      items: [
        "Stronger topline and healthier margins",
        "A brand that communicates its true value to the market",
        "A valuation that reflects what's actually been built",
      ],
    },
  ],
};

export const engage = {
  eyebrow: "How we work",
  statement:
    "We engage on a turnaround project-cost basis, with skin in the game built into the structure.",
  sub: "You win, we win — our success is tied to the outcomes we deliver, not the hours we spend.",
};

export const returns = {
  eyebrow: "The return",
  quote:
    "GOP isn't a cost — it's an investment, and the return on investing in your own business is a return no external asset can match. Stronger fundamentals mean a higher valuation when private equity comes to the table, faster growth once they're in, and greater value unlocked for everyone — promoter and investor alike — at the next milestone, whether that's an IPO or a strategic exit.",
};

export const steps = {
  eyebrow: "How it starts",
  heading: "Three steps. No obligation until you're ready.",
  items: [
    {
      title: "A free diagnostic call",
      body: "No pitch, no obligation — just an honest read on where your business stands and where the gaps are.",
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
};

export const fit = {
  eyebrow: "Who we work best with",
  statement:
    "Promoter-led and family-owned manufacturers in the ₹150–500 crore revenue range — businesses with real momentum that are ready to professionalise, but haven't found the right partner to do it with.",
  cta: { label: "Start the Conversation", href: "#contact" },
};

export const contact = {
  eyebrow: "Contact",
  heading: "Ready to see what's possible?",
  sub: "Tell us a little about your business. We'll follow up to schedule your free diagnostic call — no pitch, no obligation.",
  email: "gop@sbssdigital.com",
  responseTime: "Within 2 business days",
  submitLabel: "Book a Free Diagnostic Call",
  consent:
    "By submitting, you agree to be contacted about your enquiry. We don't share your information.",
  revenueOptions: [
    "Below ₹150 crore",
    "₹150–300 crore",
    "₹300–500 crore",
    "Above ₹500 crore",
  ],
};

export const footer = {
  copyright: `© ${new Date().getFullYear()} Growth Operating Partners. All rights reserved.`,
};
