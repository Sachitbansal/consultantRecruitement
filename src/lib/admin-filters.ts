import { z } from "zod";
import type { Prisma } from "@prisma/client";
import {
  LEVEL_OPTIONS,
  TRAVEL_WILLINGNESS_OPTIONS,
  PNL_BAND_OPTIONS,
  CLIENT_REVENUE_BAND_OPTIONS,
  CONSULTANT_STATUS_OPTIONS,
} from "@/lib/constants";
import { expandIndustryIdsForFilter } from "@/lib/taxonomy";

// ---------------------------------------------------------------------------
// Shared query-param parsing + Prisma `where` construction for
// GET /api/admin/consultants and GET /api/admin/export — both must apply
// IDENTICAL filtering so "export the current filtered view" is truthful.
//
// Filter semantics:
//   - `status`, `level`, `travelWillingness`, `maxPnlBand`, `clientRevenueBands`
//     are multi-value. Within a category, values are OR'd (Prisma `in` for
//     scalar columns, `hasSome` for the array column). Across categories,
//     AND.
//   - `pillarIds` — OR within category: matches a consultant who has AT
//     LEAST ONE capability tag under any of the given pillars
//     (`capabilities.some.tag.pillarId in [...]`).
//   - `subTagIds` — OR within category: matches a consultant tagged with
//     any of the given sub_tags directly (`capabilities.some.tagId in [...]`).
//   - `industryIds` — OR within category, WITH PARENT EXPANSION: selecting
//     a top-level sector id (e.g. Manufacturing) also matches consultants
//     tagged only with one of its sub-verticals (expansion happens in
//     src/lib/taxonomy.ts's `expandIndustryIdsForFilter`, cached with the
//     rest of the taxonomy).
//   - `openToRemote` is a strict boolean filter; omitted = no filter.
//   - `city` / `state` / `country` are case-insensitive exact matches
//     (values are title-cased at submission time, so exact match is
//     reliable rather than fragmenting on casing).
//   - `search` does a case-insensitive substring match across fullName,
//     email, and city (OR'd across those fields), AND'd with every other
//     filter above.
// ---------------------------------------------------------------------------

const statusEnum = z.enum(CONSULTANT_STATUS_OPTIONS as [string, ...string[]]);
const levelEnum = z.enum(LEVEL_OPTIONS as [string, ...string[]]);
const travelWillingnessEnum = z.enum(TRAVEL_WILLINGNESS_OPTIONS as [string, ...string[]]);
const pnlBandEnum = z.enum(PNL_BAND_OPTIONS as [string, ...string[]]);
const clientRevenueBandEnum = z.enum(CLIENT_REVENUE_BAND_OPTIONS as [string, ...string[]]);

// Accepts either repeated query params (?level=A&level=B) or a single
// comma-separated value (?level=A,B) — both are common client conventions.
function multiParam<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((val) => {
    if (val === undefined || val === null) return undefined;
    const arr = Array.isArray(val) ? val : [val];
    return arr.flatMap((v) => String(v).split(",")).filter((v) => v.length > 0);
  }, z.array(schema).optional());
}

function multiIntParam() {
  return z.preprocess((val) => {
    if (val === undefined || val === null) return undefined;
    const arr = Array.isArray(val) ? val : [val];
    return arr
      .flatMap((v) => String(v).split(","))
      .filter((v) => v.length > 0)
      .map((v) => Number(v));
  }, z.array(z.number().int().positive()).optional());
}

export const MAX_PAGE_SIZE = 200;
export const DEFAULT_PAGE_SIZE = 25;

export const adminFilterQuerySchema = z.object({
  status: multiParam(statusEnum),
  level: multiParam(levelEnum),
  travelWillingness: multiParam(travelWillingnessEnum),
  maxPnlBand: multiParam(pnlBandEnum),
  clientRevenueBands: multiParam(clientRevenueBandEnum),
  pillarIds: multiIntParam(),
  subTagIds: multiIntParam(),
  industryIds: multiIntParam(),
  openToRemote: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  city: z.string().trim().min(1).max(120).optional(),
  state: z.string().trim().min(1).max(120).optional(),
  country: z.string().trim().min(1).max(120).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  page: z.coerce.number().int().min(1).max(1_000_000).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(DEFAULT_PAGE_SIZE),
});

export type AdminFilterQuery = z.infer<typeof adminFilterQuerySchema>;

/** Parses `URLSearchParams` into the validated filter query. Throws a
 * `z.ZodError` on invalid input — callers should catch and return 400. */
export function parseAdminFilterQuery(searchParams: URLSearchParams): AdminFilterQuery {
  const raw = {
    status: searchParams.getAll("status"),
    level: searchParams.getAll("level"),
    travelWillingness: searchParams.getAll("travelWillingness"),
    maxPnlBand: searchParams.getAll("maxPnlBand"),
    clientRevenueBands: searchParams.getAll("clientRevenueBands"),
    pillarIds: searchParams.getAll("pillarIds"),
    subTagIds: searchParams.getAll("subTagIds"),
    industryIds: searchParams.getAll("industryIds"),
    openToRemote: searchParams.get("openToRemote") ?? undefined,
    city: searchParams.get("city") ?? undefined,
    state: searchParams.get("state") ?? undefined,
    country: searchParams.get("country") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  };
  return adminFilterQuerySchema.parse(raw);
}

/** Builds the Prisma `where` clause shared by the list and export routes.
 * Async because industry-parent expansion reads the (cached) taxonomy. */
export async function buildConsultantWhere(
  query: AdminFilterQuery,
): Promise<Prisma.ConsultantWhereInput> {
  const AND: Prisma.ConsultantWhereInput[] = [];

  if (query.status && query.status.length > 0) {
    AND.push({ status: { in: query.status as never[] } });
  }
  if (query.level && query.level.length > 0) {
    AND.push({ level: { in: query.level as never[] } });
  }
  if (query.travelWillingness && query.travelWillingness.length > 0) {
    AND.push({ travelWillingness: { in: query.travelWillingness as never[] } });
  }
  if (query.maxPnlBand && query.maxPnlBand.length > 0) {
    AND.push({ maxPnlBand: { in: query.maxPnlBand as never[] } });
  }
  if (query.clientRevenueBands && query.clientRevenueBands.length > 0) {
    AND.push({ clientRevenueBands: { hasSome: query.clientRevenueBands as never[] } });
  }
  if (query.pillarIds && query.pillarIds.length > 0) {
    AND.push({
      capabilities: { some: { tag: { pillarId: { in: query.pillarIds } } } },
    });
  }
  if (query.subTagIds && query.subTagIds.length > 0) {
    AND.push({ capabilities: { some: { tagId: { in: query.subTagIds } } } });
  }
  if (query.industryIds && query.industryIds.length > 0) {
    const expanded = await expandIndustryIdsForFilter(query.industryIds);
    AND.push({ industries: { some: { industryId: { in: expanded } } } });
  }
  if (query.openToRemote !== undefined) {
    AND.push({ openToRemote: query.openToRemote });
  }
  if (query.city) {
    AND.push({ city: { equals: query.city, mode: "insensitive" } });
  }
  if (query.state) {
    AND.push({ state: { equals: query.state, mode: "insensitive" } });
  }
  if (query.country) {
    AND.push({ country: { equals: query.country, mode: "insensitive" } });
  }
  if (query.search) {
    const term = query.search;
    AND.push({
      OR: [
        { fullName: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        { city: { contains: term, mode: "insensitive" } },
      ],
    });
  }

  return AND.length > 0 ? { AND } : {};
}
