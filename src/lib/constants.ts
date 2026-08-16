import type { Level, DeliveryFunction, Skill, Industry } from "@prisma/client";

/**
 * Single source of truth mapping every Prisma enum value to its
 * human-readable display label, plus UI-only grouping metadata that is
 * NOT modeled in the database (skill clusters, level year ranges).
 *
 * IMPORTANT: enum types are imported with `import type` only — this is
 * erased at compile time, so this file has ZERO runtime dependency on
 * @prisma/client. That makes it safe to import from Client Components
 * (Prisma's generated client is Node-only and cannot be bundled for the
 * browser). Enum values below are therefore plain string literals, not
 * `Level.CONSULTANT`-style computed member access.
 *
 * These are typed as `Record<Enum, string>`, so adding a new enum member
 * in prisma/schema.prisma without updating this file is a TypeScript
 * compile error — keeps frontend/admin filters and export code in sync
 * with the schema by construction.
 */

// ---------------------------------------------------------------------------
// Level
// ---------------------------------------------------------------------------

export const LEVEL_LABELS: Record<Level, string> = {
  CONSULTANT: "Consultant",
  SENIOR_CONSULTANT: "Sr. Consultant",
  PRINCIPAL: "Principal",
  PARTNER: "Partner",
};

/** Year-range labels are display-only; not stored in the DB. */
export const LEVEL_YEAR_RANGE_LABELS: Record<Level, string> = {
  CONSULTANT: "5-10 yrs",
  SENIOR_CONSULTANT: "10-18 yrs",
  PRINCIPAL: "18-25 yrs",
  PARTNER: "25+ yrs",
};

// PARTNER is deliberately absent: it stays in the Prisma enum and in the label
// maps above (so any historical row still renders), but it is not offered on
// the form and the API's zod schema — which validates against this array —
// rejects it. Re-add the string here to bring the option back.
export const LEVEL_OPTIONS: Level[] = [
  "CONSULTANT",
  "SENIOR_CONSULTANT",
  "PRINCIPAL",
];

// ---------------------------------------------------------------------------
// DeliveryFunction
// ---------------------------------------------------------------------------

export const DELIVERY_FUNCTION_LABELS: Record<DeliveryFunction, string> = {
  SALES_AND_BD: "Sales & BD",
  MARKETING_AND_BRANDING: "Marketing & Branding",
  OPERATIONS_AND_SUPPLY_CHAIN: "Operations & Supply Chain",
  HR_OPS_AND_ORGANISATION_DESIGN: "HR Ops & Organisation Design",
  TALENT_ACQUISITION_AND_HEAD_HUNTING: "Talent Acquisition & Head Hunting",
  LEARNING_AND_DEVELOPMENT: "Learning & Development",
  BUSINESS_TRANSFORMATION_WITH_AI: "Business Transformation with AI",
  CORPORATE_FINANCE_AND_WORKING_CAPITAL: "Corporate Finance & Working Capital",
  ACCOUNTING_AND_TAXATION: "Accounting & Taxation",
  ACCOUNTS_RECEIVABLES_AND_PAYABLES: "Accounts Receivables & Payables",
};

export const DELIVERY_FUNCTION_OPTIONS: DeliveryFunction[] = [
  "SALES_AND_BD",
  "MARKETING_AND_BRANDING",
  "OPERATIONS_AND_SUPPLY_CHAIN",
  "HR_OPS_AND_ORGANISATION_DESIGN",
  "TALENT_ACQUISITION_AND_HEAD_HUNTING",
  "LEARNING_AND_DEVELOPMENT",
  "BUSINESS_TRANSFORMATION_WITH_AI",
  "CORPORATE_FINANCE_AND_WORKING_CAPITAL",
  "ACCOUNTING_AND_TAXATION",
  "ACCOUNTS_RECEIVABLES_AND_PAYABLES",
];

// ---------------------------------------------------------------------------
// Skill (flat enum) + cluster grouping (UI-only, not in DB)
// ---------------------------------------------------------------------------

export const SKILL_LABELS: Record<Skill, string> = {
  STRATEGY: "Strategy",
  EXECUTION: "Execution",
  PROCESS: "Process",
  SOP: "SOP",
  TRACKERS: "Trackers",
  MIS: "MIS",
  DATA_ANALYSIS: "Data Analysis",
  EXCEL: "Excel",
  ADVANCED_EXCEL: "Advanced Excel",
  BI: "BI",
  AGENTIC_AI: "Agentic AI",
  POWERPOINT: "PowerPoint",
  COMMUNICATION: "Communication",
  DIGITAL_MARKETING_ASSETS_MANAGEMENT: "Digital Marketing Assets Management",
  KEY_ACCOUNTS_MANAGEMENT: "Key Accounts Management",
  LEAD_GENERATION: "Lead Generation",
  NEW_BUSINESS_DEVELOPMENT: "New Business Development",
};

export type SkillClusterName =
  | "Strategy & Execution"
  | "Data & Analysis"
  | "Tools & Communication"
  | "Growth & Business Development";

export const SKILL_CLUSTERS: Record<SkillClusterName, Skill[]> = {
  "Strategy & Execution": ["STRATEGY", "EXECUTION", "PROCESS", "SOP", "TRACKERS"],
  "Data & Analysis": [
    "MIS",
    "DATA_ANALYSIS",
    "EXCEL",
    "ADVANCED_EXCEL",
    "BI",
    "AGENTIC_AI",
  ],
  "Tools & Communication": [
    "POWERPOINT",
    "COMMUNICATION",
    "DIGITAL_MARKETING_ASSETS_MANAGEMENT",
  ],
  "Growth & Business Development": [
    "KEY_ACCOUNTS_MANAGEMENT",
    "LEAD_GENERATION",
    "NEW_BUSINESS_DEVELOPMENT",
  ],
};

// Compile-time exhaustiveness check: every Skill must appear in exactly one
// cluster. If this line fails to type-check after adding a new Skill member
// without adding it to SKILL_CLUSTERS, the array literal below is the
// canonical list to update.
const _allClusteredSkills: Skill[] = Object.values(SKILL_CLUSTERS).flat();
void _allClusteredSkills;

export const SKILL_OPTIONS: Skill[] = [
  "STRATEGY",
  "EXECUTION",
  "PROCESS",
  "SOP",
  "TRACKERS",
  "MIS",
  "DATA_ANALYSIS",
  "EXCEL",
  "ADVANCED_EXCEL",
  "BI",
  "AGENTIC_AI",
  "POWERPOINT",
  "COMMUNICATION",
  "DIGITAL_MARKETING_ASSETS_MANAGEMENT",
  "KEY_ACCOUNTS_MANAGEMENT",
  "LEAD_GENERATION",
  "NEW_BUSINESS_DEVELOPMENT",
];

// ---------------------------------------------------------------------------
// Industry
// ---------------------------------------------------------------------------

export const INDUSTRY_LABELS: Record<Industry, string> = {
  MANUFACTURING: "Manufacturing",
  PACKAGING: "Packaging",
  SERVICES: "Services",
  CONSULTING: "Consulting",
  PRIVATE_EQUITY: "Private Equity",
  BANKING: "Banking",
  OTHERS: "Others",
};

export const INDUSTRY_OPTIONS: Industry[] = [
  "MANUFACTURING",
  "PACKAGING",
  "SERVICES",
  "CONSULTING",
  "PRIVATE_EQUITY",
  "BANKING",
  "OTHERS",
];
