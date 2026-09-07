import { NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { prisma } from "@/lib/prisma";
import { CV_UPLOADS_ROOT, DECK_UPLOADS_ROOT } from "@/lib/uploads";

// ---------------------------------------------------------------------------
// Shared streaming logic for GET /api/admin/consultants/[id]/cv and
// GET /api/admin/consultants/[id]/deck — identical security posture, only
// the column names and uploads subroot differ.
//
// Security notes (apply to both routes):
//   - Callers MUST call requireAdmin() themselves before invoking this —
//     this module does not check auth, by design, so it's impossible to
//     add a new caller of this helper that forgets the check without it
//     being obvious at the call site (auth is not silently "handled
//     elsewhere").
//   - The stored (relative) path is resolved against the uploads root and
//     the resolved absolute path is verified to still be inside that root
//     before any fs call touches it — defends against a stored path that
//     has been tampered with (e.g. a future bug elsewhere) containing `../`
//     traversal segments. The DB value is never trusted blindly, even
//     though today it is only ever written by our own upload code.
//   - The ORIGINAL, attacker-controlled client filename is NEVER used to
//     build a filesystem path — only the stored path is. It IS used for the
//     download filename shown to the admin, so it is sanitized and RFC 5987
//     percent-encoded into `filename*` (with a plain-ASCII fallback
//     `filename=` for older clients) to prevent HTTP header injection /
//     malformed downloads.
// ---------------------------------------------------------------------------

export type FileKind = "cv" | "deck";

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

function asciiFallbackFilename(original: string): string {
  const base = path.basename(original.replace(/\\/g, "/"));
  const stripped = base
    .replace(/[\x00-\x1f\x7f]/g, "")
    .replace(/["\\]/g, "_")
    .trim();
  return stripped.length > 0 ? stripped : "file";
}

function buildContentDisposition(originalFilename: string): string {
  const fallback = asciiFallbackFilename(originalFilename);
  const encoded = encodeURIComponent(originalFilename.replace(/[\x00-\x1f\x7f]/g, ""))
    .replace(/['()]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase())
    .replace(/\*/g, "%2A");
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

/** Streams the CV or deck file for the given consultant id. Caller must
 * have already verified an admin session. Returns a 404 NextResponse for
 * any "not found" case (consultant missing, no file on record, file
 * missing on disk) — never a 500 for a missing file. */
export async function streamConsultantFile(
  id: string,
  kind: FileKind,
): Promise<NextResponse> {
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Consultant not found." }, { status: 404 });
  }

  const uploadsRoot = kind === "cv" ? CV_UPLOADS_ROOT : DECK_UPLOADS_ROOT;

  let consultant;
  try {
    consultant = await prisma.consultant.findUnique({
      where: { id },
      select: {
        id: true,
        cvFileName: true,
        cvStoredPath: true,
        cvMimeType: true,
        deckFileName: true,
        deckStoredPath: true,
        deckMimeType: true,
      },
    });
  } catch (err) {
    console.error(`[admin:${kind}:GET] lookup failed`, {
      message: err instanceof Error ? err.message : "unknown error",
    });
    return NextResponse.json({ error: "Failed to load file." }, { status: 500 });
  }

  const fileName = consultant ? (kind === "cv" ? consultant.cvFileName : consultant.deckFileName) : null;
  const storedPath = consultant
    ? kind === "cv"
      ? consultant.cvStoredPath
      : consultant.deckStoredPath
    : null;
  const mimeType = consultant ? (kind === "cv" ? consultant.cvMimeType : consultant.deckMimeType) : null;

  if (!consultant || !storedPath || !fileName) {
    return NextResponse.json(
      { error: kind === "cv" ? "CV not found." : "Deck not found." },
      { status: 404 },
    );
  }

  const resolvedRoot = path.resolve(uploadsRoot);
  const resolvedPath = path.resolve(uploadsRoot, storedPath);
  const isInsideRoot =
    resolvedPath === resolvedRoot || resolvedPath.startsWith(resolvedRoot + path.sep);
  if (!isInsideRoot) {
    console.error(`[admin:${kind}:GET] stored path escaped uploads root`, { consultantId: id });
    return NextResponse.json(
      { error: kind === "cv" ? "CV not found." : "Deck not found." },
      { status: 404 },
    );
  }

  let fileStat;
  try {
    fileStat = await stat(resolvedPath);
  } catch {
    return NextResponse.json(
      { error: `${kind === "cv" ? "CV" : "Deck"} file is missing on disk.` },
      { status: 404 },
    );
  }
  if (!fileStat.isFile()) {
    return NextResponse.json(
      { error: kind === "cv" ? "CV not found." : "Deck not found." },
      { status: 404 },
    );
  }

  const ext = path.extname(fileName).toLowerCase();
  const contentType =
    mimeType && CONTENT_TYPE_BY_EXT[ext] === mimeType
      ? mimeType
      : CONTENT_TYPE_BY_EXT[ext] ?? "application/octet-stream";

  const nodeStream = createReadStream(resolvedPath);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": buildContentDisposition(fileName),
      "Content-Length": String(fileStat.size),
      // CV/deck contents are candidate PII; never let an intermediary or
      // browser cache them.
      "Cache-Control": "no-store",
    },
  });
}
