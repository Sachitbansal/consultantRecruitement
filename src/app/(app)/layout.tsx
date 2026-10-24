import type { Metadata } from "next";
import localFont from "next/font/local";
import { site } from "@/lib/gop-content";
import "./globals.css";

// Root layout for the internal app: /apply (consultant intake) and /admin.
// The public marketing site has its own root layout in (site)/ with system
// fonts and its own stylesheet, so nothing here leaks into it or vice versa.
//
// Variable names are --font-display / --font-sans because globals.css and
// tailwind.config.ts both reference those two variables.
//
// Self-hosted (Google Fonts latin variable files in ./fonts) so the Docker
// build never needs to reach fonts.googleapis.com.
const display = localFont({
  src: "./fonts/fraunces-latin-var.woff2",
  weight: "100 900",
  variable: "--font-display",
  display: "swap",
});

const sans = localFont({
  src: "./fonts/inter-latin-var.woff2",
  weight: "100 900",
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.name,
    template: `%s — ${site.name}`,
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  // Intake form and admin are not search content. robots.ts also disallows
  // them and next.config.mjs sends X-Robots-Tag; this covers crawlers that
  // ignore both.
  robots: { index: false, follow: false },
};

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
