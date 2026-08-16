import type { Level, DeliveryFunction, Skill, Industry } from "@prisma/client";

/**
 * Shared filter-state -> URLSearchParams serialization for the admin
 * dashboard. Used to build BOTH the list-fetch query string and the
 * export-link query strings, so "export the current filtered view" stays
 * truthful by construction — there is exactly one place that turns filter
 * state into query params.
 *
 * Mirrors the server-side contract in src/lib/admin-filters.ts: multi-value
 * params are repeated (?level=A&level=B), remote is "true"/"false" or
 * omitted, search/city/state are single strings.
 */

export interface AdminFilterState {
  level: Level[];
  functions: DeliveryFunction[];
  skills: Skill[];
  industries: Industry[];
  remote: "any" | "true" | "false";
  city: string;
  state: string;
  search: string;
}

export const EMPTY_FILTER_STATE: AdminFilterState = {
  level: [],
  functions: [],
  skills: [],
  industries: [],
  remote: "any",
  city: "",
  state: "",
  search: "",
};

/** Builds the query params shared by the list endpoint and both export
 * formats. `page`/`pageSize` are only relevant to the list endpoint —
 * callers building an export URL simply omit them. */
export function buildFilterParams(
  filters: AdminFilterState,
  extra?: { page?: number; pageSize?: number },
): URLSearchParams {
  const params = new URLSearchParams();
  for (const v of filters.level) params.append("level", v);
  for (const v of filters.functions) params.append("functions", v);
  for (const v of filters.skills) params.append("skills", v);
  for (const v of filters.industries) params.append("industries", v);
  if (filters.remote !== "any") params.set("remote", filters.remote);
  if (filters.city.trim()) params.set("city", filters.city.trim());
  if (filters.state.trim()) params.set("state", filters.state.trim());
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (extra?.page) params.set("page", String(extra.page));
  if (extra?.pageSize) params.set("pageSize", String(extra.pageSize));
  return params;
}

/** Count of active filter categories/values, for the "N filters active" UI. */
export function countActiveFilters(filters: AdminFilterState): number {
  return (
    filters.level.length +
    filters.functions.length +
    filters.skills.length +
    filters.industries.length +
    (filters.remote !== "any" ? 1 : 0) +
    (filters.city.trim() ? 1 : 0) +
    (filters.state.trim() ? 1 : 0) +
    (filters.search.trim() ? 1 : 0)
  );
}
