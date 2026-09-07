import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  CV_UPLOADS_ROOT,
  DECK_UPLOADS_ROOT,
  matchesMagicBytes,
  resolveContainedPath,
  sanitizeFilename,
} from "@/lib/uploads";
import { getValidIndustryIds, getValidPillarIds, getValidSubTagIds } from "@/lib/taxonomy";
import {
  LEVEL_OPTIONS,
  TRAVEL_WILLINGNESS_OPTIONS,
  PNL_BAND_OPTIONS,
  CLIENT_REVENUE_BAND_OPTIONS,
  CASE_STUDY_ROLE_OPTIONS,
  REFERENCEABLE_OPTIONS,
  ENGAGEMENT_TYPE_OPTIONS,
  CASE_STUDY_LIMITS,
  QUALIFYING_QUESTION_LIMITS,
  ENGAGEMENT_PROFILE_LIMITS,
} from "@/lib/constants";

// Node runtime required — this route touches the filesystem to write CVs
// and decks to disk. Do NOT set `export const runtime = "edge"`.
export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// File constraints (Section H)
// ---------------------------------------------------------------------------
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB per file, both CV and deck.

const ACCEPTED_CV_EXTENSIONS = [".pdf", ".doc", ".docx"];
const ACCEPTED_CV_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const ACCEPTED_DECK_EXTENSIONS = [".pdf", ".doc", ".docx", ".ppt", ".pptx"];
const ACCEPTED_DECK_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

// ---------------------------------------------------------------------------
// Enum schemas — mirror the Prisma enums exactly via constants.ts option
// arrays, so a submitted value that isn't a real enum member is a 400, never
// a Prisma runtime error.
// ---------------------------------------------------------------------------
const levelEnum = z.enum(LEVEL_OPTIONS as [string, ...string[]]);
const travelWillingnessEnum = z.enum(TRAVEL_WILLINGNESS_OPTIONS as [string, ...string[]]);
const pnlBandEnum = z.enum(PNL_BAND_OPTIONS as [string, ...string[]]);
const clientRevenueBandEnum = z.enum(CLIENT_REVENUE_BAND_OPTIONS as [string, ...string[]]);
const caseStudyRoleEnum = z.enum(CASE_STUDY_ROLE_OPTIONS as [string, ...string[]]);
const referenceableEnum = z.enum(REFERENCEABLE_OPTIONS as [string, ...string[]]);
const engagementTypeEnum = z.enum(ENGAGEMENT_TYPE_OPTIONS as [string, ...string[]]);

const requiredTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .min(1, "This field is required.")
    .max(max, `Must be ${max} characters or fewer.`);

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer.`)
    .optional()
    .or(z.literal("").transform(() => undefined));

/** Title-case normalization for free-text location fields so the admin
 * dashboard's filter-by-state doesn't silently fragment on casing variants
 * like "maharashtra" vs "Maharashtra" vs "MAHARASHTRA". */
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
            .map((part) => (part.length === 0 ? part : part[0].toUpperCase() + part.slice(1)))
            .join("-"),
    )
    .join(" ");
}

const boolField = (label: string) =>
  z.union([z.literal("true"), z.literal("false")], {
    message: `${label} is required.`,
  }).transform((v) => v === "true");

const optionalBoolField = z
  .union([z.literal("true"), z.literal("false")])
  .optional()
  .or(z.literal("").transform(() => undefined))
  .transform((v) => (v === undefined ? undefined : v === "true"));

// IMPORTANT: `z.coerce.number()` on an EMPTY STRING coerces to `0`
// (`Number("") === 0` in JS), which is a valid, in-range number for every
// field this is used on — so a naive `z.coerce.number()` alone would let an
// entirely omitted required field (submitted as "" by the `str()` helper
// below) silently pass validation as 0 instead of producing a field error.
// The `z.preprocess` maps "" -> undefined FIRST so the missing-value case
// hits the "required" branch instead of being coerced away.
const requiredIntField = (label: string, min: number, max: number) =>
  z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : val),
    z.coerce
      .number({ message: `${label} is required.` })
      .int(`${label} must be a whole number.`)
      .min(min, `${label} must be at least ${min}.`)
      .max(max, `${label} must be ${max} or less.`),
  );

const optionalIntField = (label: string, min: number, max: number) =>
  z
    .union([z.literal(""), z.coerce.number().int().min(min).max(max)], {
      message: `${label} must be a whole number.`,
    })
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v));

const idArraySchema = z.preprocess((val) => {
  if (val === undefined || val === null) return [];
  const arr = Array.isArray(val) ? val : [val];
  return arr
    .map((v) => String(v).trim())
    .filter((v) => v.length > 0)
    .map((v) => Number(v));
}, z.array(z.number().int().positive()));

// ---------------------------------------------------------------------------
// Case studies (Section E) — 1 required, up to 3. Submitted as a single JSON
// string form field (`caseStudies`), since HTML multipart form-data has no
// native way to carry nested/repeated structured objects alongside files.
// ---------------------------------------------------------------------------
const caseStudySchema = z.object({
  title: requiredTrimmed(CASE_STUDY_LIMITS.title),
  clientIndustryId: z.number().int().positive(),
  clientSizeBand: clientRevenueBandEnum,
  role: caseStudyRoleEnum,
  situationText: requiredTrimmed(CASE_STUDY_LIMITS.situationText),
  interventionText: requiredTrimmed(CASE_STUDY_LIMITS.interventionText),
  outcomeText: requiredTrimmed(CASE_STUDY_LIMITS.outcomeText),
  durationMonths: z.number().int().min(0, "Duration cannot be negative.").max(600, "Duration is too long."),
  referenceable: referenceableEnum,
  pillarIds: z.array(z.number().int().positive()).min(1, "Select at least one delivery pillar."),
});

const applicationSchema = z
  .object({
    // --- Section A ---
    fullName: requiredTrimmed(200),
    email: z.string().trim().min(1, "Enter your email address.").email("Enter a valid email address."),
    mobile: z
      .string()
      .trim()
      .min(1, "Enter your mobile number.")
      .max(30, "Mobile number is too long.")
      .regex(/^[0-9+()\-.\s]{6,30}$/, "Enter a valid mobile number."),
    linkedinUrl: z
      .string()
      .trim()
      .url("Enter a valid URL.")
      .max(500, "URL is too long.")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    city: requiredTrimmed(120).transform(toTitleCase),
    state: requiredTrimmed(120).transform(toTitleCase),
    country: requiredTrimmed(120).transform(toTitleCase),
    openToRemote: boolField("Open to remote"),
    travelWillingness: travelWillingnessEnum,
    invitedByCode: z
      .string()
      .trim()
      .max(20)
      .optional()
      .or(z.literal("").transform(() => undefined)),

    // --- Section B ---
    level: levelEnum,
    totalYearsExp: requiredIntField("Total years of experience", 0, 60),
    operatingYearsExp: requiredIntField("Years in an operating role", 0, 60),
    advisoryYearsExp: requiredIntField("Years in advisory/consulting", 0, 60),
    maxTeamManaged: requiredIntField("Largest team size managed", 0, 100000),
    maxPnlBand: pnlBandEnum,

    // --- Section C ---
    capabilityTagIds: idArraySchema.pipe(
      z.array(z.number().int().positive()).min(1, "Select at least one delivery capability."),
    ),

    // --- Section D ---
    industryIds: idArraySchema.pipe(
      z.array(z.number().int().positive()).min(1, "Select at least one industry."),
    ),
    clientRevenueBands: z.preprocess((val) => {
      if (val === undefined || val === null) return [];
      return Array.isArray(val) ? val : [val];
    }, z.array(clientRevenueBandEnum)),

    // --- Section E --- (parsed from JSON string, see caseStudiesJson below)
    caseStudies: z
      .array(caseStudySchema)
      .min(1, "Add at least one case study.")
      .max(3, "You can add at most 3 case studies."),

    // --- Section F ---
    engagementType: engagementTypeEnum.optional().or(z.literal("").transform(() => undefined)),
    availabilityDaysWeek: optionalIntField("Availability (days/week)", 0, 7),
    noticePeriodDays: optionalIntField("Notice period", 0, 3650),
    rateBand: optionalTrimmed(200),
    currentlyEngaged: optionalBoolField,
    exclusivityNotes: optionalTrimmed(ENGAGEMENT_PROFILE_LIMITS.exclusivityNotes),

    // --- Section G ---
    reasonForJoining: requiredTrimmed(QUALIFYING_QUESTION_LIMITS.reasonForJoining),
    deliveryStyle: requiredTrimmed(QUALIFYING_QUESTION_LIMITS.deliveryStyle),

    // --- Section H ---
    consentFlag: boolField("Consent"),
  })
  .refine((data) => data.consentFlag === true, {
    message: "You must consent to data storage/processing to submit an application.",
    path: ["consentFlag"],
  })
  .refine((data) => !(data.currentlyEngaged === true && !data.exclusivityNotes), {
    message: "Describe your exclusivity/non-compete constraints.",
    path: ["exclusivityNotes"],
  });

type FieldErrors = Record<string, string>;

function fieldErrorResponse(fieldErrors: FieldErrors, status = 400) {
  return NextResponse.json(
    {
      error: "Validation failed.",
      message: "Please fix the highlighted fields and try again.",
      fields: fieldErrors,
    },
    { status },
  );
}

// ---------------------------------------------------------------------------
// File validation — extension allowlist + declared-MIME allowlist +
// magic-byte sniff of the actual bytes (see src/lib/uploads.ts). All three
// must agree before a file is accepted.
// ---------------------------------------------------------------------------
async function validateUploadedFile(
  file: File,
  kind: "cv" | "deck",
): Promise<{ buffer: Buffer; ext: string; error?: string }> {
  const acceptedExtensions = kind === "cv" ? ACCEPTED_CV_EXTENSIONS : ACCEPTED_DECK_EXTENSIONS;
  const acceptedMimeTypes = kind === "cv" ? ACCEPTED_CV_MIME_TYPES : ACCEPTED_DECK_MIME_TYPES;
  const label =
    kind === "cv" ? "Upload a .pdf, .doc, or .docx file." : "Upload a .pdf, .doc, .docx, .ppt, or .pptx file.";

  const originalName = file.name || kind;
  const ext = path.extname(originalName).toLowerCase();

  if (!acceptedExtensions.includes(ext)) {
    return { buffer: Buffer.alloc(0), ext, error: label };
  }
  if (file.type && file.type.length > 0 && !acceptedMimeTypes.has(file.type)) {
    return { buffer: Buffer.alloc(0), ext, error: label };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      buffer: Buffer.alloc(0),
      ext,
      error: `File must be ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB or smaller.`,
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!matchesMagicBytes(buffer, ext)) {
    return { buffer, ext, error: label };
  }

  return { buffer, ext };
}

/** Writes a validated file under `root/{consultantId}/{safeName}`, verifying
 * path containment before touching the filesystem. Returns the metadata to
 * store on the Consultant row. */
async function writeUploadedFile(
  root: string,
  consultantId: string,
  originalName: string,
  buffer: Buffer,
  mimeType: string,
): Promise<{ fileName: string; storedPath: string; mimeType: string; sizeBytes: number }> {
  const { safeName } = sanitizeFilename(originalName);
  const dir = resolveContainedPath(root, consultantId);
  const finalPath = resolveContainedPath(dir, safeName);

  await mkdir(dir, { recursive: true });
  await writeFile(finalPath, buffer);

  const storedRelativePath = path.join(consultantId, safeName);
  return {
    fileName: originalName,
    storedPath: storedRelativePath,
    mimeType: mimeType || "application/octet-stream",
    sizeBytes: buffer.byteLength,
  };
}

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Request must be multipart/form-data." }, { status: 400 });
  }

  const getAll = (key: string) => form.getAll(key).map((v) => String(v));
  const str = (key: string) => {
    const v = form.get(key);
    return v === null ? "" : String(v);
  };

  // --- Parse caseStudies JSON blob -----------------------------------------
  let caseStudiesRaw: unknown = [];
  const caseStudiesField = form.get("caseStudies");
  if (caseStudiesField !== null) {
    try {
      caseStudiesRaw = JSON.parse(String(caseStudiesField));
    } catch {
      return fieldErrorResponse({ caseStudies: "Case studies data is malformed." });
    }
  }

  const raw = {
    fullName: str("fullName"),
    email: str("email"),
    mobile: str("mobile"),
    linkedinUrl: str("linkedinUrl"),
    city: str("city"),
    state: str("state"),
    country: str("country"),
    openToRemote: str("openToRemote") || undefined,
    travelWillingness: str("travelWillingness"),
    invitedByCode: str("invitedByCode"),
    level: str("level"),
    totalYearsExp: str("totalYearsExp"),
    operatingYearsExp: str("operatingYearsExp"),
    advisoryYearsExp: str("advisoryYearsExp"),
    maxTeamManaged: str("maxTeamManaged"),
    maxPnlBand: str("maxPnlBand"),
    capabilityTagIds: getAll("capabilityTagIds"),
    industryIds: getAll("industryIds"),
    clientRevenueBands: getAll("clientRevenueBands"),
    caseStudies: caseStudiesRaw,
    engagementType: str("engagementType"),
    availabilityDaysWeek: str("availabilityDaysWeek"),
    noticePeriodDays: str("noticePeriodDays"),
    rateBand: str("rateBand"),
    currentlyEngaged: str("currentlyEngaged") || undefined,
    exclusivityNotes: str("exclusivityNotes"),
    reasonForJoining: str("reasonForJoining"),
    deliveryStyle: str("deliveryStyle"),
    consentFlag: str("consentFlag") || undefined,
  };

  const parsed = applicationSchema.safeParse(raw);

  const fieldErrors: FieldErrors = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      // Full dotted path (e.g. "caseStudies.0.situationText") so the form
      // can highlight the exact repeated-section field, not just
      // "caseStudies" in general. Falls back to "form" for a root-level
      // issue with no path.
      const key = issue.path.length > 0 ? issue.path.join(".") : "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
  }

  // --- CV (required) / deck (optional) presence check ----------------------
  const cvEntry = form.get("cv");
  let cvFile: File | null = null;
  if (!cvEntry || !(cvEntry instanceof File) || cvEntry.size === 0) {
    fieldErrors.cv = "Upload your CV.";
  } else {
    cvFile = cvEntry;
  }

  const deckEntry = form.get("deck");
  let deckFile: File | null = null;
  if (deckEntry && deckEntry instanceof File && deckEntry.size > 0) {
    deckFile = deckEntry;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return fieldErrorResponse(fieldErrors);
  }

  // parsed.success is guaranteed true here since fieldErrors is empty.
  const data = parsed.data as z.infer<typeof applicationSchema>;

  // --- Validate CV/deck file content (extension + MIME + magic bytes) ------
  const cvResult = await validateUploadedFile(cvFile as File, "cv");
  if (cvResult.error) fieldErrors.cv = cvResult.error;

  let deckResult: Awaited<ReturnType<typeof validateUploadedFile>> | null = null;
  if (deckFile) {
    deckResult = await validateUploadedFile(deckFile, "deck");
    if (deckResult.error) fieldErrors.deck = deckResult.error;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return fieldErrorResponse(fieldErrors);
  }

  // ---------------------------------------------------------------------
  // Validate every referenced lookup id against the taxonomy tables BEFORE
  // touching Prisma's write path — an id that doesn't exist must be a
  // field-keyed 400, never a foreign-key-violation 500.
  // ---------------------------------------------------------------------
  const [validSubTagIds, validIndustryIds, validPillarIds] = await Promise.all([
    getValidSubTagIds(),
    getValidIndustryIds(),
    getValidPillarIds(),
  ]);

  const invalidCapabilityIds = data.capabilityTagIds.filter((id) => !validSubTagIds.has(id));
  if (invalidCapabilityIds.length > 0) {
    fieldErrors.capabilityTagIds = "One or more selected capabilities do not exist.";
  }

  const invalidIndustryIds = data.industryIds.filter((id) => !validIndustryIds.has(id));
  if (invalidIndustryIds.length > 0) {
    fieldErrors.industryIds = "One or more selected industries do not exist.";
  }

  data.caseStudies.forEach((cs, i) => {
    if (!validIndustryIds.has(cs.clientIndustryId)) {
      fieldErrors[`caseStudies.${i}.clientIndustryId`] = "Selected client industry does not exist.";
    }
    const badPillars = cs.pillarIds.filter((id) => !validPillarIds.has(id));
    if (badPillars.length > 0) {
      fieldErrors[`caseStudies.${i}.pillarIds`] = "One or more selected pillars do not exist.";
    }
  });

  if (Object.keys(fieldErrors).length > 0) {
    return fieldErrorResponse(fieldErrors);
  }

  // --- Resolve invitedByCode -> invitedById --------------------------------
  let invitedById: string | null = null;
  const invitedByCode = data.invitedByCode;
  const isDirect =
    !invitedByCode ||
    invitedByCode.length === 0 ||
    /^direct(\/gop-sourced)?$/i.test(invitedByCode) ||
    /^gop-sourced$/i.test(invitedByCode);

  if (!isDirect) {
    const referrer = await prisma.consultant.findUnique({
      where: { consultantCode: invitedByCode as string },
      select: { id: true },
    });
    if (!referrer) {
      return fieldErrorResponse({ invitedByCode: "Unknown referral code." });
    }
    invitedById = referrer.id;
  }

  // --- Duplicate-email pre-check (fast, avoids wasted disk I/O below) ------
  const existing = await prisma.consultant.findUnique({
    where: { email: data.email },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      {
        error: "An application with this email address already exists.",
        message: "An application with this email address already exists.",
        fields: { email: "An application with this email address already exists." },
      },
      { status: 409 },
    );
  }

  // ---------------------------------------------------------------------
  // Write order — deliberately DIFFERENT from the old 2-table flow.
  //
  // The old flow created the DB row first (to mint the id the upload path
  // is keyed on), wrote the file, then updated the row — leaving a real
  // window where the row existed without its CV, requiring a manual
  // best-effort delete on any failure after the row was created.
  //
  // Here, the id is pre-generated client-side (a random UUID — the column
  // is a plain `text` PK with no format constraint; Prisma's own
  // `@default(cuid())` is only a default applied when `id` is omitted, so
  // an explicitly-supplied id is accepted as-is) BEFORE any database write
  // happens:
  //
  //   1. Validate everything (already done above).
  //   2. Generate `consultantId` in memory.
  //   3. Write the CV (and optional deck) to disk under
  //      uploads/{cvs,decks}/{consultantId}/{sanitizedName} — the file
  //      exists on disk before any DB row references it.
  //   4. Run ONE atomic `prisma.$transaction` that creates the Consultant
  //      row (id = the pre-generated id, CV/deck metadata columns already
  //      populated — no follow-up UPDATE needed) together with its
  //      capabilities, industries, case studies (+ case_study_pillars), and
  //      engagement_profile as nested writes.
  //
  // Why this ordering: it makes "a Consultant row exists" and "the
  // submission fully succeeded, including files" the same fact by
  // construction, and it eliminates the old flow's failure mode entirely —
  // there is no possible ordering of events where the transaction commits
  // and the files are missing, because the files are already on disk
  // before the transaction is even opened. The only residual failure mode
  // is the reverse: files get written, then the transaction fails (e.g. a
  // race on the email unique constraint from a near-simultaneous duplicate
  // submission). In that case we delete the just-written files in the
  // catch block below. Worst case on a bug in that cleanup path is an
  // orphaned file with nothing in the DB pointing at it — never an
  // orphaned/incomplete database row visible to the admin dashboard, which
  // is the failure mode that actually matters (a "ghost" applicant record
  // with no CV that an admin could mistake for a real submission).
  // ---------------------------------------------------------------------
  const consultantId = randomUUID();
  const writtenPaths: string[] = [];

  try {
    const cvMeta = await writeUploadedFile(
      CV_UPLOADS_ROOT,
      consultantId,
      (cvFile as File).name || "cv",
      cvResult.buffer,
      (cvFile as File).type,
    );
    writtenPaths.push(path.join(CV_UPLOADS_ROOT, consultantId));

    let deckMeta: Awaited<ReturnType<typeof writeUploadedFile>> | null = null;
    if (deckFile && deckResult) {
      deckMeta = await writeUploadedFile(
        DECK_UPLOADS_ROOT,
        consultantId,
        deckFile.name || "deck",
        deckResult.buffer,
        deckFile.type,
      );
      writtenPaths.push(path.join(DECK_UPLOADS_ROOT, consultantId));
    }

    const created = await prisma.$transaction(async (tx) => {
      return tx.consultant.create({
        data: {
          id: consultantId,
          fullName: data.fullName,
          email: data.email,
          mobile: data.mobile,
          linkedinUrl: data.linkedinUrl ?? null,
          city: data.city,
          state: data.state,
          country: data.country,
          openToRemote: data.openToRemote,
          travelWillingness: data.travelWillingness as never,
          invitedById,
          level: data.level as never,
          totalYearsExp: data.totalYearsExp,
          operatingYearsExp: data.operatingYearsExp,
          advisoryYearsExp: data.advisoryYearsExp,
          maxTeamManaged: data.maxTeamManaged,
          maxPnlBand: data.maxPnlBand as never,
          clientRevenueBands: data.clientRevenueBands as never,
          status: "APPLIED",
          dateApplied: new Date(),
          cvFileName: cvMeta.fileName,
          cvStoredPath: cvMeta.storedPath,
          cvMimeType: cvMeta.mimeType,
          cvSizeBytes: cvMeta.sizeBytes,
          deckFileName: deckMeta?.fileName ?? null,
          deckStoredPath: deckMeta?.storedPath ?? null,
          deckMimeType: deckMeta?.mimeType ?? null,
          deckSizeBytes: deckMeta?.sizeBytes ?? null,
          consentFlag: true,
          reasonForJoining: data.reasonForJoining,
          deliveryStyle: data.deliveryStyle,
          capabilities: {
            create: data.capabilityTagIds.map((tagId) => ({ tagId })),
          },
          industries: {
            create: data.industryIds.map((industryId) => ({ industryId })),
          },
          caseStudies: {
            create: data.caseStudies.map((cs) => ({
              title: cs.title,
              clientIndustryId: cs.clientIndustryId,
              clientSizeBand: cs.clientSizeBand as never,
              role: cs.role as never,
              situationText: cs.situationText,
              interventionText: cs.interventionText,
              outcomeText: cs.outcomeText,
              durationMonths: cs.durationMonths,
              referenceable: cs.referenceable as never,
              pillars: {
                create: cs.pillarIds.map((pillarId) => ({ pillarId })),
              },
            })),
          },
          engagementProfile: {
            create: {
              engagementType: (data.engagementType as never) ?? null,
              availabilityDaysWeek: data.availabilityDaysWeek ?? null,
              noticePeriodDays: data.noticePeriodDays ?? null,
              rateBand: data.rateBand ?? null,
              currentlyEngaged: data.currentlyEngaged ?? null,
              exclusivityNotes: data.exclusivityNotes ?? null,
            },
          },
        },
        select: { id: true, consultantCode: true },
      });
    });

    return NextResponse.json(
      { id: created.id, consultantCode: created.consultantCode },
      { status: 201 },
    );
  } catch (err) {
    // Never log full application bodies or file contents (candidate PII).
    const isDuplicateEmail =
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002" &&
      Array.isArray(err.meta?.target) &&
      (err.meta?.target as string[]).includes("email");

    console.error("[applications:POST] submission failed", {
      consultantId,
      duplicateEmail: isDuplicateEmail,
      message: err instanceof Error ? err.message : "unknown error",
    });

    // Best-effort cleanup of any files written before the transaction
    // failed — see the write-order comment above for why this can only
    // ever orphan a file, never a database row.
    for (const dir of writtenPaths) {
      try {
        await rm(dir, { recursive: true, force: true });
      } catch {
        // best-effort only
      }
    }

    if (isDuplicateEmail) {
      return NextResponse.json(
        {
          error: "An application with this email address already exists.",
          message: "An application with this email address already exists.",
          fields: { email: "An application with this email address already exists." },
        },
        { status: 409 },
      );
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
