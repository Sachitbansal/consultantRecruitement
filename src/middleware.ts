import { NextResponse, type NextRequest } from "next/server";

/**
 * Trailing slashes, per side of the site.
 *
 * Marketing pages are canonical WITH a trailing slash (/about/). The internal
 * app (/api, /apply, /admin) keeps Next's default of no trailing slash. Next's
 * global `trailingSlash` option can only pick one rule for everything, so
 * next.config.mjs sets `skipTrailingSlashRedirect` and both rules live here.
 *
 * Redirect targets are built from the Host / X-Forwarded-* headers nginx
 * passes, not from request.url, which can carry the container's bind address
 * (0.0.0.0:3000) rather than the public host.
 */

const APP_PREFIXES = ["/api", "/apply", "/admin"];

function redirect(req: NextRequest, location: string, status: 301 | 308) {
  const host =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  const proto =
    req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(/:$/, "");
  return NextResponse.redirect(new URL(location, `${proto}://${host}`), status);
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (pathname === "/index.html") return redirect(req, `/${search}`, 301);

  const isApp = APP_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (isApp) {
    // Same behaviour Next had before skipTrailingSlashRedirect was turned on.
    if (pathname.length > 1 && pathname.endsWith("/")) {
      return redirect(req, `${pathname.replace(/\/+$/, "")}${search}`, 308);
    }
    return NextResponse.next();
  }

  if (!pathname.endsWith("/")) return redirect(req, `${pathname}/${search}`, 308);
  return NextResponse.next();
}

export const config = {
  // Skip Next internals and anything that looks like a file (robots.txt,
  // sitemap.xml, images, llms.txt, the IndexNow key), plus /index.html itself.
  matcher: ["/index.html", "/((?!_next/|.*\\.[^/]+$).*)"],
};
