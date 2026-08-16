import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// GET /api/admin/applications/[id]/cv
//
// Streams the CV file for a given application. Requires a valid admin
// session (checked first, before any DB lookup or filesystem access).
//
// Security notes:
//   - `cvStoredPath` is resolved against UPLOADS_ROOT and the resolved
//     absolute path is verified to still be inside UPLOADS_ROOT before any
//     fs call touches it. This defends against a stored path that has been
//     tampered with (e.g. via a future bug elsewhere) containing `../`
//     traversal segments — we do not trust the DB value blindly, even
//     though today it's only ever written by our own upload code.
//   - `cvFileName` is the ORIGINAL, attacker-controlled client filename
//     (there is a real DB row with cvFileName = "../../etc/passwd.pdf").
//     It is NEVER used to build a filesystem path — only cvStoredPath is.
//     It IS used for the download filename shown to the admin, so it is
//     sanitized and RFC 5987 percent-encoded into `filename*` (with a
//     plain-ASCII fallback `filename=` for older clients) to prevent
//     HTTP header injection / malformed downloads.
//
// Responses:
//   200  CV file bytes, Content-Type per extension, safe Content-Disposition.
//   401  { error } — no/invalid admin session.
//   404  { error } — application not found, no CV on record, or file missing
//                     on disk (never a 500 for a missing file).
// ---------------------------------------------------------------------------

const UPLOADS_ROOT = path.resolve(process.env.UPLOADS_DIR ?? "/app/uploads");

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/** Strips control characters and anything not safe in a quoted-string /
 * ASCII filename fallback. Directory separators are stripped too, even
 * though this value is never used to touch the filesystem — belt and
 * braces against any future misuse. */
function asciiFallbackFilename(original: string): string {
  const base = path.basename(original.replace(/\\/g, "/"));
  const stripped = base
    .replace(/[\x00-\x1f\x7f]/g, "")
    .replace(/["\\]/g, "_")
    .trim();
  return stripped.length > 0 ? stripped : "cv";
}

/** Builds a safe Content-Disposition header value using RFC 5987/6266
 * `filename*` (UTF-8 percent-encoded) plus a sanitized ASCII `filename`
 * fallback — never interpolates the raw client-supplied name. */
function buildContentDisposition(originalFilename: string): string {
  const fallback = asciiFallbackFilename(originalFilename);
  // Fallback must be a valid quoted-string token: no quotes/backslashes
  // (already stripped above) and no control characters.
  const encoded = encodeURIComponent(originalFilename.replace(/[\x00-\x1f\x7f]/g, ""))
    // encodeURIComponent leaves a few chars RFC 5987 also wants encoded.
    .replace(/['()]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase())
    .replace(/\*/g, "%2A");
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  let application;
  try {
    application = await prisma.application.findUnique({
      where: { id },
      select: { id: true, cvFileName: true, cvStoredPath: true, cvMimeType: true },
    });
  } catch (err) {
    console.error("[admin:cv:GET] lookup failed", {
      message: err instanceof Error ? err.message : "unknown error",
    });
    return NextResponse.json({ error: "Failed to load CV." }, { status: 500 });
  }

  if (!application || !application.cvStoredPath || !application.cvFileName) {
    return NextResponse.json({ error: "CV not found." }, { status: 404 });
  }

  // Resolve stored (relative) path against the uploads root and verify
  // containment BEFORE touching the filesystem. This is the single
  // security-critical check in this route.
  const resolvedPath = path.resolve(UPLOADS_ROOT, application.cvStoredPath);
  const resolvedRoot = path.resolve(UPLOADS_ROOT);
  const isInsideRoot =
    resolvedPath === resolvedRoot || resolvedPath.startsWith(resolvedRoot + path.sep);
  if (!isInsideRoot) {
    console.error("[admin:cv:GET] stored path escaped uploads root", {
      applicationId: application.id,
    });
    return NextResponse.json({ error: "CV not found." }, { status: 404 });
  }

  let fileStat;
  try {
    fileStat = await stat(resolvedPath);
  } catch {
    // File missing on disk (deleted, volume issue, etc). Not a 500 — the
    // request itself was valid, the resource just isn't there.
    return NextResponse.json({ error: "CV file is missing on disk." }, { status: 404 });
  }
  if (!fileStat.isFile()) {
    return NextResponse.json({ error: "CV not found." }, { status: 404 });
  }

  const ext = path.extname(application.cvFileName).toLowerCase();
  const contentType =
    application.cvMimeType && CONTENT_TYPE_BY_EXT[ext] === application.cvMimeType
      ? application.cvMimeType
      : CONTENT_TYPE_BY_EXT[ext] ?? "application/octet-stream";

  const nodeStream = createReadStream(resolvedPath);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": buildContentDisposition(application.cvFileName),
      "Content-Length": String(fileStat.size),
      // CV contents are PII; never let an intermediary/browser cache them.
      "Cache-Control": "no-store",
    },
  });
}
