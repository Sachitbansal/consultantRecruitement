import { NextResponse, type NextRequest } from "next/server";

/**
 * Trailing slashes, per side of the site.
 *
 * Marketing pages are canonical WITH a trailing slash (/about/). The internal
 * app (/api, /apply, /admin) keeps the no-trailing-slash form it always had. Next's
 * global `trailingSlash` option can only pick one rule for everything, so
 * next.config.mjs sets `skipTrailingSlashRedirect` and both rules live here.
 *
 * Redirect targets are built from the Host header (nginx sets it to the
 * server_name) and X-Forwarded-Proto (nginx overwrites it with $scheme), not
 * from request.url, which can carry the container's bind address. A
 * client-supplied X-Forwarded-Host is deliberately ignored: nginx does not
 * set it, so honouring it would let a request choose the redirect host.
 */

// /api never reaches middleware (see matcher); its trailing-slash redirect is
// in next.config.mjs redirects().
const APP_PREFIXES = ["/apply", "/admin"];

function redirect(req: NextRequest, location: string, status: 301 | 308) {
  const host = req.headers.get("host") ?? req.nextUrl.host;
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
  // /api is excluded entirely, so API calls, including CV uploads, never
  // pass through middleware.
  matcher: ["/index.html", "/((?!_next/|api/|api$|.*\\.[^/]+$).*)"],
};
