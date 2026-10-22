import type { Metadata, Viewport } from "next";
import { site } from "@/lib/gop-content";
import "./site.css";

// Root layout for the public marketing site. Separate from (app)/layout.tsx so
// this side ships system font stacks only (no font downloads) and its own
// stylesheet, and the Tailwind app CSS never loads here.

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  applicationName: site.name,
  icons: {
    // /favicon.ico comes from src/app/favicon.ico automatically.
    icon: [{ url: "/assets/img/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: "/assets/img/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#011A41",
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
