"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import type { Level, DeliveryFunction, Skill, Industry } from "@prisma/client";
import {
  LEVEL_OPTIONS,
  LEVEL_LABELS,
  DELIVERY_FUNCTION_OPTIONS,
  DELIVERY_FUNCTION_LABELS,
  SKILL_LABELS,
  SKILL_CLUSTERS,
  INDUSTRY_OPTIONS,
  INDUSTRY_LABELS,
} from "@/lib/constants";
import {
  buildFilterParams,
  countActiveFilters,
  EMPTY_FILTER_STATE,
  type AdminFilterState,
} from "@/lib/admin-query";
import { ChipGroup } from "@/components/Chip";
import { RadioCardGroup } from "@/components/RadioCardGroup";
import { TextInput } from "@/components/TextInput";

const PAGE_SIZE = 25;

const QUALIFYING_QUESTIONS: { field: string; label: string }[] = [
  { field: "qWhatIsGop", label: "What is GOP?" },
  { field: "qWhyJoinGop", label: "Why do you want to be part of GOP?" },
  {
    field: "qKeySkills",
    label: "What are your key skills that make you the go-to person for this role?",
  },
  {
    field: "qRelevantExperience",
    label: "What's your relevant experience that qualifies you for this role?",
  },
  { field: "qHowDeliver", label: "How will you deliver your services?" },
];

interface ApplicationRow {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  level: Level;
  functions: DeliveryFunction[];
  skills: Skill[];
  industries: Industry[];
  city: string;
  state: string;
  country: string;
  remote: boolean;
  additionalNotes: string | null;
  qWhatIsGop: string;
  qWhyJoinGop: string;
  qKeySkills: string;
  qRelevantExperience: string;
  qHowDeliver: string;
  cvFileName: string | null;
  cvMimeType: string | null;
  cvSizeBytes: number | null;
  createdAt: string;
  updatedAt: string;
  hasCv: boolean;
}

interface ListResponse {
  applications: ApplicationRow[];
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

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** Renders a capped list of chips ("first N + more") with a title tooltip
 * carrying the full list, so long multi-selects don't blow out row height. */
function TruncatedList({
  values,
  labels,
  max = 2,
}: {
  values: string[];
  labels: Record<string, string>;
  max?: number;
}) {
  if (values.length === 0) {
    return <span className="text-muted text-xs">&mdash;</span>;
  }
  const shown = values.slice(0, max);
  const rest = values.length - shown.length;
  const fullTitle = values.map((v) => labels[v] ?? v).join(", ");
  return (
    <span className="flex flex-wrap gap-1" title={fullTitle}>
      {shown.map((v) => (
        <span
          key={v}
          className="inline-block rounded bg-gray-light px-1.5 py-0.5 text-xs text-ink whitespace-nowrap"
        >
          {labels[v] ?? v}
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

export function AdminDashboard({ adminEmail }: { adminEmail: string }) {
  const [filters, setFilters] = useState<AdminFilterState>(EMPTY_FILTER_STATE);
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Debounce the free-text search box into filters.search.
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput }));
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const queryString = useMemo(
    () => buildFilterParams(filters, { page, pageSize: PAGE_SIZE }).toString(),
    [filters, page],
  );

  const exportParams = useMemo(() => buildFilterParams(filters), [filters]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/applications?${queryString}`, { credentials: "same-origin" })
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = "/admin/login";
          return null;
        }
        if (!res.ok) {
          throw new Error("Failed to load applications.");
        }
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

  function clearAllFilters() {
    setFilters(EMPTY_FILTER_STATE);
    setSearchInput("");
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
  const applications = data?.applications ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-hairline bg-white">
        <div className="mx-auto max-w-7xl px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-sans text-xs font-medium tracking-wide text-navy uppercase">
              GOP Admin
            </p>
            <h1 className="font-display text-xl text-ink">Applications</h1>
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
              placeholder="Name, email, city, or state"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="city" className="text-sm font-medium text-ink block mb-1.5">
                City
              </label>
              <TextInput
                id="city"
                value={filters.city}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, city: e.target.value }));
                  setPage(1);
                }}
              />
            </div>
            <div>
              <label htmlFor="state" className="text-sm font-medium text-ink block mb-1.5">
                State
              </label>
              <TextInput
                id="state"
                value={filters.state}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, state: e.target.value }));
                  setPage(1);
                }}
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-ink mb-1.5">Level</p>
            <ChipGroup
              name="filter-level"
              options={LEVEL_OPTIONS}
              labels={LEVEL_LABELS}
              selected={filters.level}
              onToggle={(v) => toggleMulti<Level>("level", v)}
            />
          </div>

          <div>
            <p className="text-sm font-medium text-ink mb-1.5">Delivery function</p>
            <ChipGroup
              name="filter-functions"
              options={DELIVERY_FUNCTION_OPTIONS}
              labels={DELIVERY_FUNCTION_LABELS}
              selected={filters.functions}
              onToggle={(v) => toggleMulti<DeliveryFunction>("functions", v)}
            />
          </div>

          <div>
            <p className="text-sm font-medium text-ink mb-2">Skills</p>
            <div className="flex flex-col gap-3">
              {Object.entries(SKILL_CLUSTERS).map(([cluster, skills]) => (
                <div key={cluster}>
                  <p className="text-xs text-muted mb-1">{cluster}</p>
                  <ChipGroup
                    name={`filter-skills-${cluster}`}
                    options={skills}
                    labels={SKILL_LABELS}
                    selected={filters.skills}
                    onToggle={(v) => toggleMulti<Skill>("skills", v)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-ink mb-1.5">Industry experience</p>
            <ChipGroup
              name="filter-industries"
              options={INDUSTRY_OPTIONS}
              labels={INDUSTRY_LABELS}
              selected={filters.industries}
              onToggle={(v) => toggleMulti<Industry>("industries", v)}
            />
          </div>

          <div>
            <p className="text-sm font-medium text-ink mb-1.5">Remote</p>
            <RadioCardGroup
              name="filter-remote"
              options={remoteOptions}
              labels={remoteLabels}
              value={filters.remote}
              onChange={(v) => {
                setFilters((f) => ({ ...f, remote: v }));
                setPage(1);
              }}
            />
          </div>
        </section>

        {/* Results header / export */}
        <section className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-muted">
            {loading ? "Loading…" : `${total} application${total === 1 ? "" : "s"} match`}
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
            <p className="text-sm text-muted p-8 text-center">Loading applications…</p>
          )}

          {!error && !loading && applications.length === 0 && (
            <p className="text-sm text-muted p-8 text-center">
              No applications match these filters — try adjusting them.
            </p>
          )}

          {!error && !loading && applications.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-light text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Contact</th>
                    <th className="px-4 py-3 font-medium">Level</th>
                    <th className="px-4 py-3 font-medium">Functions</th>
                    <th className="px-4 py-3 font-medium">Skills</th>
                    <th className="px-4 py-3 font-medium">Industries</th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium">Remote</th>
                    <th className="px-4 py-3 font-medium">CV</th>
                    <th className="px-4 py-3 font-medium">Submitted</th>
                    <th className="px-4 py-3 font-medium">
                      <span className="sr-only">Details</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => {
                    const expanded = expandedId === app.id;
                    return (
                      <Fragment key={app.id}>
                        <tr className="border-t border-hairline align-top">
                          <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">
                            {app.fullName}
                          </td>
                          <td className="px-4 py-3 text-ink">
                            <div className="flex flex-col">
                              <span className="whitespace-nowrap">{app.email}</span>
                              <span className="text-muted text-xs">{app.phone}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-ink">
                            {LEVEL_LABELS[app.level]}
                          </td>
                          <td className="px-4 py-3 min-w-[10rem]">
                            <TruncatedList values={app.functions} labels={DELIVERY_FUNCTION_LABELS} />
                          </td>
                          <td className="px-4 py-3 min-w-[10rem]">
                            <TruncatedList values={app.skills} labels={SKILL_LABELS} />
                          </td>
                          <td className="px-4 py-3 min-w-[8rem]">
                            <TruncatedList values={app.industries} labels={INDUSTRY_LABELS} />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-ink">
                            {app.city}, {app.state}, {app.country}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-ink">
                            {app.remote ? "Yes" : "No"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {app.hasCv ? (
                              <a
                                href={`/api/admin/applications/${app.id}/cv`}
                                className="text-navy font-medium hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy rounded"
                              >
                                Download
                              </a>
                            ) : (
                              <span className="text-muted">No CV</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-muted">
                            {formatDate(app.createdAt)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setExpandedId(expanded ? null : app.id)}
                              className="text-navy text-sm font-medium hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy rounded"
                              aria-expanded={expanded}
                            >
                              {expanded ? "Hide" : "Details"}
                            </button>
                          </td>
                        </tr>
                        {expanded && (
                          <tr className="border-t border-hairline bg-gray-light/40">
                            <td colSpan={11} className="px-4 py-5">
                              <div className="grid sm:grid-cols-2 gap-5">
                                {QUALIFYING_QUESTIONS.map((q) => (
                                  <div key={q.field}>
                                    <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1">
                                      {q.label}
                                    </p>
                                    <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">
                                      {(app as unknown as Record<string, string>)[q.field] || "—"}
                                    </p>
                                  </div>
                                ))}
                                <div>
                                  <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1">
                                    Anything else
                                  </p>
                                  <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">
                                    {app.additionalNotes || "—"}
                                  </p>
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
          {!error && !loading && applications.length > 0 && (
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
