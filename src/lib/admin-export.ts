import type { Application } from "@prisma/client";
import {
  LEVEL_LABELS,
  DELIVERY_FUNCTION_LABELS,
  SKILL_LABELS,
  INDUSTRY_LABELS,
} from "@/lib/constants";

// ---------------------------------------------------------------------------
// Shared row-shaping for CSV/XLSX export. Both formats must show identical
// human-readable data, so the mapping from a raw Prisma row -> display
// fields lives in exactly one place.
// ---------------------------------------------------------------------------

export const EXPORT_COLUMNS = [
  "Application ID",
  "Full Name",
  "Email",
  "Phone",
  "Level",
  "Delivery Functions",
  "Skills",
  "Industries",
  "City",
  "State",
  "Country",
  "Remote",
  "Additional Notes",
  "What is GOP?",
  "Why join GOP?",
  "Key Skills",
  "Relevant Experience",
  "How will you deliver?",
  "CV File Name",
  "Submitted At",
] as const;

export type ExportRow = Record<(typeof EXPORT_COLUMNS)[number], string>;

/**
 * CSV/formula injection defense. Excel, Google Sheets, and LibreOffice all
 * treat a cell whose *rendered* value starts with `=`, `+`, `-`, `@`, tab
 * (0x09) or CR (0x0D) as a formula to evaluate when the file is opened —
 * this is a well-known "CSV injection" attack (e.g.
 * `=HYPERLINK("http://evil.com","click")`). Every free-text field in this
 * schema is attacker-controlled (candidate-submitted), so every exported
 * field is run through this before being written to either CSV or XLSX
 * (XLSX cells are just as susceptible once opened in Excel).
 *
 * Defense: if the value starts with one of the dangerous characters after
 * trimming, prefix it with a single quote character. A leading `'` in
 * Excel/Sheets forces the cell to be treated as literal text, neutralizing
 * the formula while keeping the value human-readable (the admin sees
 * `'=HYPERLINK(...)` instead of a clickable link or executed formula).
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

function joinLabels<T extends string>(
  values: T[],
  labels: Record<T, string>,
): string {
  return safe(values.map((v) => labels[v] ?? String(v)).join("; "));
}

export function applicationToExportRow(app: Application): ExportRow {
  return {
    "Application ID": safe(app.id),
    "Full Name": safe(app.fullName),
    Email: safe(app.email),
    Phone: safe(app.phone),
    Level: safe(LEVEL_LABELS[app.level] ?? app.level),
    "Delivery Functions": joinLabels(app.functions, DELIVERY_FUNCTION_LABELS),
    Skills: joinLabels(app.skills, SKILL_LABELS),
    Industries: joinLabels(app.industries, INDUSTRY_LABELS),
    City: safe(app.city),
    State: safe(app.state),
    Country: safe(app.country),
    Remote: app.remote ? "Yes" : "No",
    "Additional Notes": safe(app.additionalNotes),
    "What is GOP?": safe(app.qWhatIsGop),
    "Why join GOP?": safe(app.qWhyJoinGop),
    "Key Skills": safe(app.qKeySkills),
    "Relevant Experience": safe(app.qRelevantExperience),
    "How will you deliver?": safe(app.qHowDeliver),
    "CV File Name": safe(app.cvFileName),
    "Submitted At": app.createdAt.toISOString(),
  };
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
  const lines = rows.map((row) =>
    EXPORT_COLUMNS.map((col) => csvEscapeField(row[col])).join(","),
  );
  // Leading UTF-8 BOM so Excel opens the file with correct encoding
  // detection for non-ASCII names/notes.
  return "﻿" + [header, ...lines].join("\r\n") + "\r\n";
}

export function exportFilenameBase(): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  return `gop-applications-${ts}`;
}
