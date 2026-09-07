import type {
  Level,
  TravelWillingness,
  PnlBand,
  ClientRevenueBand,
  ConsultantStatus,
} from "@prisma/client";

/**
 * Shared filter-state -> URLSearchParams serialization for the admin
 * dashboard. Used to build BOTH the list-fetch query string and the
 * export-link query strings, so "export the current filtered view" stays
 * truthful by construction — there is exactly one place that turns filter
 * state into query params.
 *
 * Mirrors the server-side contract in src/lib/admin-filters.ts: multi-value
 * params are repeated (?level=A&level=B), openToRemote is "true"/"false" or
 * omitted, search/city/state/country are single strings, pillarIds/
 * subTagIds/industryIds are repeated numeric params.
 */

export interface AdminFilterState {
  status: ConsultantStatus[];
  level: Level[];
  travelWillingness: TravelWillingness[];
  maxPnlBand: PnlBand[];
  clientRevenueBands: ClientRevenueBand[];
  pillarIds: number[];
  subTagIds: number[];
  industryIds: number[];
  openToRemote: "any" | "true" | "false";
  city: string;
  state: string;
  country: string;
  search: string;
}

export const EMPTY_FILTER_STATE: AdminFilterState = {
  status: [],
  level: [],
  travelWillingness: [],
  maxPnlBand: [],
  clientRevenueBands: [],
  pillarIds: [],
  subTagIds: [],
  industryIds: [],
  openToRemote: "any",
  city: "",
  state: "",
  country: "",
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
  for (const v of filters.status) params.append("status", v);
  for (const v of filters.level) params.append("level", v);
  for (const v of filters.travelWillingness) params.append("travelWillingness", v);
  for (const v of filters.maxPnlBand) params.append("maxPnlBand", v);
  for (const v of filters.clientRevenueBands) params.append("clientRevenueBands", v);
  for (const v of filters.pillarIds) params.append("pillarIds", String(v));
  for (const v of filters.subTagIds) params.append("subTagIds", String(v));
  for (const v of filters.industryIds) params.append("industryIds", String(v));
  if (filters.openToRemote !== "any") params.set("openToRemote", filters.openToRemote);
  if (filters.city.trim()) params.set("city", filters.city.trim());
  if (filters.state.trim()) params.set("state", filters.state.trim());
  if (filters.country.trim()) params.set("country", filters.country.trim());
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (extra?.page) params.set("page", String(extra.page));
  if (extra?.pageSize) params.set("pageSize", String(extra.pageSize));
  return params;
}

/** Count of active filter categories/values, for the "N filters active" UI. */
export function countActiveFilters(filters: AdminFilterState): number {
  return (
    filters.status.length +
    filters.level.length +
    filters.travelWillingness.length +
    filters.maxPnlBand.length +
    filters.clientRevenueBands.length +
    filters.pillarIds.length +
    filters.subTagIds.length +
    filters.industryIds.length +
    (filters.openToRemote !== "any" ? 1 : 0) +
    (filters.city.trim() ? 1 : 0) +
    (filters.state.trim() ? 1 : 0) +
    (filters.country.trim() ? 1 : 0) +
    (filters.search.trim() ? 1 : 0)
  );
}
