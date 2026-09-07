import type {
  Level,
  TravelWillingness,
  PnlBand,
  ClientRevenueBand,
  ConsultantStatus,
  CaseStudyRole,
  Referenceable,
  EngagementType,
  ClientEngagementStatus,
} from "@prisma/client";

/**
 * Single source of truth mapping every Prisma enum value to its
 * human-readable display label, plus the option arrays used to render
 * dropdowns/checkboxes in display order.
 *
 * IMPORTANT: enum types are imported with `import type` only — this is
 * erased at compile time, so this file has ZERO runtime dependency on
 * @prisma/client. That makes it safe to import from Client Components
 * (Prisma's generated client is Node-only and cannot be bundled for the
 * browser). Enum values below are therefore plain string literals, not
 * `Level.CONSULTANT`-style computed member access, and there is
 * deliberately no `Object.values(SomeEnum)` anywhere in this file.
 *
 * These are typed as `Record<Enum, string>`, so adding a new enum member
 * in prisma/schema.prisma without updating this file is a TypeScript
 * compile error — keeps frontend/admin filters and export code in sync
 * with the schema by construction.
 *
 * NOT in this file: pillars, sub_tags, industries. That taxonomy lives in
 * DATABASE TABLES (see prisma/schema.prisma models Pillar / SubTag /
 * Industry, seeded by prisma/migrations/20260901145720_seed_taxonomy), not
 * as hardcoded arrays here — it must be fetched from the DB (e.g. via a
 * small server-side lookup/cache helper) so a taxonomy edit only ever
 * requires a migration, never a code change plus a redeploy in two places.
 */

// ---------------------------------------------------------------------------
// Level
// ---------------------------------------------------------------------------

export const LEVEL_LABELS: Record<Level, string> = {
  CONSULTANT: "Consultant",
  SENIOR_CONSULTANT: "Sr. Consultant",
  PRINCIPAL: "Principal",
};

/** Year-range labels are display-only; not stored in the DB. */
export const LEVEL_YEAR_RANGE_LABELS: Record<Level, string> = {
  CONSULTANT: "5-10 yrs",
  SENIOR_CONSULTANT: "10-18 yrs",
  PRINCIPAL: "18-25 yrs",
};

export const LEVEL_OPTIONS: Level[] = [
  "CONSULTANT",
  "SENIOR_CONSULTANT",
  "PRINCIPAL",
];

// ---------------------------------------------------------------------------
// Total years of experience bands (§2 Section B). Display-only UI bucketing
// — the DB stores totalYearsExp as a plain Int, not this enum. Kept here
// (not in Prisma) because there is no enum backing it; the form presents
// bands, the API converts the selected band to a representative Int (or the
// form could collect the raw number directly — that decision belongs to the
// frontend/api agents, not this file). Exported so both agents reference the
// same band boundaries instead of redefining them independently.
// ---------------------------------------------------------------------------

export type TotalYearsExpBand = "5-10" | "10-18" | "18-25" | "25+";

export const TOTAL_YEARS_EXP_BAND_LABELS: Record<TotalYearsExpBand, string> = {
  "5-10": "5-10 years",
  "10-18": "10-18 years",
  "18-25": "18-25 years",
  "25+": "25+ years",
};

export const TOTAL_YEARS_EXP_BAND_OPTIONS: TotalYearsExpBand[] = [
  "5-10",
  "10-18",
  "18-25",
  "25+",
];

// ---------------------------------------------------------------------------
// TravelWillingness
// ---------------------------------------------------------------------------

export const TRAVEL_WILLINGNESS_LABELS: Record<TravelWillingness, string> = {
  NONE: "None",
  DOMESTIC: "Domestic",
  DOMESTIC_INTERNATIONAL: "Domestic + International",
};

export const TRAVEL_WILLINGNESS_OPTIONS: TravelWillingness[] = [
  "NONE",
  "DOMESTIC",
  "DOMESTIC_INTERNATIONAL",
];

// ---------------------------------------------------------------------------
// PnlBand — largest P&L / budget owned
// ---------------------------------------------------------------------------

export const PNL_BAND_LABELS: Record<PnlBand, string> = {
  UNDER_5CR: "< ₹5cr",
  CR_5_TO_25: "₹5-25cr",
  CR_25_TO_100: "₹25-100cr",
  OVER_100CR: "₹100cr+",
  NOT_APPLICABLE: "Not applicable",
};

export const PNL_BAND_OPTIONS: PnlBand[] = [
  "UNDER_5CR",
  "CR_5_TO_25",
  "CR_25_TO_100",
  "OVER_100CR",
  "NOT_APPLICABLE",
];

// ---------------------------------------------------------------------------
// ClientRevenueBand — used both for consultants.clientRevenueBands
// (multi-select) and case_studies.clientSizeBand (single value).
// ---------------------------------------------------------------------------

export const CLIENT_REVENUE_BAND_LABELS: Record<ClientRevenueBand, string> = {
  UNDER_150CR: "< ₹150cr",
  CR_150_TO_300: "₹150-300cr",
  CR_300_TO_500: "₹300-500cr",
  OVER_500CR: "₹500cr+",
};

export const CLIENT_REVENUE_BAND_OPTIONS: ClientRevenueBand[] = [
  "UNDER_150CR",
  "CR_150_TO_300",
  "CR_300_TO_500",
  "OVER_500CR",
];

// ---------------------------------------------------------------------------
// ConsultantStatus
// ---------------------------------------------------------------------------

export const CONSULTANT_STATUS_LABELS: Record<ConsultantStatus, string> = {
  INVITED: "Invited",
  APPLIED: "Applied",
  APPROVED: "Approved",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  DECLINED: "Declined",
};

export const CONSULTANT_STATUS_OPTIONS: ConsultantStatus[] = [
  "INVITED",
  "APPLIED",
  "APPROVED",
  "ACTIVE",
  "INACTIVE",
  "DECLINED",
];

// ---------------------------------------------------------------------------
// CaseStudyRole
// ---------------------------------------------------------------------------

export const CASE_STUDY_ROLE_LABELS: Record<CaseStudyRole, string> = {
  LEAD: "Lead",
  CORE_TEAM: "Core team",
  CONTRIBUTOR: "Contributor",
};

export const CASE_STUDY_ROLE_OPTIONS: CaseStudyRole[] = [
  "LEAD",
  "CORE_TEAM",
  "CONTRIBUTOR",
];

// ---------------------------------------------------------------------------
// Referenceable
// ---------------------------------------------------------------------------

export const REFERENCEABLE_LABELS: Record<Referenceable, string> = {
  NAMED: "Named",
  ANONYMIZED_ONLY: "Anonymized only",
};

export const REFERENCEABLE_OPTIONS: Referenceable[] = [
  "NAMED",
  "ANONYMIZED_ONLY",
];

// ---------------------------------------------------------------------------
// EngagementType — engagement_profile.engagementType
// ---------------------------------------------------------------------------

export const ENGAGEMENT_TYPE_LABELS: Record<EngagementType, string> = {
  FRACTIONAL: "Fractional / part-time",
  FULL_PROJECT: "Full project deployment",
  ADVISORY_ONLY: "Advisory-only",
  INTERIM: "Interim operator role",
};

export const ENGAGEMENT_TYPE_OPTIONS: EngagementType[] = [
  "FRACTIONAL",
  "FULL_PROJECT",
  "ADVISORY_ONLY",
  "INTERIM",
];

// ---------------------------------------------------------------------------
// ClientEngagementStatus — client_engagements.status. NOT the same enum as
// ConsultantStatus even though both have an ACTIVE member; kept distinct on
// purpose, see prisma/schema.prisma.
// ---------------------------------------------------------------------------

export const CLIENT_ENGAGEMENT_STATUS_LABELS: Record<ClientEngagementStatus, string> = {
  PROSPECT: "Prospect",
  ACTIVE: "Active",
  COMPLETED: "Completed",
};

export const CLIENT_ENGAGEMENT_STATUS_OPTIONS: ClientEngagementStatus[] = [
  "PROSPECT",
  "ACTIVE",
  "COMPLETED",
];

// ---------------------------------------------------------------------------
// Character/length limits for free-text fields (§2), mirrored at the DB
// layer as VARCHAR(n) on case_studies and enforced again by zod at the API
// layer. Exported so the form and API validation schema share one number
// instead of three independently-maintained copies.
// ---------------------------------------------------------------------------

export const CASE_STUDY_LIMITS = {
  title: 80,
  situationText: 200,
  interventionText: 250,
  outcomeText: 150,
} as const;

export const QUALIFYING_QUESTION_LIMITS = {
  reasonForJoining: 200,
  deliveryStyle: 200,
} as const;

export const ENGAGEMENT_PROFILE_LIMITS = {
  exclusivityNotes: 150,
} as const;
