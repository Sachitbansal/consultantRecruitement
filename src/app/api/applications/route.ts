import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  LEVEL_OPTIONS,
  DELIVERY_FUNCTION_OPTIONS,
  SKILL_OPTIONS,
  INDUSTRY_OPTIONS,
} from "@/lib/constants";

// Node runtime required — this route touches the filesystem (fs) to write
// CVs to disk. Do NOT set `export const runtime = "edge"`.
export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Uploads root
// ---------------------------------------------------------------------------
// Configurable via env because the Docker volume is mounted at /app/uploads
// in production, but a local `npm run dev` checkout has no such path.
// Falls back to a repo-local ./uploads directory for local development.
const UPLOADS_ROOT = path.resolve(
  process.env.UPLOADS_DIR ?? "/app/uploads",
);
const CV_UPLOADS_ROOT = path.join(UPLOADS_ROOT, "cvs");

// ---------------------------------------------------------------------------
// CV constraints
// ---------------------------------------------------------------------------
const MAX_CV_SIZE_BYTES = 10 * 1024 * 1024; // 10MB, matches client cap
const ACCEPTED_CV_EXTENSIONS = [".pdf", ".doc", ".docx"];
const ACCEPTED_CV_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
]);

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------
// Mirrors the Prisma enums exactly (validated against the same option
// arrays constants.ts derives from the schema) — reject anything not a
// real enum member rather than letting Prisma throw an opaque 500.
const levelEnum = z.enum(LEVEL_OPTIONS as [string, ...string[]]);
const functionEnum = z.enum(DELIVERY_FUNCTION_OPTIONS as [string, ...string[]]);
const skillEnum = z.enum(SKILL_OPTIONS as [string, ...string[]]);
const industryEnum = z.enum(INDUSTRY_OPTIONS as [string, ...string[]]);

const trimmed = (max: number) =>
  z
    .string()
    .trim()
    .min(1, "This field is required.")
    .max(max, `Must be ${max} characters or fewer.`);

/** Title-case normalization for free-text location fields (city/state) so
 * the admin dashboard's filter-by-state doesn't silently fragment on
 * casing variants like "maharashtra" vs "Maharashtra" vs "MAHARASHTRA". */
function toTitleCase(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) =>
      word.length === 0
        ? word
        : word
            .split("-")
            .map((part) =>
              part.length === 0 ? part : part[0].toUpperCase() + part.slice(1),
            )
            .join("-"),
    )
    .join(" ");
}

const applicationSchema = z.object({
  fullName: trimmed(200),
  email: z.string().trim().min(1, "Enter your email address.").email("Enter a valid email address."),
  // Sanity check only — deliberately permissive of international formats.
  phone: z
    .string()
    .trim()
    .min(1, "Enter your phone number.")
    .max(30, "Phone number is too long.")
    .regex(/^[0-9+()\-.\s]{6,30}$/, "Enter a valid phone number."),
  level: levelEnum,
  functions: z.array(functionEnum).min(1, "Select at least one delivery function."),
  skills: z.array(skillEnum).min(1, "Select at least one skill."),
  city: trimmed(120).transform(toTitleCase),
  state: trimmed(120).transform(toTitleCase),
  country: trimmed(120).transform(toTitleCase),
  remote: z.union([z.literal("true"), z.literal("false")]).transform((v) => v === "true"),
  industries: z.array(industryEnum).min(1, "Select at least one industry."),
  additionalNotes: z
    .string()
    .trim()
    .max(5000, "Must be 5000 characters or fewer.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  // Per-question caps. These are the authoritative limits — the textarea
  // maxLength in ApplicationForm.tsx mirrors them but is trivially bypassed
  // with a direct POST, so both sides must agree.
  qWhatIsGop: trimmed(200),
  qWhyJoinGop: trimmed(200),
  qKeySkills: trimmed(300),
  qRelevantExperience: trimmed(300),
  qHowDeliver: trimmed(200),
});

type FieldErrors = Record<string, string>;

// ---------------------------------------------------------------------------
// Filename sanitization
// ---------------------------------------------------------------------------
// Defends against path traversal (`../../etc/passwd`), null bytes, absolute
// paths, and overly long / exotic filenames. The sanitized name is what
// gets written to disk; the ORIGINAL client-supplied name (still validated
// for extension) is preserved separately in cvFileName for display.
function sanitizeFilename(original: string): { safeName: string; ext: string } {
  // Strip any directory components (handles both / and \ separators, and
  // guards against a filename that is itself a full path).
  const baseName = path.basename(original.replace(/\\/g, "/"));

  const ext = path.extname(baseName).toLowerCase();
  const stem = baseName.slice(0, baseName.length - ext.length);

  // Whitelist: letters, numbers, spaces, dot, dash, underscore. Strip
  // everything else (including null bytes, unicode path tricks, etc).
  const safeStem = stem
    .replace(/[^a-zA-Z0-9 ._-]/g, "")
    .trim()
    .slice(0, 100);

  const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, "").slice(0, 10);

  const finalStem = safeStem.length > 0 ? safeStem : "cv";
  return { safeName: `${finalStem}${safeExt}`, ext: safeExt };
}

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Request must be multipart/form-data." },
      { status: 400 },
    );
  }

  const getAll = (key: string) => form.getAll(key).map((v) => String(v));

  const raw = {
    fullName: String(form.get("fullName") ?? ""),
    email: String(form.get("email") ?? ""),
    phone: String(form.get("phone") ?? ""),
    level: String(form.get("level") ?? ""),
    functions: getAll("functions"),
    skills: getAll("skills"),
    city: String(form.get("city") ?? ""),
    state: String(form.get("state") ?? ""),
    country: String(form.get("country") ?? ""),
    remote: String(form.get("remote") ?? "false"),
    industries: getAll("industries"),
    additionalNotes: String(form.get("additionalNotes") ?? ""),
    qWhatIsGop: String(form.get("qWhatIsGop") ?? ""),
    qWhyJoinGop: String(form.get("qWhyJoinGop") ?? ""),
    qKeySkills: String(form.get("qKeySkills") ?? ""),
    qRelevantExperience: String(form.get("qRelevantExperience") ?? ""),
    qHowDeliver: String(form.get("qHowDeliver") ?? ""),
  };

  const parsed = applicationSchema.safeParse(raw);

  const fieldErrors: FieldErrors = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] ? String(issue.path[0]) : "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
  }

  // --- CV file validation -------------------------------------------------
  const cvEntry = form.get("cv");
  let cvFile: File | null = null;
  if (!cvEntry || !(cvEntry instanceof File) || cvEntry.size === 0) {
    fieldErrors.cv = "Upload your CV.";
  } else {
    cvFile = cvEntry;

    const originalName = cvFile.name || "cv";
    const ext = path.extname(originalName).toLowerCase();

    if (!ACCEPTED_CV_EXTENSIONS.includes(ext)) {
      fieldErrors.cv = "Upload a .pdf, .doc, or .docx file.";
    } else if (
      cvFile.type &&
      cvFile.type.length > 0 &&
      !ACCEPTED_CV_MIME_TYPES.has(cvFile.type)
    ) {
      // Reject if the browser/client supplied a MIME type and it doesn't
      // match an allowed type, even if the extension looked fine — blocks
      // e.g. a renamed .exe with a spoofed ".pdf" extension but a
      // mismatched declared MIME type. (Some clients send an empty type;
      // we don't fail purely on a missing MIME type since the extension
      // check above already gates on the allowlist.)
      fieldErrors.cv = "Upload a .pdf, .doc, or .docx file.";
    } else if (cvFile.size > MAX_CV_SIZE_BYTES) {
      fieldErrors.cv = "CV must be 10MB or smaller.";
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    // `error`/`message` are duplicated deliberately: `error` is the
    // canonical field per this project's error-shape convention, `message`
    // is what ApplicationForm.tsx's generic error handler reads today.
    return NextResponse.json(
      {
        error: "Validation failed.",
        message: "Please fix the highlighted fields and try again.",
        fields: fieldErrors,
      },
      { status: 400 },
    );
  }

  // parsed.success is guaranteed true here since fieldErrors is empty.
  const data = parsed.data as z.infer<typeof applicationSchema>;
  const file = cvFile as File;

  // --- Write order ---------------------------------------------------------
  // 1. Create the Application row first (mints the cuid `id` the upload
  //    path is keyed on) with CV columns left null.
  // 2. Write the file to disk under uploads/cvs/{id}/{sanitizedFilename}.
  // 3. Update the row with CV metadata.
  //
  // Failure handling: if step 2 or 3 fails, we delete the just-created row
  // (rather than leaving a CV-less application behind for the admin to
  // silently miss) and return a 500. This keeps "row exists" == "submission
  // fully succeeded, including CV" as an invariant, which is simpler for
  // admin-side reasoning than a nullable-CV row meaning "still processing".
  let applicationId: string | null = null;
  try {
    const created = await prisma.application.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        level: data.level as never,
        functions: data.functions as never,
        skills: data.skills as never,
        city: data.city,
        state: data.state,
        country: data.country,
        remote: data.remote,
        industries: data.industries as never,
        additionalNotes: data.additionalNotes ?? null,
        qWhatIsGop: data.qWhatIsGop,
        qWhyJoinGop: data.qWhyJoinGop,
        qKeySkills: data.qKeySkills,
        qRelevantExperience: data.qRelevantExperience,
        qHowDeliver: data.qHowDeliver,
      },
      select: { id: true },
    });
    applicationId = created.id;

    const { safeName } = sanitizeFilename(file.name || "cv");
    const appDir = path.join(CV_UPLOADS_ROOT, applicationId);

    // Defense in depth: after building the final path, verify it still
    // resolves inside CV_UPLOADS_ROOT before writing anything. applicationId
    // is a Prisma-generated cuid (safe by construction) and safeName is
    // whitelist-sanitized, but this check protects against any future
    // regression in either of those guarantees.
    const resolvedDir = path.resolve(appDir);
    if (
      resolvedDir !== path.resolve(CV_UPLOADS_ROOT) &&
      !resolvedDir.startsWith(path.resolve(CV_UPLOADS_ROOT) + path.sep)
    ) {
      throw new Error("Resolved upload path escaped the uploads root.");
    }
    const finalPath = path.join(resolvedDir, safeName);
    const resolvedFinal = path.resolve(finalPath);
    if (!resolvedFinal.startsWith(resolvedDir + path.sep) && resolvedFinal !== resolvedDir) {
      throw new Error("Resolved file path escaped the application upload directory.");
    }

    await mkdir(resolvedDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(resolvedFinal, buffer);

    // Stored path is relative to the uploads root, matching the schema
    // comment's uploads/cvs/{applicationId}/{filename} convention.
    const storedRelativePath = path.join("cvs", applicationId, safeName);

    await prisma.application.update({
      where: { id: applicationId },
      data: {
        cvFileName: file.name || safeName,
        cvStoredPath: storedRelativePath,
        cvMimeType: file.type || null,
        cvSizeBytes: buffer.byteLength,
      },
    });

    return NextResponse.json({ id: applicationId }, { status: 201 });
  } catch (err) {
    // Never log full application bodies or CV contents (candidate PII).
    // Log only enough to diagnose without leaking stack traces to the client.
    console.error("[applications:POST] submission failed", {
      applicationId,
      message: err instanceof Error ? err.message : "unknown error",
    });

    if (applicationId) {
      try {
        await prisma.application.delete({ where: { id: applicationId } });
      } catch (cleanupErr) {
        console.error("[applications:POST] cleanup delete failed", {
          applicationId,
          message: cleanupErr instanceof Error ? cleanupErr.message : "unknown error",
        });
      }
      try {
        await rm(path.join(CV_UPLOADS_ROOT, applicationId), {
          recursive: true,
          force: true,
        });
      } catch {
        // best-effort cleanup only
      }
    }

    return NextResponse.json(
      {
        error: "Something went wrong while submitting your application. Please try again.",
        message: "Something went wrong while submitting your application. Please try again.",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}

export async function PATCH() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
