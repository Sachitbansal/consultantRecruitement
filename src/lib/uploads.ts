import path from "node:path";

// ---------------------------------------------------------------------------
// Shared filesystem-upload helpers for CV/deck storage.
//
// Reused by:
//   - src/app/api/applications/route.ts        (writes cv/ and decks/)
//   - src/app/api/admin/consultants/[id]/cv/route.ts    (reads cv/)
//   - src/app/api/admin/consultants/[id]/deck/route.ts  (reads decks/)
//
// Configurable via UPLOADS_DIR because the Docker volume is mounted at
// /app/uploads in production, but a local `npm run dev` checkout has no
// such path. Falls back to a repo-local ./uploads directory for local dev.
// ---------------------------------------------------------------------------
export const UPLOADS_ROOT = path.resolve(process.env.UPLOADS_DIR ?? "/app/uploads");
export const CV_UPLOADS_ROOT = path.join(UPLOADS_ROOT, "cvs");
export const DECK_UPLOADS_ROOT = path.join(UPLOADS_ROOT, "decks");

/**
 * Defends against path traversal (`../../etc/passwd`), null bytes, absolute
 * paths, and overly long / exotic filenames. The sanitized name is what
 * gets written to disk; the ORIGINAL client-supplied name is preserved
 * separately (e.g. cvFileName) for display purposes only — never used to
 * build a filesystem path.
 */
export function sanitizeFilename(original: string): { safeName: string; ext: string } {
  const baseName = path.basename(original.replace(/\\/g, "/"));

  const ext = path.extname(baseName).toLowerCase();
  const stem = baseName.slice(0, baseName.length - ext.length);

  const safeStem = stem
    .replace(/[^a-zA-Z0-9 ._-]/g, "")
    .trim()
    .slice(0, 100);

  const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, "").slice(0, 10);

  const finalStem = safeStem.length > 0 ? safeStem : "file";
  return { safeName: `${finalStem}${safeExt}`, ext: safeExt };
}

/**
 * Resolves `root/...segments` and verifies the resolved absolute path is
 * still contained inside `root` before returning it. Throws if the
 * resolved path escapes — callers must not touch the filesystem with a
 * path that fails this check.
 */
export function resolveContainedPath(root: string, ...segments: string[]): string {
  const resolvedRoot = path.resolve(root);
  const target = path.resolve(root, ...segments);
  if (target !== resolvedRoot && !target.startsWith(resolvedRoot + path.sep)) {
    throw new Error("Resolved path escaped the uploads root.");
  }
  return target;
}

// ---------------------------------------------------------------------------
// Magic-byte sniffing — defense in depth beyond extension/declared-MIME
// allowlisting. A file's extension and Content-Type are both fully
// attacker-controlled (e.g. `curl -F "cv=@evil.exe;type=application/pdf;
// filename=cv.pdf"` trivially satisfies an extension+MIME-only check). This
// inspects the first bytes of the actual uploaded content against the known
// signature for the extension being claimed, so a renamed executable (which
// starts with the "MZ" DOS header) is rejected even when filename and
// Content-Type both lie convincingly.
//
// Not a full content-type sniffer (doesn't unzip .docx/.pptx to check
// [Content_Types].xml, doesn't disambiguate .doc vs .ppt — both are legacy
// OLE compound files with an identical header), but it reliably rejects any
// file whose real bytes do not match ANY plausible signature for its
// claimed extension, which is the actual attack this guards against.
// ---------------------------------------------------------------------------
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"
const OLE_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]; // legacy .doc/.ppt
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04]; // .docx/.pptx (OOXML = zip)
const ZIP_EMPTY_SIGNATURE = [0x50, 0x4b, 0x05, 0x06]; // empty zip edge case

function bufferStartsWith(buffer: Buffer, signature: number[]): boolean {
  if (buffer.length < signature.length) return false;
  return signature.every((byte, i) => buffer[i] === byte);
}

/** Returns true if `buffer`'s content plausibly matches the file format
 * implied by `ext` (lowercase, with leading dot, e.g. ".pdf"). */
export function matchesMagicBytes(buffer: Buffer, ext: string): boolean {
  switch (ext) {
    case ".pdf":
      return bufferStartsWith(buffer, PDF_SIGNATURE);
    case ".doc":
    case ".ppt":
      return bufferStartsWith(buffer, OLE_SIGNATURE);
    case ".docx":
    case ".pptx":
      return (
        bufferStartsWith(buffer, ZIP_SIGNATURE) || bufferStartsWith(buffer, ZIP_EMPTY_SIGNATURE)
      );
    default:
      return false;
  }
}
