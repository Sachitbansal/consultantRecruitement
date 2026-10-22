/** @type {import('next').NextConfig} */

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

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
    return [{ source: '/api/:path+/', destination: '/api/:path+', permanent: true }];
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
