import { z } from "zod";
import type { Prisma } from "@prisma/client";
import {
  LEVEL_OPTIONS,
  DELIVERY_FUNCTION_OPTIONS,
  SKILL_OPTIONS,
  INDUSTRY_OPTIONS,
} from "@/lib/constants";

// ---------------------------------------------------------------------------
// Shared query-param parsing + Prisma `where` construction for
// GET /api/admin/applications and GET /api/admin/export — both must apply
// IDENTICAL filtering so "export the current filtered view" is truthful.
//
// Filter semantics (also documented for the frontend team):
//   - `level`, `functions`, `skills`, `industries` are multi-value.
//     Within a single category, values are OR'd together (Prisma `hasSome`
///    for the array columns, `in` for the scalar `level` column).
//     Across categories, the conditions are AND'd together.
//     Example: level=CONSULTANT&level=PARTNER&industries=BANKING means
//     (level IN [CONSULTANT, PARTNER]) AND (industries hasSome [BANKING]).
//   - `remote` is a strict boolean filter (true/false); omitted = no filter.
//   - `state` / `city` are case-insensitive exact-ish (contains) matches.
//   - `search` does a case-insensitive substring match across fullName,
//     email, city, and state (OR'd across those fields), AND'd with every
//     other filter above.
// ---------------------------------------------------------------------------

const levelEnum = z.enum(LEVEL_OPTIONS as [string, ...string[]]);
const functionEnum = z.enum(DELIVERY_FUNCTION_OPTIONS as [string, ...string[]]);
const skillEnum = z.enum(SKILL_OPTIONS as [string, ...string[]]);
const industryEnum = z.enum(INDUSTRY_OPTIONS as [string, ...string[]]);

// Accepts either a single value or repeated query params (?level=A&level=B)
// as an array; also splits a single comma-separated value for convenience
// (?level=A,B) since both are common client conventions.
function multiParam<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((val) => {
    if (val === undefined || val === null) return undefined;
    const arr = Array.isArray(val) ? val : [val];
    return arr.flatMap((v) => String(v).split(",")).filter((v) => v.length > 0);
  }, z.array(schema).optional());
}

export const MAX_PAGE_SIZE = 200;
export const DEFAULT_PAGE_SIZE = 25;

export const adminFilterQuerySchema = z.object({
  level: multiParam(levelEnum),
  functions: multiParam(functionEnum),
  skills: multiParam(skillEnum),
  industries: multiParam(industryEnum),
  remote: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  state: z.string().trim().min(1).max(120).optional(),
  city: z.string().trim().min(1).max(120).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  page: z.coerce.number().int().min(1).max(1_000_000).optional().default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .optional()
    .default(DEFAULT_PAGE_SIZE),
});

export type AdminFilterQuery = z.infer<typeof adminFilterQuerySchema>;

/** Parses `URLSearchParams` into the validated filter query. Throws a
 * `z.ZodError` on invalid input — callers should catch and return 400. */
export function parseAdminFilterQuery(searchParams: URLSearchParams): AdminFilterQuery {
  const raw = {
    level: searchParams.getAll("level"),
    functions: searchParams.getAll("functions"),
    skills: searchParams.getAll("skills"),
    industries: searchParams.getAll("industries"),
    remote: searchParams.get("remote") ?? undefined,
    state: searchParams.get("state") ?? undefined,
    city: searchParams.get("city") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  };
  return adminFilterQuerySchema.parse(raw);
}

/** Builds the Prisma `where` clause shared by the list and export routes. */
export function buildApplicationWhere(
  query: AdminFilterQuery,
): Prisma.ApplicationWhereInput {
  const AND: Prisma.ApplicationWhereInput[] = [];

  if (query.level && query.level.length > 0) {
    AND.push({ level: { in: query.level as never[] } });
  }
  if (query.functions && query.functions.length > 0) {
    AND.push({ functions: { hasSome: query.functions as never[] } });
  }
  if (query.skills && query.skills.length > 0) {
    AND.push({ skills: { hasSome: query.skills as never[] } });
  }
  if (query.industries && query.industries.length > 0) {
    AND.push({ industries: { hasSome: query.industries as never[] } });
  }
  if (query.remote !== undefined) {
    AND.push({ remote: query.remote });
  }
  if (query.state) {
    AND.push({ state: { equals: query.state, mode: "insensitive" } });
  }
  if (query.city) {
    AND.push({ city: { equals: query.city, mode: "insensitive" } });
  }
  if (query.search) {
    const term = query.search;
    AND.push({
      OR: [
        { fullName: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        { city: { contains: term, mode: "insensitive" } },
        { state: { contains: term, mode: "insensitive" } },
      ],
    });
  }

  return AND.length > 0 ? { AND } : {};
}
