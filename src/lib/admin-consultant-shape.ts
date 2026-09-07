import type { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Shared `select` shape + row-flattening for GET /api/admin/consultants.
//
// Deliberately a `select` (not `include`) so the raw filesystem paths
// (`cvStoredPath`, `deckStoredPath`) never leave the database layer — the
// dashboard only ever needs to know whether a CV/deck exists (`hasCv`/
// `hasDeck`, derived below) plus the id-keyed download routes
// (/api/admin/consultants/[id]/cv, /deck) to fetch them.
//
// Query-count note: this is ONE `findMany` call. Prisma resolves nested
// `select`/relations for a `findMany` with a small constant number of
// batched SQL queries (one per relation "level", using
// `WHERE consultant_id IN (...)`), not one query per row per relation — see
// the route file for the actual measured query count against the live DB.
// ---------------------------------------------------------------------------
export const CONSULTANT_LIST_SELECT = {
  id: true,
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
  level: true,
  totalYearsExp: true,
  operatingYearsExp: true,
  advisoryYearsExp: true,
  maxTeamManaged: true,
  maxPnlBand: true,
  clientRevenueBands: true,
  status: true,
  dateInvited: true,
  dateApplied: true,
  dateApproved: true,
  cvFileName: true,
  cvMimeType: true,
  cvSizeBytes: true,
  deckFileName: true,
  deckMimeType: true,
  deckSizeBytes: true,
  consentFlag: true,
  reasonForJoining: true,
  deliveryStyle: true,
  createdAt: true,
  updatedAt: true,
  invitedBy: {
    select: { id: true, consultantCode: true, fullName: true },
  },
  capabilities: {
    select: {
      tag: {
        select: {
          id: true,
          code: true,
          name: true,
          pillar: { select: { id: true, code: true, name: true } },
        },
      },
    },
  },
  industries: {
    select: {
      industry: {
        select: { id: true, code: true, name: true, parentIndustryId: true },
      },
    },
  },
  caseStudies: {
    select: {
      id: true,
      title: true,
      clientIndustryId: true,
      clientSizeBand: true,
      role: true,
      situationText: true,
      interventionText: true,
      outcomeText: true,
      durationMonths: true,
      referenceable: true,
      createdAt: true,
      clientIndustry: { select: { id: true, code: true, name: true } },
      pillars: {
        select: { pillar: { select: { id: true, code: true, name: true } } },
      },
    },
  },
  engagementProfile: {
    select: {
      engagementType: true,
      availabilityDaysWeek: true,
      noticePeriodDays: true,
      rateBand: true,
      currentlyEngaged: true,
      exclusivityNotes: true,
      lastUpdated: true,
    },
  },
} satisfies Prisma.ConsultantSelect;

export type ConsultantListRow = Prisma.ConsultantGetPayload<{
  select: typeof CONSULTANT_LIST_SELECT;
}>;

/** Flattens the nested junction rows (capabilities/industries/case-study
 * pillars) into arrays the dashboard can render directly, and derives
 * hasCv/hasDeck instead of exposing raw disk paths (which were never
 * selected in the first place). */
export function shapeConsultantRow(row: ConsultantListRow) {
  const { cvFileName, cvMimeType, cvSizeBytes, deckFileName, deckMimeType, deckSizeBytes, ...rest } =
    row;

  return {
    ...rest,
    hasCv: Boolean(cvFileName),
    cvFileName,
    cvMimeType,
    cvSizeBytes,
    hasDeck: Boolean(deckFileName),
    deckFileName,
    deckMimeType,
    deckSizeBytes,
    capabilities: row.capabilities.map((c) => ({
      tagId: c.tag.id,
      tagCode: c.tag.code,
      tagName: c.tag.name,
      pillarId: c.tag.pillar.id,
      pillarCode: c.tag.pillar.code,
      pillarName: c.tag.pillar.name,
    })),
    industries: row.industries.map((ci) => ({
      industryId: ci.industry.id,
      code: ci.industry.code,
      name: ci.industry.name,
      parentIndustryId: ci.industry.parentIndustryId,
    })),
    caseStudies: row.caseStudies.map((cs) => ({
      id: cs.id,
      title: cs.title,
      clientIndustryId: cs.clientIndustryId,
      clientIndustryName: cs.clientIndustry.name,
      clientSizeBand: cs.clientSizeBand,
      role: cs.role,
      situationText: cs.situationText,
      interventionText: cs.interventionText,
      outcomeText: cs.outcomeText,
      durationMonths: cs.durationMonths,
      referenceable: cs.referenceable,
      createdAt: cs.createdAt,
      pillars: cs.pillars.map((p) => ({
        pillarId: p.pillar.id,
        pillarCode: p.pillar.code,
        pillarName: p.pillar.name,
      })),
    })),
  };
}
