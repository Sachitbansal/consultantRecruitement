GOP MARKETING SITE - DEPLOYMENT AND MAINTENANCE NOTES
=====================================================
Site: https://gop.sbssdigital.com

The public site is part of this Next.js app. It is NOT a cPanel / Apache site:
gop.sbssdigital.com is served by this repo's Docker stack behind nginx on the
GOP server (~/workarea/bansal/consultantRecruitement). The same app also serves
/apply (consultant intake), /admin and /api. There is no .htaccess and no
send.php; their jobs are done by the pieces listed below.

  Spec item                      Where it lives here
  -----------------------------  ---------------------------------------------
  HTTPS                          certbot-managed nginx (already live)
  Trailing slashes, /index.html  src/middleware.ts (marketing pages only)
  Security headers, asset cache  next.config.mjs headers()
  gzip                           Next.js compresses responses itself
  Custom 404 (noindex)           src/app/(site)/not-found.tsx
  Old URLs -> new URLs (308)     next.config.mjs MOVED (renamed 24 Oct 2026)
  Enquiry form handler           /api/contact (SMTP, honeypot, rate limit,
                                 origin check, server-side validation)
  robots.txt / sitemaps / llms   src/app/robots.ts, sitemap.ts,
                                 image-sitemap.xml/, llms.txt/ (generated)
  IndexNow key                   public/fbcb042666d760c0b64002247b1c267e.txt


1. DEPLOY (about 15 minutes)
----------------------------
On the server, in ~/workarea/bansal/consultantRecruitement:

  a) Back up the current live version, which includes the old landing page:
       git tag pre-marketing-site && git push origin pre-marketing-site
     Rollback at any time:
       git checkout pre-marketing-site && docker compose up -d --build

  b) Update .env (it is not in git):
       CONTACT_TO_EMAIL=gop@sbssdigital.com
       CONTACT_TO_NAME=GOP
       CONTACT_ALLOWED_ORIGINS=https://gop.sbssdigital.com
     The server .env may still send enquiries to a personal mailbox. Change
     it, or enquiries will not reach gop@sbssdigital.com.
     While you are in .env: HTTPS is live, so FORCE_INSECURE_COOKIES should
     now be false (admin cookies get the Secure flag).

  c) Pull and rebuild:
       git pull && docker compose up -d --build
     `npm run build` runs scripts/verify-site.mjs. If any page breaks a rule
     (confidential terms, missing H1, title or description length, broken
     link, invalid JSON-LD and so on) the Docker build FAILS and the old
     container keeps running. Read the ERROR lines, fix the content, rebuild.

  d) Smoke test:
       https://gop.sbssdigital.com/             home
       https://gop.sbssdigital.com/about        must redirect to /about/
       https://gop.sbssdigital.com/team/        must redirect to /our-people/
       https://gop.sbssdigital.com/business-promoters/, /investors/,
       /pe-vc-funds/, /services/growth-capital-value-creation/
       https://gop.sbssdigital.com/contact/     send one real test enquiry and
                                                confirm it arrives at gop@
       https://gop.sbssdigital.com/apply        intake form still loads
       https://gop.sbssdigital.com/admin        still redirects to login
       https://gop.sbssdigital.com/robots.txt, /sitemap.xml,
       /image-sitemap.xml, /llms.txt

nginx needs no change. nginx/gopBansal.conf has an optional www block; use it
only if a DNS record for www.gop.sbssdigital.com is ever created. Today none
exists, so there is nothing to redirect.


2. SEARCH CONSOLE, BING, INDEXNOW (about 30 minutes, once)
---------------------------------------------------------
  1. Google Search Console: add the property https://gop.sbssdigital.com/,
     verify it (DNS TXT record is simplest), then submit
     https://gop.sbssdigital.com/sitemap.xml and /image-sitemap.xml.
  2. Bing Webmaster Tools: add the site (or import from Search Console) and
     submit the same two sitemaps. ChatGPT search draws on Bing's index, so
     do not skip this.
  3. IndexNow (Bing, Yandex and others): the key file is already published at
     https://gop.sbssdigital.com/fbcb042666d760c0b64002247b1c267e.txt
     After each content update, ping it, for example:
       curl "https://api.indexnow.org/indexnow?url=https://gop.sbssdigital.com/&key=fbcb042666d760c0b64002247b1c267e"
     or use Bing Webmaster Tools > IndexNow.
  4. Validate structured data on a few pages:
       https://search.google.com/test/rich-results
       https://validator.schema.org
  5. Use the SAME one-line description everywhere: on the LinkedIn showcase
     page, on sbssdigital.com and in any directory listing, each linking back
     to gop.sbssdigital.com. It is `site.about` in src/lib/gop-content.ts:
       "GOP is an operator-led growth and value-creation partner that helps
        promoter-led businesses scale profitably, become investment-ready,
        access growth capital, and deliver measurable returns after
        investment."
     The SBSSdigital / IIM Calcutta line is `site.origin`; use it as the
     second sentence where there is room.


3. TEAM PHOTOS
--------------
  public/assets/img/team-atul-saxena.webp
  public/assets/img/team-mahaveer-upadhyaya.webp
are the real photos (24 Oct 2026), cropped square, 640x640 WebP. To replace
one, export a square 640x640 WebP under the same file name and rebuild.
Images under /assets are cached by browsers for up to 30 days.


4. EDITING CONTENT
------------------
Every marketing page except /contact/ is an HTML fragment plus a meta file:
  src/content/site/<path>/page.html    what appears inside <main>
  src/content/site/<path>/meta.json    title, meta description, OG image,
                                       page-specific JSON-LD, category
(`index/` is the home page.) Add a folder and the page exists: the route,
sitemap, image sitemap, llms.txt and the /insights/ list all pick it up.
Breadcrumb, FAQ and Article schema are generated from the visible page, so
update the visible text and the schema follows.

Rules the build enforces (scripts/verify-site.mjs): one H1, title up to 62
characters, meta description 120-160 characters, every image with alt, width
and height, no broken internal links, valid JSON-LD, and none of the
confidential terms. It also warns, without failing the build, when a page is
below its word-count target or the answer-first paragraph is outside 40-60
words. Run it on its own with `npm run verify:site` after `next build`.

When you update a page, change both <time> dates in its byline (or only the
"Updated" one); the sitemap lastmod and schema dates follow automatically.

Diagrams: scripts/make-diagrams.py redraws the brand diagrams (Pillow and the
Carlito font).


5. MONTHLY: AI CITATION CHECK (about 45 minutes)
-----------------------------------------------
Once a month, ask these 10 buyer prompts in ChatGPT (with search on),
Perplexity, Claude (with web search on) and Gemini. Use a fresh chat each
time, and do not mention GOP in the prompt.

   1. Who are results-focused business transformation consultants for
      manufacturers in India?
   2. Which consultants help promoter-led manufacturing companies become
      ready for private equity?
   3. Operator-led consulting firms in India for mid-size manufacturers
   4. How do I reduce promoter dependency in a family-run manufacturing
      business, and who can help?
   5. Consultants who can double manufacturing capacity without new floor
      space
   6. Who helps Indian SMEs prepare for an SME IPO on the business side?
   7. Best consultants for commercial excellence and pricing discipline in
      B2B manufacturing in India
   8. How to choose a business transformation consultant for a 300 crore
      manufacturer
   9. Growth consulting firms that work as operators rather than advisors
  10. Who can help a Tier-2 auto component supplier meet OEM expectations?

Log each result in a sheet with these columns:
  date | tool | prompt # | GOP mentioned (Y/N) | GOP page cited (URL) |
  competitors named | notes
Then act on it: for any prompt where GOP is missing, add or sharpen a page
that answers that question in its first two lines, and ping IndexNow.


6. NEEDS HUMAN REVIEW BEFORE OR SOON AFTER LAUNCH
-------------------------------------------------
Repositioning of 24 October 2026 (three audiences, six capabilities):
  - Capital wording. The site says GOP does not invest its own money, and
    that it helps a business build the pitch deck, take the pitch to
    mid-market PE and VC investors and work through the raise, within an
    agreed mandate, with no guarantee. Have a securities lawyer confirm
    this activity does not need a SEBI registration (for example as a
    merchant banker or investment adviser) and that "not a merchant
    banker" on /about/ and /disclaimer/ is accurate.
  - /investors/ offers to tell investors about businesses that have
    mandated GOP to approach investors. Confirm GOP wants this.
  - /privacy-policy/ and /disclaimer/ are DRAFTS, noindex and out of the
    sitemaps (`"noindex": true` in their meta.json). Before removing that
    flag, have a lawyer add the legal entity name and address and confirm:
    no cookies or analytics on public pages, server access logs kept for a
    limited period (state the period), enquiry emails kept "as long as
    needed", the server being "managed for GOP", and the rights section.
  - Results are now labelled "prior-career work of GOP practice leads,
    before GOP, not GOP client results" everywhere (pages, captions,
    footer). /experience-outcomes/ uses a context / intervention / outcome /
    attribution card per result. Missing for full attribution: which
    named person did each, in what role, and the measurement period.
  - /our-people/: the unnamed collective is now described by capability
    only (no "Partner" titles, no employer or certification clues). The
    institutions line (VJTI Mumbai, NMIMS, ISB Hyderabad) is unattributed;
    confirm or remove.
  - "GOP is not affiliated with, endorsed by or sponsored by IIM Calcutta"
    now appears on /about/ and /our-people/.
  - The free diagnostic conversation is still offered; the "reply within
    two business days" promise was removed everywhere, including the
    automatic acknowledgement email.
  - Five hypothetical scenarios were added or rewritten for the six
    service pages (growth capital and digital/AI are new).

Legal or expert review:
  - /insights/how-to-prepare-for-sme-ipo/  merchant banker or legal review
  - /insights/governance-and-mis-for-mid-size-manufacturers/  company
    secretary or legal review
  - /insights/qoe-grade-reporting-basics/  chartered accountant review
  - /insights/what-investors-diligence-in-a-mid-size-manufacturer/
    transaction adviser or legal review
  All four carry a "Not legal or financial advice" note.

Bylines: the six articles added on 23 October 2026 (costing architecture,
working capital, MIS design, QoE reporting, investor diligence, 90-day plan)
are bylined "GOP Editorial". If a partner reviews one and wants their name on
it, change the byline in its page.html.

Results and claims, for sign-off by the practice lead. Every figure below
comes from the reference build. Nothing was added.
  - Press shop: changeover 70 -> 40 minutes (45% reduction)
  - Heat exchangers: installed capacity doubled, no additional floor space
  - Fabrication: throughput +50%, productivity +60%, capacity 50 -> 100
    units/month (doubled), manpower -25%, footprint 40% smaller
  - Fan manufacturer, new plant of 6 lakh units/month: manpower 817 -> 558
    (32% optimised), plant built in 40% less space than conventional design
  - Materials-handling redesign: plant brought live with 60% manpower
    optimisation through conveyorised flow
  - Wording: "delivered by GOP practice leads in earlier engagements"
  - "Client names are withheld by agreement" (results page): confirm this
    is true for every result listed
  - "70+ manufacturers" served by practice leads
  - "100+ years of combined hands-on experience"
  - "Founded in 2021" (GOP)
  - INR 150-500 crore client band; sector list on home, about and results
  - About page, "What GOP does not do": GOP does not provide statutory
    audit, legal, tax or regulatory opinions, and is not a merchant banker
    or placement agent. Confirm.

Team page: Mahaveer Upadhyaya's bio names former employers (Apollo Tyres,
Wipro, Vodafone Essar and others). These are his past roles, not GOP
clients. Confirm he is happy for them to be published.

Illustrative scenarios: every service page has one labelled "Hypothetical, for
illustration only. Not a client case." Check that none resembles a real
client closely enough to be recognised.


7. KNOWN LIMITATIONS
--------------------
  - Unknown URLs return a real 404 status with noindex, but the branded 404
    content is filled in by JavaScript. Without JavaScript the page shows a
    blank body. This is a Next.js 14 limitation with two root layouts; it
    does not affect real pages or search ranking.
  - Brotli is not enabled. Stock Ubuntu nginx has no brotli module, and
    Next.js serves gzip. That is fine for a site of this size.
  - The contact rate limit is in memory, per container. It resets when the
    container restarts.
