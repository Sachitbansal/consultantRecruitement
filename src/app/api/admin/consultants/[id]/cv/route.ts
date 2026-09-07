import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { streamConsultantFile } from "@/lib/admin-file-download";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// GET /api/admin/consultants/[id]/cv
//
// Streams the CV file for a given consultant. Routes on the opaque cuid
// `id` (never `consultantCode` — see prisma/schema.prisma's comment on why
// a sequential code in a route param would make the roster enumerable).
// Requires a valid admin session, checked FIRST, before any DB lookup or
// filesystem access.
//
// Responses:
//   200  CV file bytes, Content-Type per extension, safe Content-Disposition.
//   401  { error } — no/invalid admin session.
//   404  { error } — consultant not found, no CV on record, or file missing
//                     on disk (never a 500 for a missing file).
// ---------------------------------------------------------------------------
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  return streamConsultantFile(id, "cv");
}
