import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { buildApplicationWhere, parseAdminFilterQuery } from "@/lib/admin-filters";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// GET /api/admin/applications
//
// Query params (all optional unless noted):
//   level        multi   (repeat or comma-separate) — one of Level enum
//   functions    multi   — one of DeliveryFunction enum
//   skills       multi   — one of Skill enum
//   industries   multi   — one of Industry enum
//   remote       "true" | "false"
//   state        string  (case-insensitive exact match)
//   city         string  (case-insensitive exact match)
//   search       string  (case-insensitive substring over name/email/city/state)
//   page         number, default 1
//   pageSize     number, default 25, max 200
//
// Filter semantics: OR within a category (level/functions/skills/industries),
// AND across categories and with search/state/city. See
// src/lib/admin-filters.ts for the exact Prisma `where` construction shared
// with GET /api/admin/export.
//
// Response 200:
//   {
//     applications: Array<Application row minus CV disk path>,
//     total: number,
//     page: number,
//     pageSize: number,
//     totalPages: number,
//   }
//
// Response 400: { error: string } — invalid/unknown filter value.
// Response 401: { error: string } — no/invalid admin session.
// ---------------------------------------------------------------------------

// Fields returned to the dashboard. `cvStoredPath` (a disk path) is
// deliberately excluded from the API response — the frontend never needs
// the raw filesystem path, only whether a CV exists (derived below) and the
// download route (/api/admin/applications/[id]/cv) to fetch it.
const LIST_SELECT = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  level: true,
  functions: true,
  skills: true,
  industries: true,
  city: true,
  state: true,
  remote: true,
  additionalNotes: true,
  qWhatIsGop: true,
  qWhyJoinGop: true,
  qKeySkills: true,
  qRelevantExperience: true,
  qHowDeliver: true,
  cvFileName: true,
  cvMimeType: true,
  cvSizeBytes: true,
  createdAt: true,
  updatedAt: true,
} as const;

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

  const where = buildApplicationWhere(query);

  try {
    const [rows, total] = await Promise.all([
      prisma.application.findMany({
        where,
        select: LIST_SELECT,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.application.count({ where }),
    ]);

    const applications = rows.map((row) => ({
      ...row,
      hasCv: Boolean(row.cvFileName),
    }));

    return NextResponse.json({
      applications,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    });
  } catch (err) {
    console.error("[admin:applications:GET] query failed", {
      message: err instanceof Error ? err.message : "unknown error",
    });
    return NextResponse.json({ error: "Failed to load applications." }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
