import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// GET /api/consultants/search?q=... — public, invitation typeahead.
//
// Backs the "Invited by" field on the application form (Section A). This
// exposes real people's names on a public, unauthenticated endpoint, so it
// is built defensively:
//
//   - Minimum 3 characters. Shorter queries return `{ results: [] }` (200),
//     never an error — a thin client can call this on every keystroke
//     without special-casing short input.
//   - Returns ONLY `consultantCode` and `fullName`. Never email, mobile,
//     city, LinkedIn, status, or any other column.
//   - Only matches consultants whose status is APPROVED or ACTIVE.
//     INVITED/APPLIED/DECLINED/INACTIVE people are invisible to this
//     endpoint, full stop.
//   - Capped at 10 results.
//   - Rate-limited per IP (30 requests / 60s) using the shared in-memory
//     limiter — this is a public, no-auth endpoint that runs a DB query per
//     call, so it is a realistic scraping/DoS target.
//   - Prefix / word-boundary matching only, case-insensitive, on `fullName`
//     — "sac" matches "Sachit Bansal" (start of a word), but there is no
//     path that matches on `consultantCode`. Matching on the code would let
//     an attacker walk GOP-C-000001, GOP-C-000002, ... and enumerate the
//     entire roster; this endpoint deliberately never accepts or searches
//     that column.
//
// What this endpoint leaks to an unauthenticated caller: the full name and
// public consultant code of every APPROVED/ACTIVE consultant whose name
// happens to start with (or contain a word starting with) a 3+ character
// string the caller guesses. That is an accepted, deliberate tradeoff of an
// invitation-typeahead field on a public form — it does NOT leak email,
// phone, city, LinkedIn, status, application content, or any other field,
// and it does NOT leak anything about INVITED/APPLIED/DECLINED/INACTIVE
// consultants (their names are fully invisible here, even as an exact
// match).
//
// Response 200: { results: Array<{ consultantCode: string, fullName: string }> }
// Response 429: { error } — rate limited.
// ---------------------------------------------------------------------------

const MIN_QUERY_LENGTH = 3;
const MAX_QUERY_LENGTH = 120;
const MAX_RESULTS = 10;

const SEARCH_RATE_LIMIT = 30;
const SEARCH_RATE_WINDOW_MS = 60 * 1000;

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`consultant-search:${ip}`, SEARCH_RATE_LIMIT, SEARCH_RATE_WINDOW_MS);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  const rawQuery = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, MAX_QUERY_LENGTH);

  if (rawQuery.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ results: [] }, { status: 200 });
  }

  try {
    const matches = await prisma.consultant.findMany({
      where: {
        status: { in: ["APPROVED", "ACTIVE"] },
        OR: [
          { fullName: { startsWith: rawQuery, mode: "insensitive" } },
          { fullName: { contains: ` ${rawQuery}`, mode: "insensitive" } },
        ],
      },
      select: { consultantCode: true, fullName: true },
      orderBy: { fullName: "asc" },
      take: MAX_RESULTS,
    });

    return NextResponse.json({ results: matches }, { status: 200 });
  } catch (err) {
    console.error("[consultants:search:GET] failed", {
      message: err instanceof Error ? err.message : "unknown error",
    });
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
