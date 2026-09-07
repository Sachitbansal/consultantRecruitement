import { NextResponse } from "next/server";
import { getTaxonomy } from "@/lib/taxonomy";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// GET /api/taxonomy — public.
//
// Serves the pillar -> sub_tag tree and the industry sector -> sub-vertical
// tree from the lookup tables, so ApplicationForm.tsx renders Sections C/D
// (and case-study client-industry/pillar pickers in Section E) from the
// database instead of a hardcoded array.
//
// Cached in-process for 1h (see src/lib/taxonomy.ts) — this data changes
// only via migration.
//
// Response 200:
//   {
//     pillars: Array<{
//       id: number, code: string, name: string,
//       subTags: Array<{ id: number, code: string, name: string }>
//     }>,
//     industries: Array<{
//       id: number, code: string, name: string,
//       children: Array<{ id: number, code: string, name: string, children: [] }>
//     }>
//   }
//
// `industries` is a tree: top-level entries are primary sectors (Section D
// "Primary sector(s)"), `children` holds sub-verticals (populated today only
// for Manufacturing's 9 sub-verticals; empty array for every other sector).
// Consumers should treat `children` as generically nestable even though only
// one level is seeded today.
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const taxonomy = await getTaxonomy();
    return NextResponse.json(taxonomy, {
      status: 200,
      headers: {
        // Public data, safe to let a browser/CDN cache briefly too.
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      },
    });
  } catch (err) {
    console.error("[taxonomy:GET] failed", {
      message: err instanceof Error ? err.message : "unknown error",
    });
    return NextResponse.json({ error: "Failed to load taxonomy." }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
