import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

// ---------------------------------------------------------------------------
// Admin session handling.
//
// Library choice: `jose` over `iron-session`. Both avoid hand-rolled crypto.
// `jose` is chosen because:
//   - Zero native dependencies (pure JS/WebCrypto), so it never risks
//     breaking the alpine/musl Docker build the way some native crypto
//     packages can.
//   - We only need one primitive (a signed, expiring token in a cookie) —
//     `jose`'s SignJWT/jwtVerify (HS256) is a direct, well-audited fit
//     without pulling in iron-session's own sealing format and object
//     wrapper we don't need.
//   - Already runs fine in the Next.js Node runtime (this project pins
//     `runtime = "nodejs"` everywhere, never edge), so jose's edge-friendly
//     design is a bonus, not the deciding factor.
//
// The cookie payload is intentionally minimal: just the admin's id + email.
// There is no `role` field (schema has no roles) and no other PII.
// ---------------------------------------------------------------------------

export const SESSION_COOKIE_NAME = "gop_admin_session";
export const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 hours

const PLACEHOLDER_SESSION_SECRET = "change_me_generate_with_openssl_rand_base64_32";

export interface AdminSessionPayload extends JWTPayload {
  adminId: string;
  email: string;
}

/**
 * Resolves the session signing key. Returns null (rather than throwing) when
 * SESSION_SECRET is unset, too short, or still the .env.example placeholder
 * — callers MUST treat a null key as "authentication unavailable" and fail
 * closed (never fall back to a default/known key).
 */
function getSessionSecretKey(): Uint8Array | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.trim().length === 0) return null;
  if (secret === PLACEHOLDER_SESSION_SECRET) return null;
  // A signing key this short is not meaningfully better than no secret at
  // all; refuse it so a careless short override doesn't silently weaken
  // every session.
  if (secret.length < 16) return null;
  return new TextEncoder().encode(secret);
}

export function isSessionSecretConfigured(): boolean {
  return getSessionSecretKey() !== null;
}

export async function createSessionToken(payload: AdminSessionPayload): Promise<string> {
  const key = getSessionSecretKey();
  if (!key) {
    throw new Error("SESSION_SECRET is not configured; refusing to issue a session.");
  }
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key);
}

/** Verifies a raw token string. Returns null on any failure (expired,
 * malformed, bad signature, missing key) — never throws to callers. */
export async function verifySessionToken(
  token: string,
): Promise<AdminSessionPayload | null> {
  const key = getSessionSecretKey();
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (typeof payload.adminId !== "string" || typeof payload.email !== "string") {
      return null;
    }
    return payload as AdminSessionPayload;
  } catch {
    return null;
  }
}

/**
 * `secure: true` requires HTTPS. This app is deliberately served over plain
 * HTTP on the Docker host today (nginx/TLS termination is a later step,
 * per docker-compose.yml's comments) even though NODE_ENV=production in
 * the container. Gating strictly on NODE_ENV === 'production' would make
 * the cookie unusable (browsers silently drop `Secure` cookies on non-HTTPS
 * origins) until nginx lands. We instead gate on an explicit opt-in env var
 * so the *default* stays secure-by-default in any real production
 * deployment behind TLS, and the plain-HTTP interim window is an explicit,
 * documented exception rather than a silent NODE_ENV-based downgrade.
 *
 * Set FORCE_INSECURE_COOKIES=true only for this interim plain-HTTP window.
 */
function shouldUseSecureCookie(): boolean {
  if (process.env.FORCE_INSECURE_COOKIES === "true") return false;
  return process.env.NODE_ENV === "production";
}

export async function setSessionCookie(payload: AdminSessionPayload): Promise<void> {
  const token = await createSessionToken(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: shouldUseSecureCookie(),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: shouldUseSecureCookie(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/** Reads and verifies the current request's session, if any. */
export async function getSession(): Promise<AdminSessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Shared guard for every admin route. Returns the verified session on
 * success, or a ready-to-return 401 NextResponse on failure — callers do:
 *
 *   const session = await requireAdmin();
 *   if (session instanceof NextResponse) return session;
 *
 * Deliberately generic error body (never reveals *why* auth failed —
 * missing cookie vs expired vs bad signature vs unconfigured secret all
 * look identical to the client).
 */
export async function requireAdmin(): Promise<AdminSessionPayload | NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return session;
}
