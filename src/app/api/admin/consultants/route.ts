import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { buildConsultantWhere, parseAdminFilterQuery } from "@/lib/admin-filters";
import { CONSULTANT_LIST_SELECT, shapeConsultantRow } from "@/lib/admin-consultant-shape";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// GET /api/admin/consultants
//
// Renamed from the old GET /api/admin/applications: the resource is now a
// Consultant record (which can be at any status from INVITED through
// ACTIVE/DECLINED), not a one-shot "Application" row, and every admin route
// routes on the opaque cuid `id` — never on `consultantCode` (see
// prisma/schema.prisma's comment on Consultant.consultantCode for why a
// sequential code in a URL/route param would make the roster enumerable).
//
// Query params (all optional unless noted) — see src/lib/admin-filters.ts
// for the exact semantics and the Prisma `where` construction shared with
// GET /api/admin/export:
//   status               multi — ConsultantStatus enum
//   level                multi — Level enum
//   travelWillingness    multi — TravelWillingness enum
//   maxPnlBand           multi — PnlBand enum
//   clientRevenueBands   multi — ClientRevenueBand enum
//   pillarIds            multi, int — matches consultants with >=1
//                         capability tag under any of these pillars
//   subTagIds            multi, int — matches consultants tagged with any
//                         of these sub_tags directly
//   industryIds          multi, int — selecting a top-level sector id also
//                         matches its sub-verticals (parent expansion)
//   openToRemote         "true" | "false"
//   city / state / country   string, case-insensitive exact match
//   search               string, case-insensitive substring over
//                         fullName/email/city
//   page                 number, default 1
//   pageSize             number, default 25, max 200
//
// Response 200:
//   {
//     consultants: Array<shaped Consultant row, see
//       src/lib/admin-consultant-shape.ts for the exact fields — includes
//       flattened capabilities/industries/caseStudies/engagementProfile,
//       invitedBy summary, hasCv/hasDeck booleans; never the raw
//       cvStoredPath/deckStoredPath disk paths>,
//     total: number,
//     page: number,
//     pageSize: number,
//     totalPages: number,
//   }
//
// Response 400: { error, details? } — invalid/unknown filter value.
// Response 401: { error } — no/invalid admin session.
//
// Query count for this endpoint — MEASURED (via `PRISMA_LOG_QUERIES=true`,
// see src/lib/prisma.ts) against the live Docker Postgres with 5 seeded
// consultants (one with 2 capabilities/3 industries/2 case studies/an
// engagement profile row): 12 total SQL queries for the whole request,
// none of them repeated per row —
//   1x SELECT consultants                      (top level, page/pageSize)
//   1x SELECT COUNT(*) consultants              (for `total`)
//   1x SELECT consultant_capabilities            (batched WHERE ... IN (...))
//   1x SELECT sub_tags                            (batched IN (...))
//   1x SELECT pillars                              (for those sub_tags, batched IN (...))
//   1x SELECT consultant_industries               (batched IN (...))
//   1x SELECT industries                           (batched IN (...))
//   1x SELECT case_studies                         (batched IN (...))
//   1x SELECT industries                           (case study client industry, batched IN (...))
//   1x SELECT case_study_pillars                   (batched IN (...))
//   1x SELECT pillars                              (for case-study pillars, batched IN (...))
//   1x SELECT engagement_profile                   (batched IN (...))
// `invitedBy` added ZERO extra queries in this run because none of the 5
// seeded rows had a non-null invitedById — Prisma skips a relation query
// entirely when there is nothing to join. When at least one row does have
// invitedById set, expect 13 (one more batched `SELECT consultants ...
// WHERE id IN (...)` for the invitedBy summary). Either way this is a
// FIXED small number of queries per request, not one-per-row: Prisma
// batches every nested relation into a single `WHERE x IN (...)` query
// regardless of whether the page has 1 row or 200, so there is no N+1
// here.
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  let query;
  try {
    query = parseAdminFilterQuery(req.nextUrl.searchParams);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid filter parameters.", details: err.issues.map((i) => i.message) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid filter parameters." }, { status: 400 });
  }

  try {
    const where = await buildConsultantWhere(query);

    const [rows, total] = await Promise.all([
      prisma.consultant.findMany({
        where,
        select: CONSULTANT_LIST_SELECT,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.consultant.count({ where }),
    ]);

    const consultants = rows.map(shapeConsultantRow);

    return NextResponse.json({
      consultants,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    });
  } catch (err) {
    console.error("[admin:consultants:GET] query failed", {
      message: err instanceof Error ? err.message : "unknown error",
    });
    return NextResponse.json({ error: "Failed to load consultants." }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
