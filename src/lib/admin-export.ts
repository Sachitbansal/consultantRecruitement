import type { Prisma } from "@prisma/client";
import {
  LEVEL_LABELS,
  TRAVEL_WILLINGNESS_LABELS,
  PNL_BAND_LABELS,
  CLIENT_REVENUE_BAND_LABELS,
  CONSULTANT_STATUS_LABELS,
  CASE_STUDY_ROLE_LABELS,
  REFERENCEABLE_LABELS,
  ENGAGEMENT_TYPE_LABELS,
} from "@/lib/constants";

// ---------------------------------------------------------------------------
// Shared row-shaping for CSV/XLSX export. Both formats must show identical
// human-readable data, so the mapping from a raw Prisma row -> display
// fields lives in exactly one place.
//
// Shape decision: ONE ROW PER CONSULTANT, with case studies flattened into
// up to 3 fixed blocks of columns (Case Study 1 ... / Case Study 2 ... /
// Case Study 3 ...), rather than a second sheet or one row per case study.
// Justification:
//   - The submission flow (POST /api/applications) enforces 1-3 case
//     studies per consultant server-side, so a fixed 3-block layout is
//     provably lossless — there is no consultant with a 4th case study that
//     could be silently dropped.
//   - A consultant with fewer than 3 case studies simply has blank cells in
//     the unused block(s); nothing is invented or omitted.
//   - Keeping one row per consultant (rather than one row per case study,
//     which would repeat every identity/capability/industry column 1-3x
//     per consultant) is what the primary admin use case actually needs:
//     "here is the roster, filtered, one line per person" — sorting/
//     filtering the export in Excel by e.g. level or city stays meaningful,
//     which it would not if consultant identity columns repeated per case
//     study row.
//   - A second sheet was considered and rejected: it would require the
//     admin to cross-reference two sheets by consultant id/email to see a
//     person's full picture, for no benefit over flattened columns given
//     the max-3 cap makes flattening lossless.
// ---------------------------------------------------------------------------

const CASE_STUDY_BLOCK_COUNT = 3;

function caseStudyColumns(n: number): string[] {
  return [
    `Case Study ${n} Title`,
    `Case Study ${n} Client Industry`,
    `Case Study ${n} Client Size Band`,
    `Case Study ${n} Role`,
    `Case Study ${n} Situation`,
    `Case Study ${n} Intervention`,
    `Case Study ${n} Outcome`,
    `Case Study ${n} Duration (months)`,
    `Case Study ${n} Referenceable`,
    `Case Study ${n} Pillars`,
  ];
}

export const EXPORT_COLUMNS = [
  "Consultant Code",
  "Full Name",
  "Email",
  "Mobile",
  "LinkedIn URL",
  "City",
  "State",
  "Country",
  "Open to Remote",
  "Travel Willingness",
  "Status",
  "Level",
  "Total Years Exp",
  "Operating Years Exp",
  "Advisory Years Exp",
  "Max Team Managed",
  "Max P&L Band",
  "Client Revenue Bands",
  "Delivery Pillars",
  "Capabilities",
  "Industries",
  "Invited By",
  "Date Invited",
  "Date Applied",
  "Date Approved",
  "CV File Name",
  "Deck File Name",
  "Consent",
  "Reason For Joining",
  "Delivery Style",
  "Engagement Type",
  "Availability (days/week)",
  "Notice Period (days)",
  "Rate Band",
  "Currently Engaged",
  "Exclusivity Notes",
  ...caseStudyColumns(1),
  ...caseStudyColumns(2),
  ...caseStudyColumns(3),
  "Created At",
] as const;

export type ExportRow = Record<(typeof EXPORT_COLUMNS)[number], string>;

/**
 * CSV/formula injection defense. Excel, Google Sheets, and LibreOffice all
 * treat a cell whose *rendered* value starts with `=`, `+`, `-`, `@`, tab
 * (0x09) or CR (0x0D) as a formula to evaluate when the file is opened —
 * this is a well-known "CSV injection" attack (e.g.
 * `=HYPERLINK("http://evil.com","click")`). Every free-text field in this
 * schema is candidate-controlled, so every exported field is run through
 * this before being written to either CSV or XLSX (XLSX cells are just as
 * susceptible once opened in Excel).
 *
 * Defense: if the value starts with one of the dangerous characters after
 * trimming, prefix it with a single quote character. A leading `'` in
 * Excel/Sheets forces the cell to be treated as literal text, neutralizing
 * the formula while keeping the value human-readable.
 */
export function neutralizeSpreadsheetFormula(value: string): string {
  if (value.length === 0) return value;
  const dangerousLeadChars = ["=", "+", "-", "@", "\t", "\r"];
  if (dangerousLeadChars.includes(value[0])) {
    return `'${value}`;
  }
  return value;
}

function safe(value: string | null | undefined): string {
  return neutralizeSpreadsheetFormula((value ?? "").toString());
}

function dateOnly(value: Date | null | undefined): string {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Export row shape queried straight off Prisma (kept intentionally close to
// the schema, distinct from the dashboard's shaped list-row type in
// src/lib/admin-consultant-shape.ts — export needs different nesting for
// flattening into fixed columns).
// ---------------------------------------------------------------------------
export const EXPORT_SELECT = {
  consultantCode: true,
  fullName: true,
  email: true,
  mobile: true,
  linkedinUrl: true,
  city: true,
  state: true,
  country: true,
  openToRemote: true,
  travelWillingness: true,
  status: true,
  level: true,
  totalYearsExp: true,
  operatingYearsExp: true,
  advisoryYearsExp: true,
  maxTeamManaged: true,
  maxPnlBand: true,
  clientRevenueBands: true,
  dateInvited: true,
  dateApplied: true,
  dateApproved: true,
  cvFileName: true,
  deckFileName: true,
  consentFlag: true,
  reasonForJoining: true,
  deliveryStyle: true,
  createdAt: true,
  invitedBy: { select: { consultantCode: true, fullName: true } },
  capabilities: {
    select: {
      tag: { select: { name: true, pillar: { select: { name: true } } } },
    },
  },
  industries: { select: { industry: { select: { name: true } } } },
  caseStudies: {
    select: {
      title: true,
      clientSizeBand: true,
      role: true,
      situationText: true,
      interventionText: true,
      outcomeText: true,
      durationMonths: true,
      referenceable: true,
      clientIndustry: { select: { name: true } },
      pillars: { select: { pillar: { select: { name: true } } } },
    },
    orderBy: { createdAt: "asc" },
  },
  engagementProfile: {
    select: {
      engagementType: true,
      availabilityDaysWeek: true,
      noticePeriodDays: true,
      rateBand: true,
      currentlyEngaged: true,
      exclusivityNotes: true,
    },
  },
} satisfies Prisma.ConsultantSelect;

export type ExportConsultantRow = Prisma.ConsultantGetPayload<{ select: typeof EXPORT_SELECT }>;

export function consultantToExportRow(c: ExportConsultantRow): ExportRow {
  const uniquePillars = Array.from(new Set(c.capabilities.map((cap) => cap.tag.pillar.name)));
  const capabilityNames = c.capabilities.map((cap) => cap.tag.name);
  const industryNames = c.industries.map((ci) => ci.industry.name);

  const row: Record<string, string> = {
    "Consultant Code": safe(c.consultantCode),
    "Full Name": safe(c.fullName),
    Email: safe(c.email),
    Mobile: safe(c.mobile),
    "LinkedIn URL": safe(c.linkedinUrl),
    City: safe(c.city),
    State: safe(c.state),
    Country: safe(c.country),
    "Open to Remote": c.openToRemote === null ? "" : c.openToRemote ? "Yes" : "No",
    "Travel Willingness": c.travelWillingness ? TRAVEL_WILLINGNESS_LABELS[c.travelWillingness] : "",
    Status: CONSULTANT_STATUS_LABELS[c.status],
    Level: c.level ? LEVEL_LABELS[c.level] : "",
    "Total Years Exp": c.totalYearsExp === null ? "" : String(c.totalYearsExp),
    "Operating Years Exp": c.operatingYearsExp === null ? "" : String(c.operatingYearsExp),
    "Advisory Years Exp": c.advisoryYearsExp === null ? "" : String(c.advisoryYearsExp),
    "Max Team Managed": c.maxTeamManaged === null ? "" : String(c.maxTeamManaged),
    "Max P&L Band": c.maxPnlBand ? PNL_BAND_LABELS[c.maxPnlBand] : "",
    "Client Revenue Bands": safe(c.clientRevenueBands.map((b) => CLIENT_REVENUE_BAND_LABELS[b]).join("; ")),
    "Delivery Pillars": safe(uniquePillars.join("; ")),
    Capabilities: safe(capabilityNames.join("; ")),
    Industries: safe(industryNames.join("; ")),
    "Invited By": c.invitedBy ? safe(`${c.invitedBy.fullName} (${c.invitedBy.consultantCode})`) : "Direct/GOP-sourced",
    "Date Invited": dateOnly(c.dateInvited),
    "Date Applied": dateOnly(c.dateApplied),
    "Date Approved": dateOnly(c.dateApproved),
    "CV File Name": safe(c.cvFileName),
    "Deck File Name": safe(c.deckFileName),
    Consent: c.consentFlag ? "Yes" : "No",
    "Reason For Joining": safe(c.reasonForJoining),
    "Delivery Style": safe(c.deliveryStyle),
    "Engagement Type": c.engagementProfile?.engagementType
      ? ENGAGEMENT_TYPE_LABELS[c.engagementProfile.engagementType]
      : "",
    "Availability (days/week)":
      c.engagementProfile?.availabilityDaysWeek === null ||
      c.engagementProfile?.availabilityDaysWeek === undefined
        ? ""
        : String(c.engagementProfile.availabilityDaysWeek),
    "Notice Period (days)":
      c.engagementProfile?.noticePeriodDays === null || c.engagementProfile?.noticePeriodDays === undefined
        ? ""
        : String(c.engagementProfile.noticePeriodDays),
    "Rate Band": safe(c.engagementProfile?.rateBand),
    "Currently Engaged":
      c.engagementProfile?.currentlyEngaged === null || c.engagementProfile?.currentlyEngaged === undefined
        ? ""
        : c.engagementProfile.currentlyEngaged
          ? "Yes"
          : "No",
    "Exclusivity Notes": safe(c.engagementProfile?.exclusivityNotes),
    "Created At": c.createdAt.toISOString(),
  };

  for (let i = 0; i < CASE_STUDY_BLOCK_COUNT; i++) {
    const n = i + 1;
    const cs = c.caseStudies[i];
    const cols = caseStudyColumns(n);
    if (!cs) {
      for (const col of cols) row[col] = "";
      continue;
    }
    row[cols[0]] = safe(cs.title);
    row[cols[1]] = safe(cs.clientIndustry.name);
    row[cols[2]] = CLIENT_REVENUE_BAND_LABELS[cs.clientSizeBand];
    row[cols[3]] = CASE_STUDY_ROLE_LABELS[cs.role];
    row[cols[4]] = safe(cs.situationText);
    row[cols[5]] = safe(cs.interventionText);
    row[cols[6]] = safe(cs.outcomeText);
    row[cols[7]] = String(cs.durationMonths);
    row[cols[8]] = REFERENCEABLE_LABELS[cs.referenceable];
    row[cols[9]] = safe(cs.pillars.map((p) => p.pillar.name).join("; "));
  }

  return row as ExportRow;
}

/** RFC 4180 CSV field escaping (applied AFTER formula neutralization). */
function csvEscapeField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function rowsToCsv(rows: ExportRow[]): string {
  const header = EXPORT_COLUMNS.map(csvEscapeField).join(",");
  const lines = rows.map((row) => EXPORT_COLUMNS.map((col) => csvEscapeField(row[col])).join(","));
  // Leading UTF-8 BOM so Excel opens the file with correct encoding
  // detection for non-ASCII names/notes.
  return "﻿" + [header, ...lines].join("\r\n") + "\r\n";
}

export function exportFilenameBase(): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  return `gop-consultants-${ts}`;
}
