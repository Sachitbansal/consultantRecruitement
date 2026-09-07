import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Server-side taxonomy cache: pillars -> sub_tags, and the self-referential
// industries sector -> sub-vertical tree.
//
// Per prisma/schema.prisma's own framing, this taxonomy "changes only via
// migration" — there is no admin UI that writes to pillars/sub_tags/
// industries. That makes an hourly `unstable_cache` a safe, deliberate
// tradeoff: a taxonomy change ships as a migration + redeploy anyway, so a
// worst-case ~1h staleness window between deploy and cache expiry is
// immaterial in practice, and it means:
//   - GET /api/taxonomy (public, hit on every form load) does not run a DB
//     query per request.
//   - POST /api/applications validates submitted pillar/sub_tag/industry
//     ids against this same cached snapshot instead of firing 3 extra
//     queries per submission.
//   - GET /api/admin/consultants' industry-parent-expansion filter (see
//     src/lib/admin-filters.ts) reuses the same in-memory parent->children
//     map instead of a fresh recursive query per request.
// ---------------------------------------------------------------------------

export interface TaxonomySubTag {
  id: number;
  code: string;
  name: string;
}

export interface TaxonomyPillar {
  id: number;
  code: string;
  name: string;
  subTags: TaxonomySubTag[];
}

export interface TaxonomyIndustryNode {
  id: number;
  code: string;
  name: string;
  children: TaxonomyIndustryNode[];
}

export interface TaxonomyData {
  pillars: TaxonomyPillar[];
  industries: TaxonomyIndustryNode[];
}

async function loadTaxonomy(): Promise<TaxonomyData> {
  const [pillars, subTags, industries] = await Promise.all([
    prisma.pillar.findMany({ orderBy: { id: "asc" } }),
    prisma.subTag.findMany({ orderBy: { id: "asc" } }),
    prisma.industry.findMany({ orderBy: { id: "asc" } }),
  ]);

  const pillarNodes: TaxonomyPillar[] = pillars.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    subTags: subTags
      .filter((t) => t.pillarId === p.id)
      .map((t) => ({ id: t.id, code: t.code, name: t.name })),
  }));

  const industryById = new Map<number, TaxonomyIndustryNode>(
    industries.map((i) => [i.id, { id: i.id, code: i.code, name: i.name, children: [] }]),
  );
  const topLevel: TaxonomyIndustryNode[] = [];
  for (const industry of industries) {
    const node = industryById.get(industry.id)!;
    if (industry.parentIndustryId === null) {
      topLevel.push(node);
    } else {
      const parent = industryById.get(industry.parentIndustryId);
      // Defensive: schema FK guarantees the parent exists, but never let a
      // dangling reference silently vanish a sub-vertical from the tree.
      if (parent) parent.children.push(node);
      else topLevel.push(node);
    }
  }

  return { pillars: pillarNodes, industries: topLevel };
}

export const getTaxonomy = unstable_cache(loadTaxonomy, ["gop-taxonomy"], {
  revalidate: 3600,
  tags: ["taxonomy"],
});

// ---------------------------------------------------------------------------
// Flat-lookup helpers derived from the same cached snapshot — used by
// validation code (POST /api/applications) and admin filter-building.
// ---------------------------------------------------------------------------

export async function getValidSubTagIds(): Promise<Set<number>> {
  const taxonomy = await getTaxonomy();
  const ids = new Set<number>();
  for (const pillar of taxonomy.pillars) {
    for (const tag of pillar.subTags) ids.add(tag.id);
  }
  return ids;
}

export async function getValidPillarIds(): Promise<Set<number>> {
  const taxonomy = await getTaxonomy();
  return new Set(taxonomy.pillars.map((p) => p.id));
}

function flattenIndustries(nodes: TaxonomyIndustryNode[], out: TaxonomyIndustryNode[]): void {
  for (const node of nodes) {
    out.push(node);
    flattenIndustries(node.children, out);
  }
}

export async function getValidIndustryIds(): Promise<Set<number>> {
  const taxonomy = await getTaxonomy();
  const flat: TaxonomyIndustryNode[] = [];
  flattenIndustries(taxonomy.industries, flat);
  return new Set(flat.map((i) => i.id));
}

/** Maps every top-level (parent) industry id to the full list of its
 * sub-vertical ids. Used by the admin list/export filter so selecting a
 * parent sector (e.g. "Manufacturing") also matches consultants tagged only
 * with one of its sub-verticals. */
export async function getIndustryChildrenMap(): Promise<Map<number, number[]>> {
  const taxonomy = await getTaxonomy();
  const map = new Map<number, number[]>();
  for (const top of taxonomy.industries) {
    map.set(
      top.id,
      top.children.map((c) => c.id),
    );
  }
  return map;
}

/** Expands a requested set of industry filter ids so that any parent
 * (top-level sector) id in the list also matches its children. Child ids
 * passed in are kept as-is (they already refer to a specific sub-vertical
 * and need no expansion). */
export async function expandIndustryIdsForFilter(ids: number[]): Promise<number[]> {
  const childrenMap = await getIndustryChildrenMap();
  const expanded = new Set<number>(ids);
  for (const id of ids) {
    const children = childrenMap.get(id);
    if (children) for (const childId of children) expanded.add(childId);
  }
  return Array.from(expanded);
}
