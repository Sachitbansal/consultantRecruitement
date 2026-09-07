import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { streamConsultantFile } from "@/lib/admin-file-download";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// GET /api/admin/consultants/[id]/deck
//
// Streams the optional supporting case-study deck/deliverable sample for a
// given consultant. Same security posture as .../cv (see
// src/lib/admin-file-download.ts): admin session required, routes on the
// opaque cuid `id`, path containment verified before any fs access.
//
// Responses:
//   200  Deck file bytes, Content-Type per extension, safe Content-Disposition.
//   401  { error } — no/invalid admin session.
//   404  { error } — consultant not found, no deck on record (most
//                     consultants — the deck is optional), or file missing
//                     on disk (never a 500 for a missing file).
// ---------------------------------------------------------------------------
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  return streamConsultantFile(id, "deck");
}
