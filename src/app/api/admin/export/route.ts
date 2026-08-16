import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { buildApplicationWhere, parseAdminFilterQuery } from "@/lib/admin-filters";
import {
  EXPORT_COLUMNS,
  applicationToExportRow,
  exportFilenameBase,
  rowsToCsv,
} from "@/lib/admin-export";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// GET /api/admin/export
//
// Accepts the EXACT same filter query params as GET /api/admin/applications
// (see src/lib/admin-filters.ts) plus:
//   format   "csv" | "xlsx"   (required)
//
// Exports the full filtered set (no pagination) so "export the current
// filtered view" is truthful — the same `where` builder is shared with the
// list endpoint.
//
// Every free-text field is passed through CSV/formula-injection
// neutralization (see src/lib/admin-export.ts) before being written, since
// every field here is candidate-submitted and therefore attacker-controlled.
//
// Response 200: file stream, Content-Type + Content-Disposition set for
//   download; CSV is UTF-8 with BOM, XLSX is a real .xlsx workbook.
// Response 400: { error } — invalid filters or missing/invalid `format`.
// Response 401: { error } — no/invalid admin session.
// ---------------------------------------------------------------------------

const formatSchema = z.enum(["csv", "xlsx"]);

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const formatParsed = formatSchema.safeParse(req.nextUrl.searchParams.get("format"));
  if (!formatParsed.success) {
    return NextResponse.json(
      { error: "Query param 'format' must be 'csv' or 'xlsx'." },
      { status: 400 },
    );
  }
  const format = formatParsed.data;

  let query;
  try {
    query = parseAdminFilterQuery(req.nextUrl.searchParams);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid filter parameters.", details: err.issues.map((i) => i.message) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid filter parameters." }, { status: 400 });
  }

  const where = buildApplicationWhere(query);

  let applications;
  try {
    applications = await prisma.application.findMany({
      where,
      orderBy: { createdAt: "desc" },
      // No `take` — export is intentionally the full filtered set.
    });
  } catch (err) {
    console.error("[admin:export:GET] query failed", {
      message: err instanceof Error ? err.message : "unknown error",
    });
    return NextResponse.json({ error: "Failed to build export." }, { status: 500 });
  }

  const rows = applications.map(applicationToExportRow);
  const filenameBase = exportFilenameBase();

  if (format === "csv") {
    const csv = rowsToCsv(rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // format === "xlsx"
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "GOP Consultant Recruitment Portal";
  const sheet = workbook.addWorksheet("Applications");

  sheet.columns = EXPORT_COLUMNS.map((col) => ({
    header: col,
    key: col,
    width: Math.min(Math.max(col.length + 4, 18), 50),
  }));
  sheet.getRow(1).font = { bold: true };

  // Values are already formula-neutralized strings (leading `'` prefix on
  // anything dangerous). Adding them as plain strings via `addRow` stores
  // them as inline string cell values, never as ExcelJS formula objects
  // (which would require an explicit `{ formula: ... }` value we never
  // construct) — so a leading `=`/`+`/`-`/`@` in the source data cannot be
  // reinterpreted as a spreadsheet formula.
  for (const row of rows) {
    sheet.addRow(row);
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filenameBase}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
