/** @type {import('next').NextConfig} */

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

// Marketing URLs renamed on 24 October 2026, mapped to their replacements.
// Each is listed with and without the trailing slash, because
// skipTrailingSlashRedirect makes them distinct paths.
const MOVED = {
  '/what-we-do/operational-excellence': '/services/operational-excellence/',
  '/what-we-do/commercial-excellence': '/services/commercial-excellence/',
  '/what-we-do/demand-generation': '/services/commercial-excellence/',
  '/what-we-do/new-business-development': '/services/profitable-growth/',
  '/what-we-do/governance-investment-readiness': '/services/investment-readiness/',
  '/services': '/what-we-do/',
  '/how-we-work': '/our-approach/',
  '/team': '/our-people/',
  '/results': '/experience-outcomes/',
  '/who-we-help': '/business-promoters/',
  '/enquiry': '/contact/',
  '/enquiry/thanks': '/contact/thanks/',
};

const nextConfig = {
  // Required for Docker: produces a minimal self-contained server bundle
  // (.next/standalone) that doesn't need node_modules copied wholesale
  // into the runtime image.
  output: 'standalone',

  // Marketing pages want /about/, the app wants /apply. src/middleware.ts
  // applies each rule to its own paths; Next's built-in redirect would force
  // one rule onto both.
  skipTrailingSlashRedirect: true,

  experimental: {
    // Marketing pages are prerendered, but keep the content fragments in the
    // standalone bundle in case a page is ever rendered at request time.
    outputFileTracingIncludes: {
      '/(site)/[[...slug]]': ['./src/content/site/**/*'],
      '/sitemap.xml': ['./src/content/site/**/*'],
      '/image-sitemap.xml': ['./src/content/site/**/*'],
    },
  },

  // With skipTrailingSlashRedirect on, /api/x/ would otherwise be served
  // as-is. Keep the 308 to /api/x that the app always had.
  async redirects() {
    return [
      { source: '/api/:path+/', destination: '/api/:path+', permanent: true },
      ...Object.entries(MOVED).flatMap(([from, to]) =>
        [from, `${from}/`].map((source) => ({ source, destination: to, permanent: true })),
      ),
    ];
  },

  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Filenames under /assets are not content-hashed, so a month rather than
      // a year: a same-name photo swap shows up without a manual purge.
      {
        source: '/assets/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' },
        ],
      },
      { source: '/admin/:path*', headers: noindex },
      { source: '/admin', headers: noindex },
      { source: '/apply/:path*', headers: noindex },
      { source: '/apply', headers: noindex },
      { source: '/api/:path*', headers: noindex },
    ];
  },
};

export default nextConfig;
