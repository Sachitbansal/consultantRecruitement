"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import type { Level, PnlBand, ClientRevenueBand, ConsultantStatus } from "@prisma/client";
import {
  LEVEL_LABELS,
  TRAVEL_WILLINGNESS_OPTIONS,
  TRAVEL_WILLINGNESS_LABELS,
  PNL_BAND_OPTIONS,
  PNL_BAND_LABELS,
  CLIENT_REVENUE_BAND_OPTIONS,
  CLIENT_REVENUE_BAND_LABELS,
  CONSULTANT_STATUS_OPTIONS,
  CONSULTANT_STATUS_LABELS,
  LEVEL_OPTIONS,
  CASE_STUDY_ROLE_LABELS,
  REFERENCEABLE_LABELS,
  ENGAGEMENT_TYPE_LABELS,
} from "@/lib/constants";
import {
  buildFilterParams,
  countActiveFilters,
  EMPTY_FILTER_STATE,
  type AdminFilterState,
} from "@/lib/admin-query";
import { Chip } from "@/components/Chip";
import { RadioCardGroup } from "@/components/RadioCardGroup";
import { TextInput } from "@/components/TextInput";

const PAGE_SIZE = 25;

// ---------------------------------------------------------------------------
// Local taxonomy type — mirrors GET /api/taxonomy exactly (see
// src/lib/taxonomy.ts). Not imported from there directly since that module
// is server-only (pulls in prisma/next-cache).
// ---------------------------------------------------------------------------
interface TaxonomySubTag {
  id: number;
  code: string;
  name: string;
}
interface TaxonomyPillar {
  id: number;
  code: string;
  name: string;
  subTags: TaxonomySubTag[];
}
interface TaxonomyIndustryNode {
  id: number;
  code: string;
  name: string;
  children: TaxonomyIndustryNode[];
}
interface TaxonomyData {
  pillars: TaxonomyPillar[];
  industries: TaxonomyIndustryNode[];
}

// ---------------------------------------------------------------------------
// Row shape — mirrors shapeConsultantRow() in src/lib/admin-consultant-shape.ts.
// ---------------------------------------------------------------------------
interface CapabilityRow {
  tagId: number;
  tagCode: string;
  tagName: string;
  pillarId: number;
  pillarCode: string;
  pillarName: string;
}
interface IndustryRow {
  industryId: number;
  code: string;
  name: string;
  parentIndustryId: number | null;
}
interface CaseStudyRow {
  id: string;
  title: string;
  clientIndustryId: number;
  clientIndustryName: string;
  clientSizeBand: ClientRevenueBand;
  role: string;
  situationText: string;
  interventionText: string;
  outcomeText: string;
  durationMonths: number;
  referenceable: string;
  createdAt: string;
  pillars: { pillarId: number; pillarCode: string; pillarName: string }[];
}
interface EngagementProfileRow {
  engagementType: string | null;
  availabilityDaysWeek: number | null;
  noticePeriodDays: number | null;
  rateBand: string | null;
  currentlyEngaged: boolean | null;
  exclusivityNotes: string | null;
  lastUpdated: string;
}
interface ConsultantRow {
  id: string;
  consultantCode: string;
  fullName: string;
  email: string;
  mobile: string | null;
  linkedinUrl: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  openToRemote: boolean | null;
  travelWillingness: string | null;
  level: Level | null;
  totalYearsExp: number | null;
  operatingYearsExp: number | null;
  advisoryYearsExp: number | null;
  maxTeamManaged: number | null;
  maxPnlBand: PnlBand | null;
  clientRevenueBands: ClientRevenueBand[];
  status: ConsultantStatus;
  dateInvited: string | null;
  dateApplied: string | null;
  dateApproved: string | null;
  consentFlag: boolean;
  reasonForJoining: string | null;
  deliveryStyle: string | null;
  createdAt: string;
  updatedAt: string;
  invitedBy: { id: string; consultantCode: string; fullName: string } | null;
  hasCv: boolean;
  hasDeck: boolean;
  capabilities: CapabilityRow[];
  industries: IndustryRow[];
  caseStudies: CaseStudyRow[];
  engagementProfile: EngagementProfileRow | null;
}

interface ListResponse {
  consultants: ConsultantRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const remoteOptions: ("any" | "true" | "false")[] = ["any", "true", "false"];
const remoteLabels: Record<"any" | "true" | "false", string> = {
  any: "Any",
  true: "Remote",
  false: "On-site",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function dash(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

/** Renders a capped list of chips ("first N + more") with a title tooltip
 * carrying the full list, so long multi-value cells don't blow out row
 * height. */
function TruncatedList({ values, max = 2 }: { values: string[]; max?: number }) {
  if (values.length === 0) {
    return <span className="text-muted text-xs">&mdash;</span>;
  }
  const shown = values.slice(0, max);
  const rest = values.length - shown.length;
  return (
    <span className="flex flex-wrap gap-1" title={values.join(", ")}>
      {shown.map((v) => (
        <span
          key={v}
          className="inline-block rounded bg-gray-light px-1.5 py-0.5 text-xs text-ink whitespace-nowrap"
        >
          {v}
        </span>
      ))}
      {rest > 0 && (
        <span className="inline-block rounded bg-gray-light px-1.5 py-0.5 text-xs text-muted whitespace-nowrap">
          +{rest} more
        </span>
      )}
    </span>
  );
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1">{label}</p>
      <div className="text-sm text-ink leading-relaxed">{value}</div>
    </div>
  );
}

export function AdminDashboard({ adminEmail }: { adminEmail: string }) {
  const [filters, setFilters] = useState<AdminFilterState>(EMPTY_FILTER_STATE);
  const [searchInput, setSearchInput] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [stateInput, setStateInput] = useState("");
  const [countryInput, setCountryInput] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const [taxonomy, setTaxonomy] = useState<TaxonomyData | null>(null);

  useEffect(() => {
    fetch("/api/taxonomy", { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => setTaxonomy(body))
      .catch(() => setTaxonomy(null));
  }, []);

  // Debounce free-text filters.
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput }));
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, city: cityInput }));
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [cityInput]);
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, state: stateInput }));
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [stateInput]);
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, country: countryInput }));
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [countryInput]);

  const queryString = useMemo(
    () => buildFilterParams(filters, { page, pageSize: PAGE_SIZE }).toString(),
    [filters, page],
  );
  const exportParams = useMemo(() => buildFilterParams(filters), [filters]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/consultants?${queryString}`, { credentials: "same-origin" })
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = "/admin/login";
          return null;
        }
        if (!res.ok) throw new Error("Failed to load consultants.");
        return (await res.json()) as ListResponse;
      })
      .then((body) => {
        if (cancelled || !body) return;
        setData(body);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load applications. Check your connection and try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [queryString]);

  function toggleMulti<T extends string>(key: keyof AdminFilterState, value: T) {
    setFilters((f) => {
      const arr = f[key] as unknown as T[];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...f, [key]: next };
    });
    setPage(1);
  }

  function toggleMultiNumber(key: "pillarIds" | "subTagIds" | "industryIds", value: number) {
    setFilters((f) => {
      const arr = f[key];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...f, [key]: next };
    });
    setPage(1);
  }

  function clearAllFilters() {
    setFilters(EMPTY_FILTER_STATE);
    setSearchInput("");
    setCityInput("");
    setStateInput("");
    setCountryInput("");
    setPage(1);
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST", credentials: "same-origin" });
    } finally {
      window.location.href = "/admin/login";
    }
  }

  const activeCount = countActiveFilters(filters);
  const consultants = data?.consultants ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-hairline bg-white">
        <div className="mx-auto max-w-7xl px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-sans text-xs font-medium tracking-wide text-navy uppercase">GOP Admin</p>
            <h1 className="font-display text-xl text-ink">Consultants</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted hidden sm:inline">{adminEmail}</span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-md border border-hairline px-4 py-2 text-sm font-medium text-ink hover:border-navy/50 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              {loggingOut ? "Logging out…" : "Log Out"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8 flex flex-col gap-6">
        {/* Filters */}
        <section className="bg-white border border-hairline rounded-xl p-5 flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-display text-lg text-ink">Filters</h2>
              <p className="text-xs text-muted mt-0.5">
                Values within a filter are matched with OR; different filters are combined with AND.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted">
                {activeCount > 0 ? `${activeCount} filter${activeCount === 1 ? "" : "s"} active` : "No filters active"}
              </span>
              <button
                type="button"
                onClick={clearAllFilters}
                disabled={activeCount === 0}
                className="text-sm font-medium text-navy hover:underline disabled:opacity-40 disabled:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy rounded"
              >
                Clear all filters
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="search" className="text-sm font-medium text-ink block mb-1.5">
              Search
            </label>
            <TextInput
              id="search"
              placeholder="Name, email, or city"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            <div>
              <label htmlFor="city" className="text-sm font-medium text-ink block mb-1.5">
                City
              </label>
              <TextInput id="city" value={cityInput} onChange={(e) => setCityInput(e.target.value)} />
            </div>
            <div>
              <label htmlFor="state" className="text-sm font-medium text-ink block mb-1.5">
                State
              </label>
              <TextInput id="state" value={stateInput} onChange={(e) => setStateInput(e.target.value)} />
            </div>
            <div>
              <label htmlFor="country" className="text-sm font-medium text-ink block mb-1.5">
                Country
              </label>
              <TextInput id="country" value={countryInput} onChange={(e) => setCountryInput(e.target.value)} />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-ink mb-1.5">Status</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Status">
              {CONSULTANT_STATUS_OPTIONS.map((s) => (
                <Chip
                  key={s}
                  id={`filter-status-${s}`}
                  name="filter-status"
                  label={CONSULTANT_STATUS_LABELS[s]}
                  checked={filters.status.includes(s)}
                  onChange={() => toggleMulti<ConsultantStatus>("status", s)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-ink mb-1.5">Level</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Level">
              {LEVEL_OPTIONS.map((l) => (
                <Chip
                  key={l}
                  id={`filter-level-${l}`}
                  name="filter-level"
                  label={LEVEL_LABELS[l]}
                  checked={filters.level.includes(l)}
                  onChange={() => toggleMulti<Level>("level", l)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-ink mb-1.5">Travel willingness</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Travel willingness">
              {TRAVEL_WILLINGNESS_OPTIONS.map((t) => (
                <Chip
                  key={t}
                  id={`filter-travel-${t}`}
                  name="filter-travel"
                  label={TRAVEL_WILLINGNESS_LABELS[t]}
                  checked={filters.travelWillingness.includes(t)}
                  onChange={() => toggleMulti("travelWillingness", t)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-ink mb-1.5">Largest P&amp;L / budget owned</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="P&L band">
              {PNL_BAND_OPTIONS.map((p) => (
                <Chip
                  key={p}
                  id={`filter-pnl-${p}`}
                  name="filter-pnl"
                  label={PNL_BAND_LABELS[p]}
                  checked={filters.maxPnlBand.includes(p)}
                  onChange={() => toggleMulti<PnlBand>("maxPnlBand", p)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-ink mb-1.5">Client revenue band</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Client revenue band">
              {CLIENT_REVENUE_BAND_OPTIONS.map((b) => (
                <Chip
                  key={b}
                  id={`filter-revenue-${b}`}
                  name="filter-revenue"
                  label={CLIENT_REVENUE_BAND_LABELS[b]}
                  checked={filters.clientRevenueBands.includes(b)}
                  onChange={() => toggleMulti<ClientRevenueBand>("clientRevenueBands", b)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-ink mb-1.5">Remote</p>
            <RadioCardGroup
              name="filter-remote"
              options={remoteOptions}
              labels={remoteLabels}
              value={filters.openToRemote}
              onChange={(v) => {
                setFilters((f) => ({ ...f, openToRemote: v }));
                setPage(1);
              }}
            />
          </div>

          <div>
            <p className="text-sm font-medium text-ink mb-2">Delivery pillars &amp; sub-tags</p>
            <div className="flex flex-col gap-3">
              {taxonomy?.pillars.map((pillar) => (
                <div key={pillar.id}>
                  <div className="flex items-center gap-2 mb-1">
                    <Chip
                      id={`filter-pillar-${pillar.id}`}
                      name="filter-pillars"
                      label={pillar.name}
                      checked={filters.pillarIds.includes(pillar.id)}
                      onChange={() => toggleMultiNumber("pillarIds", pillar.id)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 pl-4 border-l-2 border-hairline ml-2">
                    {pillar.subTags.map((tag) => (
                      <Chip
                        key={tag.id}
                        id={`filter-subtag-${tag.id}`}
                        name="filter-subtags"
                        label={tag.name}
                        checked={filters.subTagIds.includes(tag.id)}
                        onChange={() => toggleMultiNumber("subTagIds", tag.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
              {!taxonomy && <p className="text-sm text-muted">Loading…</p>}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-ink mb-2">Industries</p>
            <div className="flex flex-col gap-3">
              {taxonomy?.industries.map((sector) => (
                <div key={sector.id}>
                  <Chip
                    id={`filter-industry-${sector.id}`}
                    name="filter-industries"
                    label={sector.name}
                    checked={filters.industryIds.includes(sector.id)}
                    onChange={() => toggleMultiNumber("industryIds", sector.id)}
                  />
                  {sector.children.length > 0 && (
                    <div className="flex flex-wrap gap-2 pl-4 border-l-2 border-hairline ml-2 mt-1">
                      {sector.children.map((child) => (
                        <Chip
                          key={child.id}
                          id={`filter-industry-${child.id}`}
                          name="filter-industries"
                          label={child.name}
                          checked={filters.industryIds.includes(child.id)}
                          onChange={() => toggleMultiNumber("industryIds", child.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {!taxonomy && <p className="text-sm text-muted">Loading…</p>}
            </div>
          </div>
        </section>

        {/* Results header / export */}
        <section className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-muted">
            {loading ? "Loading…" : `${total} consultant${total === 1 ? "" : "s"} match`}
          </p>
          <div className="flex gap-3">
            <a
              href={`/api/admin/export?format=csv&${exportParams.toString()}`}
              className="rounded-md border border-hairline px-4 py-2 text-sm font-medium text-ink hover:border-navy/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              Export CSV
            </a>
            <a
              href={`/api/admin/export?format=xlsx&${exportParams.toString()}`}
              className="rounded-md border border-hairline px-4 py-2 text-sm font-medium text-ink hover:border-navy/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              Export Excel
            </a>
          </div>
        </section>

        {/* Table */}
        <section className="bg-white border border-hairline rounded-xl overflow-hidden">
          {error && (
            <p role="alert" className="text-sm text-red-700 p-5">
              {error}
            </p>
          )}

          {!error && loading && (
            <p className="text-sm text-muted p-8 text-center">Loading consultants…</p>
          )}

          {!error && !loading && consultants.length === 0 && (
            <p className="text-sm text-muted p-8 text-center">
              No applications match these filters — try adjusting them.
            </p>
          )}

          {!error && !loading && consultants.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-light text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Contact</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Level</th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium">Remote</th>
                    <th className="px-4 py-3 font-medium">Pillars</th>
                    <th className="px-4 py-3 font-medium">Industries</th>
                    <th className="px-4 py-3 font-medium">Case studies</th>
                    <th className="px-4 py-3 font-medium">Submitted</th>
                    <th className="px-4 py-3 font-medium">Files</th>
                    <th className="px-4 py-3 font-medium">
                      <span className="sr-only">Details</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {consultants.map((c) => {
                    const expanded = expandedId === c.id;
                    const pillarNames = Array.from(new Set(c.capabilities.map((cap) => cap.pillarName)));
                    const industryNames = c.industries.map((i) => i.name);
                    return (
                      <Fragment key={c.id}>
                        <tr className="border-t border-hairline align-top">
                          <td className="px-4 py-3 font-mono text-xs text-ink whitespace-nowrap">
                            {c.consultantCode}
                          </td>
                          <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">{c.fullName}</td>
                          <td className="px-4 py-3 text-ink">
                            <div className="flex flex-col">
                              <span className="whitespace-nowrap">{c.email}</span>
                              <span className="text-muted text-xs">{dash(c.mobile)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-ink">
                            {CONSULTANT_STATUS_LABELS[c.status]}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-ink">
                            {c.level ? LEVEL_LABELS[c.level] : "—"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-ink">
                            {[c.city, c.state, c.country].filter(Boolean).join(", ") || "—"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-ink">
                            {c.openToRemote === null ? "—" : c.openToRemote ? "Yes" : "No"}
                          </td>
                          <td className="px-4 py-3 min-w-[10rem]">
                            <TruncatedList values={pillarNames} />
                          </td>
                          <td className="px-4 py-3 min-w-[8rem]">
                            <TruncatedList values={industryNames} />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-ink text-center">
                            {c.caseStudies.length}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDate(c.createdAt)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              {c.hasCv ? (
                                <a
                                  href={`/api/admin/consultants/${c.id}/cv`}
                                  className="text-navy font-medium hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy rounded"
                                >
                                  CV
                                </a>
                              ) : (
                                <span className="text-muted text-xs">No CV</span>
                              )}
                              {c.hasDeck ? (
                                <a
                                  href={`/api/admin/consultants/${c.id}/deck`}
                                  className="text-navy font-medium hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy rounded"
                                >
                                  Deck
                                </a>
                              ) : (
                                <span className="text-muted text-xs">No deck</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setExpandedId(expanded ? null : c.id)}
                              className="text-navy text-sm font-medium hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy rounded"
                              aria-expanded={expanded}
                            >
                              {expanded ? "Hide" : "Details"}
                            </button>
                          </td>
                        </tr>
                        {expanded && (
                          <tr className="border-t border-hairline bg-gray-light/40">
                            <td colSpan={13} className="px-4 py-5">
                              <div className="flex flex-col gap-6">
                                <div className="grid sm:grid-cols-3 md:grid-cols-4 gap-5">
                                  <DetailField label="Total years experience" value={dash(c.totalYearsExp)} />
                                  <DetailField label="Operating years" value={dash(c.operatingYearsExp)} />
                                  <DetailField label="Advisory years" value={dash(c.advisoryYearsExp)} />
                                  <DetailField label="Largest team managed" value={dash(c.maxTeamManaged)} />
                                  <DetailField
                                    label="Largest P&L / budget"
                                    value={c.maxPnlBand ? PNL_BAND_LABELS[c.maxPnlBand] : "—"}
                                  />
                                  <DetailField
                                    label="Travel willingness"
                                    value={
                                      c.travelWillingness
                                        ? TRAVEL_WILLINGNESS_LABELS[
                                            c.travelWillingness as keyof typeof TRAVEL_WILLINGNESS_LABELS
                                          ]
                                        : "—"
                                    }
                                  />
                                  <DetailField
                                    label="Client revenue bands"
                                    value={
                                      c.clientRevenueBands.length > 0
                                        ? c.clientRevenueBands.map((b) => CLIENT_REVENUE_BAND_LABELS[b]).join(", ")
                                        : "—"
                                    }
                                  />
                                  <DetailField
                                    label="LinkedIn"
                                    value={
                                      c.linkedinUrl ? (
                                        <a
                                          href={c.linkedinUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-navy hover:underline"
                                        >
                                          Profile
                                        </a>
                                      ) : (
                                        "—"
                                      )
                                    }
                                  />
                                  <DetailField
                                    label="Invited by"
                                    value={
                                      c.invitedBy
                                        ? `${c.invitedBy.fullName} (${c.invitedBy.consultantCode})`
                                        : "Direct / GOP-sourced"
                                    }
                                  />
                                  <DetailField label="Consent given" value={c.consentFlag ? "Yes" : "No"} />
                                </div>

                                <div>
                                  <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
                                    Delivery capabilities
                                  </p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {c.capabilities.length === 0 && <span className="text-muted text-sm">—</span>}
                                    {c.capabilities.map((cap) => (
                                      <span
                                        key={cap.tagId}
                                        className="inline-block rounded bg-white border border-hairline px-2 py-1 text-xs text-ink"
                                        title={cap.pillarName}
                                      >
                                        {cap.tagName}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
                                    Industries
                                  </p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {c.industries.length === 0 && <span className="text-muted text-sm">—</span>}
                                    {c.industries.map((i) => (
                                      <span
                                        key={i.industryId}
                                        className="inline-block rounded bg-white border border-hairline px-2 py-1 text-xs text-ink"
                                      >
                                        {i.name}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-5">
                                  <DetailField
                                    label="Why do you want to be part of GOP?"
                                    value={c.reasonForJoining || "—"}
                                  />
                                  <DetailField
                                    label="How will you deliver engagements?"
                                    value={c.deliveryStyle || "—"}
                                  />
                                </div>

                                <div>
                                  <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
                                    Engagement profile
                                  </p>
                                  {c.engagementProfile ? (
                                    <div className="grid sm:grid-cols-3 md:grid-cols-5 gap-4 bg-white border border-hairline rounded-lg p-4">
                                      <DetailField
                                        label="Type"
                                        value={
                                          c.engagementProfile.engagementType
                                            ? ENGAGEMENT_TYPE_LABELS[
                                                c.engagementProfile.engagementType as keyof typeof ENGAGEMENT_TYPE_LABELS
                                              ]
                                            : "—"
                                        }
                                      />
                                      <DetailField
                                        label="Availability"
                                        value={
                                          c.engagementProfile.availabilityDaysWeek !== null
                                            ? `${c.engagementProfile.availabilityDaysWeek} days/week`
                                            : "—"
                                        }
                                      />
                                      <DetailField
                                        label="Notice period"
                                        value={
                                          c.engagementProfile.noticePeriodDays !== null
                                            ? `${c.engagementProfile.noticePeriodDays} days`
                                            : "—"
                                        }
                                      />
                                      <DetailField label="Rate band" value={dash(c.engagementProfile.rateBand)} />
                                      <DetailField
                                        label="Currently engaged"
                                        value={
                                          c.engagementProfile.currentlyEngaged === null
                                            ? "—"
                                            : c.engagementProfile.currentlyEngaged
                                              ? "Yes"
                                              : "No"
                                        }
                                      />
                                      {c.engagementProfile.currentlyEngaged && (
                                        <div className="sm:col-span-3 md:col-span-5">
                                          <DetailField
                                            label="Exclusivity / non-compete notes"
                                            value={dash(c.engagementProfile.exclusivityNotes)}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted">No engagement profile submitted.</p>
                                  )}
                                </div>

                                <div>
                                  <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
                                    Case studies ({c.caseStudies.length})
                                  </p>
                                  <div className="flex flex-col gap-3">
                                    {c.caseStudies.length === 0 && (
                                      <p className="text-sm text-muted">No case studies submitted.</p>
                                    )}
                                    {c.caseStudies.map((cs, i) => (
                                      <div key={cs.id} className="bg-white border border-hairline rounded-lg p-4 flex flex-col gap-3">
                                        <div className="flex items-center justify-between gap-3 flex-wrap">
                                          <h4 className="font-display text-base text-ink">
                                            {i + 1}. {cs.title}
                                          </h4>
                                          <div className="flex flex-wrap gap-1.5">
                                            {cs.pillars.map((p) => (
                                              <span
                                                key={p.pillarId}
                                                className="inline-block rounded bg-gray-light px-1.5 py-0.5 text-xs text-ink"
                                              >
                                                {p.pillarName}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                        <div className="grid sm:grid-cols-4 gap-4">
                                          <DetailField label="Client industry" value={cs.clientIndustryName} />
                                          <DetailField
                                            label="Client size band"
                                            value={CLIENT_REVENUE_BAND_LABELS[cs.clientSizeBand]}
                                          />
                                          <DetailField
                                            label="Role"
                                            value={
                                              CASE_STUDY_ROLE_LABELS[cs.role as keyof typeof CASE_STUDY_ROLE_LABELS] ??
                                              cs.role
                                            }
                                          />
                                          <DetailField label="Duration" value={`${cs.durationMonths} months`} />
                                        </div>
                                        <DetailField label="Situation" value={cs.situationText} />
                                        <DetailField label="Intervention" value={cs.interventionText} />
                                        <DetailField label="Outcome" value={cs.outcomeText} />
                                        <DetailField
                                          label="Referenceable"
                                          value={
                                            REFERENCEABLE_LABELS[
                                              cs.referenceable as keyof typeof REFERENCEABLE_LABELS
                                            ] ?? cs.referenceable
                                          }
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!error && !loading && consultants.length > 0 && (
            <div className="flex items-center justify-between gap-4 px-4 py-4 border-t border-hairline flex-wrap">
              <p className="text-sm text-muted">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-md border border-hairline px-3 py-1.5 text-sm font-medium text-ink hover:border-navy/50 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-md border border-hairline px-3 py-1.5 text-sm font-medium text-ink hover:border-navy/50 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
