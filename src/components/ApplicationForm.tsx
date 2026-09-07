"use client";

import { useEffect, useRef, useState } from "react";
import type {
  Level,
  TravelWillingness,
  PnlBand,
  ClientRevenueBand,
  CaseStudyRole,
  Referenceable,
  EngagementType,
} from "@prisma/client";
import {
  LEVEL_OPTIONS,
  LEVEL_LABELS,
  LEVEL_YEAR_RANGE_LABELS,
  TRAVEL_WILLINGNESS_OPTIONS,
  TRAVEL_WILLINGNESS_LABELS,
  PNL_BAND_OPTIONS,
  PNL_BAND_LABELS,
  CLIENT_REVENUE_BAND_OPTIONS,
  CLIENT_REVENUE_BAND_LABELS,
  CASE_STUDY_ROLE_OPTIONS,
  CASE_STUDY_ROLE_LABELS,
  REFERENCEABLE_OPTIONS,
  REFERENCEABLE_LABELS,
  ENGAGEMENT_TYPE_OPTIONS,
  ENGAGEMENT_TYPE_LABELS,
  CASE_STUDY_LIMITS,
  QUALIFYING_QUESTION_LIMITS,
  ENGAGEMENT_PROFILE_LIMITS,
} from "@/lib/constants";
import { Field, CharCounter } from "@/components/Field";
import { TextInput, TextArea, Select } from "@/components/TextInput";
import { Chip } from "@/components/Chip";
import { RadioCardGroup } from "@/components/RadioCardGroup";
import { Button } from "@/components/Button";
import { FormSection, GroupLabel, GroupError } from "@/components/FormSection";
import { FormContents, FormProgressBar } from "@/components/FormContents";

// ---------------------------------------------------------------------------
// Local taxonomy / search types — mirror the JSON shapes returned by
// GET /api/taxonomy and GET /api/consultants/search exactly (see
// src/lib/taxonomy.ts and src/app/api/consultants/search/route.ts for the
// server-side source of truth). Deliberately NOT imported from
// src/lib/taxonomy.ts — that module pulls in `prisma`/`next/cache` and
// cannot be bundled into a Client Component.
// ---------------------------------------------------------------------------
interface TaxonomySubTag {
  id: number;
  code: string;
  name: string;
}
interface TaxonomyPillar {
  id: number;
  code: string;
  name: string;
  subTags: TaxonomySubTag[];
}
interface TaxonomyIndustryNode {
  id: number;
  code: string;
  name: string;
  children: TaxonomyIndustryNode[];
}
interface TaxonomyData {
  pillars: TaxonomyPillar[];
  industries: TaxonomyIndustryNode[];
}
interface ConsultantSearchResult {
  consultantCode: string;
  fullName: string;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB, mirrors the server cap.
const ACCEPTED_CV_EXTENSIONS = [".pdf", ".doc", ".docx"];
const ACCEPTED_DECK_EXTENSIONS = [".pdf", ".doc", ".docx", ".ppt", ".pptx"];

const YES_NO_OPTIONS: ("true" | "false")[] = ["true", "false"];
const YES_NO_LABELS: Record<"true" | "false", string> = { true: "Yes", false: "No" };

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function isValidMobile(mobile: string) {
  return /^[0-9+()\-.\s]{6,30}$/.test(mobile);
}
function isValidUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
function toggleInArray<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

// ---------------------------------------------------------------------------
// Section nav — scroll-spy driven "you are here" indicator so a long,
// single-page form still feels navigable without hiding state behind a
// wizard (per the explicit instruction not to build a multi-step wizard).
// ---------------------------------------------------------------------------
const NAV_SECTIONS = [
  { id: "section-a", label: "Identity and contact" },
  { id: "section-b", label: "Level and tenure" },
  { id: "section-c", label: "Delivery pillars" },
  { id: "section-d", label: "Industry depth" },
  { id: "section-e", label: "Case studies" },
  { id: "section-f", label: "Engagement profile" },
  { id: "section-g", label: "Motivation and style" },
  { id: "section-h", label: "Documents and consent" },
] as const;

interface CaseStudyDraft {
  key: string;
  title: string;
  clientIndustryId: number | "";
  clientSizeBand: ClientRevenueBand | null;
  role: CaseStudyRole | null;
  situationText: string;
  interventionText: string;
  outcomeText: string;
  durationMonths: number | "";
  referenceable: Referenceable | null;
  pillarIds: number[];
}

let caseStudyKeySeq = 0;
function newCaseStudy(): CaseStudyDraft {
  caseStudyKeySeq += 1;
  return {
    key: `cs-${caseStudyKeySeq}`,
    title: "",
    clientIndustryId: "",
    clientSizeBand: null,
    role: null,
    situationText: "",
    interventionText: "",
    outcomeText: "",
    durationMonths: "",
    referenceable: null,
    pillarIds: [],
  };
}

interface FormState {
  fullName: string;
  email: string;
  mobile: string;
  linkedinUrl: string;
  city: string;
  state: string;
  country: string;
  openToRemote: "true" | "false" | null;
  travelWillingness: TravelWillingness | null;
  level: Level | null;
  totalYearsExp: number | "";
  operatingYearsExp: number | "";
  advisoryYearsExp: number | "";
  maxTeamManaged: number | "";
  maxPnlBand: PnlBand | null;
  capabilityTagIds: number[];
  industryIds: number[];
  clientRevenueBands: ClientRevenueBand[];
  engagementType: EngagementType | null;
  availabilityDaysWeek: number | "";
  noticePeriodDays: number | "";
  rateBand: string;
  currentlyEngaged: "true" | "false" | null;
  exclusivityNotes: string;
  reasonForJoining: string;
  deliveryStyle: string;
  consentFlag: boolean;
}

const initialState: FormState = {
  fullName: "",
  email: "",
  mobile: "",
  linkedinUrl: "",
  city: "",
  state: "",
  country: "India",
  openToRemote: null,
  travelWillingness: null,
  level: null,
  totalYearsExp: "",
  operatingYearsExp: "",
  advisoryYearsExp: "",
  maxTeamManaged: "",
  maxPnlBand: null,
  capabilityTagIds: [],
  industryIds: [],
  clientRevenueBands: [],
  engagementType: null,
  availabilityDaysWeek: "",
  noticePeriodDays: "",
  rateBand: "",
  currentlyEngaged: null,
  exclusivityNotes: "",
  reasonForJoining: "",
  deliveryStyle: "",
  consentFlag: false,
};

type Errors = Record<string, string>;

export function ApplicationForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [caseStudies, setCaseStudies] = useState<CaseStudyDraft[]>([newCaseStudy()]);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [deckFile, setDeckFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [consultantCode, setConsultantCode] = useState<string | null>(null);

  const [taxonomy, setTaxonomy] = useState<TaxonomyData | null>(null);
  const [taxonomyStatus, setTaxonomyStatus] = useState<"loading" | "ready" | "error">("loading");

  // "Invited by" typeahead state.
  const [invitedMode, setInvitedMode] = useState<"direct" | "code">("direct");
  const [invitedQuery, setInvitedQuery] = useState("");
  const [invitedResults, setInvitedResults] = useState<ConsultantSearchResult[]>([]);
  const [invitedSelection, setInvitedSelection] = useState<ConsultantSearchResult | null>(null);
  const [invitedSearchStatus, setInvitedSearchStatus] = useState<"idle" | "loading" | "error">("idle");
  const [invitedDropdownOpen, setInvitedDropdownOpen] = useState(false);

  const [activeSection, setActiveSection] = useState<string>(NAV_SECTIONS[0].id);

  const cvInputRef = useRef<HTMLInputElement>(null);
  const deckInputRef = useRef<HTMLInputElement>(null);

  function loadTaxonomy() {
    setTaxonomyStatus("loading");
    fetch("/api/taxonomy", { credentials: "same-origin" })
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((body: TaxonomyData) => {
        setTaxonomy(body);
        setTaxonomyStatus("ready");
      })
      .catch(() => {
        setTaxonomy(null);
        setTaxonomyStatus("error");
      });
  }

  useEffect(() => {
    loadTaxonomy();
  }, []);

  // Scroll-spy for the sticky section nav.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 },
    );
    for (const s of NAV_SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  // Debounced "invited by" typeahead, min 3 chars.
  useEffect(() => {
    if (invitedMode !== "code" || invitedSelection || invitedQuery.trim().length < 3) {
      setInvitedResults([]);
      setInvitedSearchStatus("idle");
      return;
    }
    setInvitedSearchStatus("loading");
    const t = setTimeout(() => {
      fetch(`/api/consultants/search?q=${encodeURIComponent(invitedQuery.trim())}`, {
        credentials: "same-origin",
      })
        .then((res) => {
          if (!res.ok) throw new Error("failed");
          return res.json();
        })
        .then((body: { results: ConsultantSearchResult[] }) => {
          setInvitedResults(body.results ?? []);
          setInvitedSearchStatus("idle");
        })
        .catch(() => {
          setInvitedResults([]);
          setInvitedSearchStatus("error");
        });
    }, 300);
    return () => clearTimeout(t);
  }, [invitedQuery, invitedMode, invitedSelection]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateCaseStudy<K extends keyof CaseStudyDraft>(index: number, key: K, value: CaseStudyDraft[K]) {
    setCaseStudies((list) => list.map((cs, i) => (i === index ? { ...cs, [key]: value } : cs)));
  }

  function addCaseStudy() {
    setCaseStudies((list) => (list.length >= 3 ? list : [...list, newCaseStudy()]));
  }

  function removeCaseStudy(index: number) {
    setCaseStudies((list) => (list.length <= 1 ? list : list.filter((_, i) => i !== index)));
  }

  function handleFileChange(
    kind: "cv" | "deck",
    file: File | null,
  ) {
    const setFile = kind === "cv" ? setCvFile : setDeckFile;
    const ref = kind === "cv" ? cvInputRef : deckInputRef;
    const acceptedExts = kind === "cv" ? ACCEPTED_CV_EXTENSIONS : ACCEPTED_DECK_EXTENSIONS;
    const label = kind === "cv" ? "cv" : "deck";
    if (!file) {
      setFile(null);
      setErrors((e) => ({ ...e, [label]: undefined as unknown as string }));
      return;
    }
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!acceptedExts.includes(ext)) {
      setErrors((e) => ({
        ...e,
        [label]: `Upload a ${acceptedExts.join(", ")} file.`,
      }));
      setFile(null);
      if (ref.current) ref.current.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrors((e) => ({ ...e, [label]: "That file is larger than 10MB. Upload a smaller file." }));
      setFile(null);
      if (ref.current) ref.current.value = "";
      return;
    }
    setErrors((e) => ({ ...e, [label]: undefined as unknown as string }));
    setFile(file);
  }

  function clearFile(kind: "cv" | "deck") {
    const setFile = kind === "cv" ? setCvFile : setDeckFile;
    const ref = kind === "cv" ? cvInputRef : deckInputRef;
    setFile(null);
    if (ref.current) ref.current.value = "";
  }

  function validate(): Errors {
    const e: Errors = {};

    if (!form.fullName.trim()) e.fullName = "Enter your full name.";
    else if (form.fullName.trim().length > 200) e.fullName = "Must be 200 characters or fewer.";

    if (!form.email.trim()) e.email = "Enter your email address.";
    else if (!isValidEmail(form.email.trim())) e.email = "Enter a valid email address.";

    if (!form.mobile.trim()) e.mobile = "Enter your mobile number.";
    else if (!isValidMobile(form.mobile.trim())) e.mobile = "Enter a valid mobile number.";

    if (form.linkedinUrl.trim() && !isValidUrl(form.linkedinUrl.trim())) {
      e.linkedinUrl = "Enter a valid URL.";
    }

    if (!form.city.trim()) e.city = "Enter your city.";
    if (!form.state.trim()) e.state = "Enter your state.";
    if (!form.country.trim()) e.country = "Enter your country.";

    if (form.openToRemote === null) e.openToRemote = "Select whether you're open to remote engagements.";
    if (!form.travelWillingness) e.travelWillingness = "Select your travel willingness.";

    if (invitedMode === "code" && !invitedSelection) {
      e.invitedByCode = "Pick a referrer, or switch to Direct / GOP-sourced.";
    }

    if (!form.level) e.level = "Select your level.";
    if (form.totalYearsExp === "") e.totalYearsExp = "Enter your total years of experience.";
    if (form.operatingYearsExp === "") e.operatingYearsExp = "Enter your years in an operating role.";
    if (form.advisoryYearsExp === "") e.advisoryYearsExp = "Enter your years in advisory/consulting roles.";
    if (form.maxTeamManaged === "") e.maxTeamManaged = "Enter the largest team size you've directly managed.";
    if (!form.maxPnlBand) e.maxPnlBand = "Select your largest P&L / budget owned.";

    if (form.capabilityTagIds.length === 0) {
      e.capabilityTagIds = "Select at least one delivery capability.";
    }
    if (form.industryIds.length === 0) {
      e.industryIds = "Select at least one industry.";
    }

    if (caseStudies.length === 0) {
      e.caseStudies = "Add at least one case study.";
    }
    caseStudies.forEach((cs, i) => {
      if (!cs.title.trim()) e[`caseStudies.${i}.title`] = "Title is required.";
      else if (cs.title.trim().length > CASE_STUDY_LIMITS.title)
        e[`caseStudies.${i}.title`] = `Must be ${CASE_STUDY_LIMITS.title} characters or fewer.`;
      if (cs.clientIndustryId === "") e[`caseStudies.${i}.clientIndustryId`] = "Select the client's industry.";
      if (!cs.clientSizeBand) e[`caseStudies.${i}.clientSizeBand`] = "Select the client's size band.";
      if (!cs.role) e[`caseStudies.${i}.role`] = "Select your role.";
      if (!cs.situationText.trim()) e[`caseStudies.${i}.situationText`] = "Describe the situation.";
      else if (cs.situationText.trim().length > CASE_STUDY_LIMITS.situationText)
        e[`caseStudies.${i}.situationText`] = `Must be ${CASE_STUDY_LIMITS.situationText} characters or fewer.`;
      if (!cs.interventionText.trim()) e[`caseStudies.${i}.interventionText`] = "Describe the intervention.";
      else if (cs.interventionText.trim().length > CASE_STUDY_LIMITS.interventionText)
        e[`caseStudies.${i}.interventionText`] = `Must be ${CASE_STUDY_LIMITS.interventionText} characters or fewer.`;
      if (!cs.outcomeText.trim()) e[`caseStudies.${i}.outcomeText`] = "Describe the outcome.";
      else if (cs.outcomeText.trim().length > CASE_STUDY_LIMITS.outcomeText)
        e[`caseStudies.${i}.outcomeText`] = `Must be ${CASE_STUDY_LIMITS.outcomeText} characters or fewer.`;
      if (cs.durationMonths === "") e[`caseStudies.${i}.durationMonths`] = "Enter the duration in months.";
      if (!cs.referenceable) e[`caseStudies.${i}.referenceable`] = "Select named or anonymized.";
      if (cs.pillarIds.length === 0) e[`caseStudies.${i}.pillarIds`] = "Select at least one delivery pillar.";
    });

    if (form.currentlyEngaged === "true" && !form.exclusivityNotes.trim()) {
      e.exclusivityNotes = "Describe your exclusivity/non-compete constraints.";
    } else if (form.exclusivityNotes.trim().length > ENGAGEMENT_PROFILE_LIMITS.exclusivityNotes) {
      e.exclusivityNotes = `Must be ${ENGAGEMENT_PROFILE_LIMITS.exclusivityNotes} characters or fewer.`;
    }

    if (!form.reasonForJoining.trim()) e.reasonForJoining = "This answer is required.";
    else if (form.reasonForJoining.trim().length > QUALIFYING_QUESTION_LIMITS.reasonForJoining)
      e.reasonForJoining = `Keep this under ${QUALIFYING_QUESTION_LIMITS.reasonForJoining} characters.`;

    if (!form.deliveryStyle.trim()) e.deliveryStyle = "This answer is required.";
    else if (form.deliveryStyle.trim().length > QUALIFYING_QUESTION_LIMITS.deliveryStyle)
      e.deliveryStyle = `Keep this under ${QUALIFYING_QUESTION_LIMITS.deliveryStyle} characters.`;

    if (!form.consentFlag) {
      e.consentFlag = "You must consent to data storage/processing to submit an application.";
    }
    if (!cvFile) e.cv = "Upload your CV.";

    return e;
  }

  function fieldDomId(key: string) {
    return `f-${key.replace(/\./g, "-")}`;
  }

  function scrollToFirstError(errs: Errors) {
    const firstKey = Object.keys(errs)[0];
    if (!firstKey) return;
    const el = document.getElementById(fieldDomId(firstKey));
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (taxonomyStatus !== "ready") return;

    const validation = validate();
    setErrors(validation);
    if (Object.values(validation).some(Boolean)) {
      scrollToFirstError(validation);
      return;
    }

    setStatus("submitting");
    setSubmitError(null);

    try {
      const body = new FormData();
      body.append("fullName", form.fullName.trim());
      body.append("email", form.email.trim());
      body.append("mobile", form.mobile.trim());
      if (form.linkedinUrl.trim()) body.append("linkedinUrl", form.linkedinUrl.trim());
      body.append("city", form.city.trim());
      body.append("state", form.state.trim());
      body.append("country", form.country.trim());
      body.append("openToRemote", form.openToRemote as string);
      body.append("travelWillingness", form.travelWillingness as string);
      body.append("invitedByCode", invitedMode === "code" && invitedSelection ? invitedSelection.consultantCode : "");
      body.append("level", form.level as string);
      body.append("totalYearsExp", String(form.totalYearsExp));
      body.append("operatingYearsExp", String(form.operatingYearsExp));
      body.append("advisoryYearsExp", String(form.advisoryYearsExp));
      body.append("maxTeamManaged", String(form.maxTeamManaged));
      body.append("maxPnlBand", form.maxPnlBand as string);
      form.capabilityTagIds.forEach((id) => body.append("capabilityTagIds", String(id)));
      form.industryIds.forEach((id) => body.append("industryIds", String(id)));
      form.clientRevenueBands.forEach((b) => body.append("clientRevenueBands", b));
      body.append(
        "caseStudies",
        JSON.stringify(
          caseStudies.map((cs) => ({
            title: cs.title.trim(),
            clientIndustryId: Number(cs.clientIndustryId),
            clientSizeBand: cs.clientSizeBand,
            role: cs.role,
            situationText: cs.situationText.trim(),
            interventionText: cs.interventionText.trim(),
            outcomeText: cs.outcomeText.trim(),
            durationMonths: Number(cs.durationMonths),
            referenceable: cs.referenceable,
            pillarIds: cs.pillarIds,
          })),
        ),
      );
      if (form.engagementType) body.append("engagementType", form.engagementType);
      if (form.availabilityDaysWeek !== "") body.append("availabilityDaysWeek", String(form.availabilityDaysWeek));
      if (form.noticePeriodDays !== "") body.append("noticePeriodDays", String(form.noticePeriodDays));
      if (form.rateBand.trim()) body.append("rateBand", form.rateBand.trim());
      if (form.currentlyEngaged !== null) body.append("currentlyEngaged", form.currentlyEngaged);
      if (form.exclusivityNotes.trim()) body.append("exclusivityNotes", form.exclusivityNotes.trim());
      body.append("reasonForJoining", form.reasonForJoining.trim());
      body.append("deliveryStyle", form.deliveryStyle.trim());
      body.append("consentFlag", String(form.consentFlag));
      if (cvFile) body.append("cv", cvFile);
      if (deckFile) body.append("deck", deckFile);

      const res = await fetch("/api/applications", { method: "POST", body });

      if (!res.ok) {
        let message = "Something went wrong. Please try again.";
        let fields: Errors = {};
        try {
          const data = await res.json();
          if (data?.message) message = data.message;
          if (data?.fields) fields = data.fields;
        } catch {
          // Response wasn't JSON — keep the default message.
        }
        if (res.status === 409) {
          message = "An application with this email address already exists.";
        }
        setSubmitError(message);
        setErrors((prev) => ({ ...prev, ...fields }));
        if (Object.keys(fields).length > 0) scrollToFirstError(fields);
        setStatus("error");
        return;
      }

      const data = await res.json();
      setConsultantCode(data?.consultantCode ?? null);
      setStatus("success");
    } catch {
      setSubmitError("Something went wrong reaching the server. Check your connection and try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="max-w-[52ch] border-t-2 border-navy pt-6">
        <h2 className="font-display text-2xl leading-tight text-ink">
          Application received
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Thanks, {form.fullName.split(" ")[0] || "there"}. Your record is filed
          {consultantCode ? (
            <>
              {" "}
              under <span className="font-medium text-ink">{consultantCode}</span>
            </>
          ) : null}
          . We read every application ourselves and come back to you if there is a fit.
        </p>
      </div>
    );
  }

  const activeIndex = Math.max(
    0,
    NAV_SECTIONS.findIndex((s) => s.id === activeSection),
  );

  return (
    <>
      <FormProgressBar sections={NAV_SECTIONS} activeIndex={activeIndex} />

      <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-x-14 xl:grid-cols-[15rem_minmax(0,1fr)] xl:gap-x-20">
        <aside className="hidden lg:block">
          <div className="sticky top-10">
            <FormContents sections={NAV_SECTIONS} activeIndex={activeIndex} />
          </div>
        </aside>

        <div className="min-w-0">
          {taxonomyStatus === "error" && (
            <div className="mb-10 flex flex-wrap items-center justify-between gap-4 border-l-2 border-red-500 bg-red-50 px-4 py-3.5">
              <p className="max-w-[60ch] text-sm leading-relaxed text-red-900">
                The delivery pillar and industry lists did not load. Sections 3, 4 and 5 need
                them.
              </p>
              <Button variant="ghost" size="sm" onClick={loadTaxonomy}>
                Try again
              </Button>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-14">
            {/* ------------------------------------------------------------ A */}
            <FormSection id="section-a" index={1} title="Identity and contact">
              <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
                <Field label="Full name" htmlFor={fieldDomId("fullName")} error={errors.fullName}>
                  <TextInput
                    id={fieldDomId("fullName")}
                    error={errors.fullName}
                    value={form.fullName}
                    onChange={(e) => update("fullName", e.target.value)}
                    autoComplete="name"
                  />
                </Field>
                <Field label="Email" htmlFor={fieldDomId("email")} error={errors.email}>
                  <TextInput
                    id={fieldDomId("email")}
                    type="email"
                    error={errors.email}
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    autoComplete="email"
                  />
                </Field>
                <Field label="Mobile" htmlFor={fieldDomId("mobile")} error={errors.mobile}>
                  <TextInput
                    id={fieldDomId("mobile")}
                    type="tel"
                    error={errors.mobile}
                    value={form.mobile}
                    onChange={(e) => update("mobile", e.target.value)}
                    autoComplete="tel"
                  />
                </Field>
              </div>

              <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
                <div className="sm:col-span-2">
                  <Field
                    label="LinkedIn"
                    htmlFor={fieldDomId("linkedinUrl")}
                    error={errors.linkedinUrl}
                    optional
                  >
                    <TextInput
                      id={fieldDomId("linkedinUrl")}
                      type="url"
                      placeholder="https://www.linkedin.com/in/yourname"
                      error={errors.linkedinUrl}
                      value={form.linkedinUrl}
                      onChange={(e) => update("linkedinUrl", e.target.value)}
                      autoComplete="url"
                    />
                  </Field>
                </div>
              </div>

              <div className="grid gap-x-6 gap-y-6 sm:grid-cols-3">
                <Field label="City" htmlFor={fieldDomId("city")} error={errors.city}>
                  <TextInput
                    id={fieldDomId("city")}
                    error={errors.city}
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    autoComplete="address-level2"
                  />
                </Field>
                <Field label="State" htmlFor={fieldDomId("state")} error={errors.state}>
                  <TextInput
                    id={fieldDomId("state")}
                    error={errors.state}
                    value={form.state}
                    onChange={(e) => update("state", e.target.value)}
                    autoComplete="address-level1"
                  />
                </Field>
                <Field label="Country" htmlFor={fieldDomId("country")} error={errors.country}>
                  <TextInput
                    id={fieldDomId("country")}
                    error={errors.country}
                    value={form.country}
                    onChange={(e) => update("country", e.target.value)}
                    autoComplete="country-name"
                  />
                </Field>
              </div>

              <div className="grid gap-x-6 gap-y-6 lg:grid-cols-2">
                <div id={fieldDomId("openToRemote")}>
                  <GroupLabel>Open to remote engagements</GroupLabel>
                  <RadioCardGroup
                    name="openToRemote"
                    variant="inline"
                    options={YES_NO_OPTIONS}
                    labels={YES_NO_LABELS}
                    value={form.openToRemote}
                    onChange={(v) => update("openToRemote", v)}
                  />
                  <GroupError message={errors.openToRemote} />
                </div>

                <div id={fieldDomId("travelWillingness")}>
                  <GroupLabel>Willing to travel</GroupLabel>
                  <RadioCardGroup
                    name="travelWillingness"
                    variant="inline"
                    options={TRAVEL_WILLINGNESS_OPTIONS}
                    labels={TRAVEL_WILLINGNESS_LABELS}
                    value={form.travelWillingness}
                    onChange={(v) => update("travelWillingness", v)}
                  />
                  <GroupError message={errors.travelWillingness} />
                </div>
              </div>

              {/* Invited by */}
              <div id={fieldDomId("invitedByCode")}>
                <GroupLabel hint="If a GOP consultant pointed you here, name them. Otherwise leave this as direct.">
                  How you found us
                </GroupLabel>

                {/* Segmented control: two mutually exclusive modes, so they sit
                    in one track rather than as two loose buttons. */}
                <div className="inline-flex rounded-lg border border-hairline bg-white p-1">
                  {(
                    [
                      ["direct", "Direct / GOP-sourced"],
                      ["code", "An existing consultant"],
                    ] as const
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={invitedMode === mode}
                      onClick={() => {
                        setInvitedMode(mode);
                        if (mode === "direct") {
                          setInvitedSelection(null);
                          setInvitedQuery("");
                        }
                      }}
                      className={`rounded-md px-3.5 py-1.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy ${
                        invitedMode === mode
                          ? "bg-navy font-medium text-white"
                          : "text-muted hover:text-ink"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {invitedMode === "code" && (
                  <div className="relative mt-3 max-w-sm">
                    {invitedSelection ? (
                      <div className="flex items-center gap-3 rounded-md border border-hairline bg-white px-3 py-2 text-sm">
                        <span className="min-w-0 truncate text-ink">
                          {invitedSelection.fullName}{" "}
                          <span className="text-xs text-muted">
                            ({invitedSelection.consultantCode})
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setInvitedSelection(null);
                            setInvitedQuery("");
                          }}
                          className="ml-auto shrink-0 text-muted underline underline-offset-2 hover:text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <>
                        <TextInput
                          placeholder="Type at least 3 letters of their name"
                          value={invitedQuery}
                          onChange={(e) => {
                            setInvitedQuery(e.target.value);
                            setInvitedDropdownOpen(true);
                          }}
                          onFocus={() => setInvitedDropdownOpen(true)}
                          onBlur={() => setTimeout(() => setInvitedDropdownOpen(false), 150)}
                          error={errors.invitedByCode}
                        />
                        {invitedDropdownOpen && invitedQuery.trim().length >= 3 && (
                          <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-hairline bg-white shadow-lg">
                            {invitedSearchStatus === "loading" && (
                              <p className="px-3 py-2 text-sm text-muted">Searching</p>
                            )}
                            {invitedSearchStatus === "error" && (
                              <p className="px-3 py-2 text-sm text-red-700">
                                Search failed. Try again.
                              </p>
                            )}
                            {invitedSearchStatus === "idle" && invitedResults.length === 0 && (
                              <p className="px-3 py-2 text-sm leading-snug text-muted">
                                No matches. Check the spelling, or switch to direct.
                              </p>
                            )}
                            {invitedResults.map((r) => (
                              <button
                                key={r.consultantCode}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setInvitedSelection(r);
                                  setInvitedDropdownOpen(false);
                                }}
                                className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-light focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy"
                              >
                                {r.fullName}{" "}
                                <span className="text-xs text-muted">({r.consultantCode})</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
                {invitedMode === "code" && !invitedDropdownOpen && (
                  <GroupError message={errors.invitedByCode} />
                )}
              </div>
            </FormSection>

            {/* ------------------------------------------------------------ B */}
            <FormSection id="section-b" index={2} title="Level and tenure">
              <div id={fieldDomId("level")}>
                <GroupLabel>Level</GroupLabel>
                <RadioCardGroup
                  name="level"
                  gridClassName="grid-cols-1 sm:grid-cols-3"
                  options={LEVEL_OPTIONS}
                  labels={LEVEL_LABELS}
                  subLabels={LEVEL_YEAR_RANGE_LABELS}
                  value={form.level}
                  onChange={(v) => update("level", v)}
                />
                <GroupError message={errors.level} />
              </div>

              {/* Four related counts on one row. Field bottom-aligns its control,
                  so the two-line labels here don't stagger the inputs. */}
              <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2 xl:grid-cols-4">
                <Field
                  label="Total years of experience"
                  htmlFor={fieldDomId("totalYearsExp")}
                  error={errors.totalYearsExp}
                >
                  <TextInput
                    id={fieldDomId("totalYearsExp")}
                    type="number"
                    min={0}
                    max={60}
                    error={errors.totalYearsExp}
                    value={form.totalYearsExp}
                    onChange={(e) =>
                      update("totalYearsExp", e.target.value === "" ? "" : Number(e.target.value))
                    }
                  />
                </Field>
                <Field
                  label="Years in an operating role"
                  htmlFor={fieldDomId("operatingYearsExp")}
                  error={errors.operatingYearsExp}
                  hint="Hands-on, not advisory."
                >
                  <TextInput
                    id={fieldDomId("operatingYearsExp")}
                    type="number"
                    min={0}
                    max={60}
                    error={errors.operatingYearsExp}
                    value={form.operatingYearsExp}
                    onChange={(e) =>
                      update(
                        "operatingYearsExp",
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                  />
                </Field>
                <Field
                  label="Years in advisory or consulting"
                  htmlFor={fieldDomId("advisoryYearsExp")}
                  error={errors.advisoryYearsExp}
                >
                  <TextInput
                    id={fieldDomId("advisoryYearsExp")}
                    type="number"
                    min={0}
                    max={60}
                    error={errors.advisoryYearsExp}
                    value={form.advisoryYearsExp}
                    onChange={(e) =>
                      update("advisoryYearsExp", e.target.value === "" ? "" : Number(e.target.value))
                    }
                  />
                </Field>
                <Field
                  label="Largest team directly managed"
                  htmlFor={fieldDomId("maxTeamManaged")}
                  error={errors.maxTeamManaged}
                  hint="Headcount."
                >
                  <TextInput
                    id={fieldDomId("maxTeamManaged")}
                    type="number"
                    min={0}
                    max={100000}
                    error={errors.maxTeamManaged}
                    value={form.maxTeamManaged}
                    onChange={(e) =>
                      update("maxTeamManaged", e.target.value === "" ? "" : Number(e.target.value))
                    }
                  />
                </Field>
              </div>

              <div id={fieldDomId("maxPnlBand")}>
                <GroupLabel>Largest P&amp;L or budget owned</GroupLabel>
                <RadioCardGroup
                  name="maxPnlBand"
                  gridClassName="grid-cols-2 sm:grid-cols-3 xl:grid-cols-5"
                  options={PNL_BAND_OPTIONS}
                  labels={PNL_BAND_LABELS}
                  value={form.maxPnlBand}
                  onChange={(v) => update("maxPnlBand", v)}
                />
                <GroupError message={errors.maxPnlBand} />
              </div>
            </FormSection>

            {/* ------------------------------------------------------------ C */}
            <FormSection
              id="section-c"
              index={3}
              title="Delivery pillars"
              description="Select every capability you can lead on, under any pillar."
            >
              <div id={fieldDomId("capabilityTagIds")} className="flex flex-col gap-6">
                {taxonomyStatus === "loading" && (
                  <p className="text-sm text-muted">Loading pillars</p>
                )}
                {taxonomyStatus === "ready" &&
                  taxonomy!.pillars.map((pillar) => (
                    <div key={pillar.id}>
                      <h3 className="mb-2.5 text-sm font-medium text-navy">{pillar.name}</h3>
                      <div className="flex flex-wrap gap-2" role="group" aria-label={pillar.name}>
                        {pillar.subTags.map((tag) => (
                          <Chip
                            key={tag.id}
                            id={`capability-${tag.id}`}
                            name="capabilityTagIds"
                            label={tag.name}
                            checked={form.capabilityTagIds.includes(tag.id)}
                            onChange={() =>
                              update(
                                "capabilityTagIds",
                                toggleInArray(form.capabilityTagIds, tag.id),
                              )
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                <GroupError message={errors.capabilityTagIds} />
              </div>
            </FormSection>

            {/* ------------------------------------------------------------ D */}
            <FormSection
              id="section-d"
              index={4}
              title="Industry depth"
              description="Pick a sector to reveal its sub-verticals, then narrow down."
            >
              <div id={fieldDomId("industryIds")} className="flex flex-col gap-3">
                {taxonomyStatus === "loading" && (
                  <p className="text-sm text-muted">Loading industries</p>
                )}
                {taxonomyStatus === "ready" &&
                  taxonomy!.industries.map((sector) => {
                    const selected = form.industryIds.includes(sector.id);
                    return (
                      <div key={sector.id}>
                        <Chip
                          id={`industry-${sector.id}`}
                          name="industryIds"
                          label={sector.name}
                          checked={selected}
                          onChange={() =>
                            update("industryIds", toggleInArray(form.industryIds, sector.id))
                          }
                        />
                        {selected && sector.children.length > 0 && (
                          <div className="ml-3 mt-2.5 flex flex-wrap gap-2 border-l border-hairline pl-4">
                            {sector.children.map((child) => (
                              <Chip
                                key={child.id}
                                id={`industry-${child.id}`}
                                name="industryIds"
                                label={child.name}
                                checked={form.industryIds.includes(child.id)}
                                onChange={() =>
                                  update("industryIds", toggleInArray(form.industryIds, child.id))
                                }
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                <GroupError message={errors.industryIds} />
              </div>

              <div>
                <GroupLabel optional>Revenue of the companies you have worked with</GroupLabel>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Client revenue">
                  {CLIENT_REVENUE_BAND_OPTIONS.map((band) => (
                    <Chip
                      key={band}
                      id={`revenue-band-${band}`}
                      name="clientRevenueBands"
                      label={CLIENT_REVENUE_BAND_LABELS[band]}
                      checked={form.clientRevenueBands.includes(band)}
                      onChange={() =>
                        update("clientRevenueBands", toggleInArray(form.clientRevenueBands, band))
                      }
                    />
                  ))}
                </div>
              </div>
            </FormSection>

            {/* ------------------------------------------------------------ E */}
            <FormSection
              id="section-e"
              index={5}
              title="Case studies"
              description="One is required, three is the maximum. Pick the work that best shows what you change when you walk in."
            >
              <GroupError message={errors.caseStudies} />

              <div className="flex flex-col gap-5">
                {caseStudies.map((cs, i) => (
                  <CaseStudyBlock
                    key={cs.key}
                    index={i}
                    draft={cs}
                    errors={errors}
                    fieldDomId={fieldDomId}
                    onChange={(key, value) => updateCaseStudy(i, key, value)}
                    onRemove={() => removeCaseStudy(i)}
                    canRemove={caseStudies.length > 1}
                    taxonomy={taxonomy}
                    taxonomyStatus={taxonomyStatus}
                  />
                ))}
              </div>

              <div>
                <Button
                  variant="secondary"
                  onClick={addCaseStudy}
                  disabled={caseStudies.length >= 3}
                >
                  {caseStudies.length >= 3 ? "Three is the maximum" : "Add another case study"}
                </Button>
              </div>
            </FormSection>

            {/* ------------------------------------------------------------ F */}
            <FormSection
              id="section-f"
              index={6}
              title="Engagement profile"
              description="How you prefer to work. Everything here is optional, but it speeds up matching."
            >
              <div>
                <GroupLabel optional>Preferred engagement type</GroupLabel>
                <RadioCardGroup
                  name="engagementType"
                  gridClassName="grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
                  options={ENGAGEMENT_TYPE_OPTIONS}
                  labels={ENGAGEMENT_TYPE_LABELS}
                  value={form.engagementType}
                  onChange={(v) => update("engagementType", v)}
                />
              </div>

              <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
                <Field
                  label="Availability"
                  htmlFor={fieldDomId("availabilityDaysWeek")}
                  error={errors.availabilityDaysWeek}
                  optional
                  hint="Days per week."
                >
                  <TextInput
                    id={fieldDomId("availabilityDaysWeek")}
                    type="number"
                    min={0}
                    max={7}
                    error={errors.availabilityDaysWeek}
                    value={form.availabilityDaysWeek}
                    onChange={(e) =>
                      update(
                        "availabilityDaysWeek",
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                  />
                </Field>
                <Field
                  label="Notice period"
                  htmlFor={fieldDomId("noticePeriodDays")}
                  error={errors.noticePeriodDays}
                  optional
                  hint="Days."
                >
                  <TextInput
                    id={fieldDomId("noticePeriodDays")}
                    type="number"
                    min={0}
                    max={3650}
                    error={errors.noticePeriodDays}
                    value={form.noticePeriodDays}
                    onChange={(e) =>
                      update("noticePeriodDays", e.target.value === "" ? "" : Number(e.target.value))
                    }
                  />
                </Field>
                <Field
                  label="Indicative commercials"
                  htmlFor={fieldDomId("rateBand")}
                  error={errors.rateBand}
                  optional
                  hint="Day rate or project fee. A range is fine."
                >
                  <TextInput
                    id={fieldDomId("rateBand")}
                    error={errors.rateBand}
                    value={form.rateBand}
                    onChange={(e) => update("rateBand", e.target.value)}
                    placeholder="e.g. 40-60k/day"
                  />
                </Field>
              </div>

              <div>
                <GroupLabel optional>Currently engaged elsewhere</GroupLabel>
                <RadioCardGroup
                  name="currentlyEngaged"
                  variant="inline"
                  options={YES_NO_OPTIONS}
                  labels={YES_NO_LABELS}
                  value={form.currentlyEngaged}
                  onChange={(v) => update("currentlyEngaged", v)}
                />
              </div>

              {form.currentlyEngaged === "true" && (
                <div className="max-w-[70ch]">
                  <Field
                    label="Exclusivity or non-compete constraints"
                    htmlFor={fieldDomId("exclusivityNotes")}
                    error={errors.exclusivityNotes}
                  >
                    <TextArea
                      id={fieldDomId("exclusivityNotes")}
                      error={errors.exclusivityNotes}
                      value={form.exclusivityNotes}
                      maxLength={ENGAGEMENT_PROFILE_LIMITS.exclusivityNotes}
                      onChange={(e) => update("exclusivityNotes", e.target.value)}
                    />
                    <CharCounter
                      value={form.exclusivityNotes}
                      limit={ENGAGEMENT_PROFILE_LIMITS.exclusivityNotes}
                    />
                  </Field>
                </div>
              )}
            </FormSection>

            {/* ------------------------------------------------------------ G */}
            <FormSection id="section-g" index={7} title="Motivation and delivery style">
              <div className="grid gap-x-8 gap-y-6 xl:grid-cols-2">
                <Field
                  label="Why do you want to be part of GOP?"
                  htmlFor={fieldDomId("reasonForJoining")}
                  error={errors.reasonForJoining}
                >
                  <TextArea
                    id={fieldDomId("reasonForJoining")}
                    error={errors.reasonForJoining}
                    value={form.reasonForJoining}
                    maxLength={QUALIFYING_QUESTION_LIMITS.reasonForJoining}
                    onChange={(e) => update("reasonForJoining", e.target.value)}
                  />
                  <CharCounter
                    value={form.reasonForJoining}
                    limit={QUALIFYING_QUESTION_LIMITS.reasonForJoining}
                  />
                </Field>

                <Field
                  label="How do you usually deliver an engagement?"
                  htmlFor={fieldDomId("deliveryStyle")}
                  error={errors.deliveryStyle}
                  hint="Solo, with a small pod, embedded full-time, something else."
                >
                  <TextArea
                    id={fieldDomId("deliveryStyle")}
                    error={errors.deliveryStyle}
                    value={form.deliveryStyle}
                    maxLength={QUALIFYING_QUESTION_LIMITS.deliveryStyle}
                    onChange={(e) => update("deliveryStyle", e.target.value)}
                  />
                  <CharCounter
                    value={form.deliveryStyle}
                    limit={QUALIFYING_QUESTION_LIMITS.deliveryStyle}
                  />
                </Field>
              </div>
            </FormSection>

            {/* ------------------------------------------------------------ H */}
            <FormSection id="section-h" index={8} title="Documents and consent">
              <div className="grid gap-x-8 gap-y-7 lg:grid-cols-2">
                <FileField
                  id="cvFileInput"
                  anchorId={fieldDomId("cv")}
                  label="Your CV"
                  buttonLabel="Choose CV"
                  accept=".pdf,.doc,.docx"
                  hint="PDF, DOC or DOCX. Up to 10MB."
                  file={cvFile}
                  error={errors.cv}
                  inputRef={cvInputRef}
                  onSelect={(f) => handleFileChange("cv", f)}
                  onClear={() => clearFile("cv")}
                />
                <FileField
                  id="deckFileInput"
                  anchorId={fieldDomId("deck")}
                  label="A deck or deliverable sample"
                  buttonLabel="Choose file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                  hint="PDF, DOC, DOCX, PPT or PPTX. Up to 10MB."
                  optional
                  file={deckFile}
                  error={errors.deck}
                  inputRef={deckInputRef}
                  onSelect={(f) => handleFileChange("deck", f)}
                  onClear={() => clearFile("deck")}
                />
              </div>

              <div id={fieldDomId("consentFlag")} className="max-w-[70ch]">
                <label
                  htmlFor="consentFlag"
                  className="flex cursor-pointer select-none items-start gap-3 text-sm leading-relaxed text-ink"
                >
                  <input
                    id="consentFlag"
                    type="checkbox"
                    checked={form.consentFlag}
                    onChange={(e) => update("consentFlag", e.target.checked)}
                    aria-invalid={!!errors.consentFlag}
                    aria-describedby={errors.consentFlag ? "consentFlag-error" : undefined}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-hairline text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
                  />
                  <span>
                    I consent to GOP storing and processing this data to match consultants with
                    clients.
                  </span>
                </label>
                {errors.consentFlag && (
                  <p id="consentFlag-error" role="alert" className="mt-2 text-sm text-red-700">
                    {errors.consentFlag}
                  </p>
                )}
              </div>
            </FormSection>

            {/* --------------------------------------------------------- submit */}
            <div className="border-t-2 border-navy pt-6">
              <div className="flex flex-col gap-5 sm:pl-9">
                {status === "error" && submitError && (
                  <p
                    role="alert"
                    className="max-w-[70ch] border-l-2 border-red-500 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-900"
                  >
                    {submitError}
                  </p>
                )}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-[46ch] text-sm leading-relaxed text-muted">
                    You cannot edit this once it is in, so read it back first.
                  </p>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={status === "submitting" || taxonomyStatus === "loading"}
                  >
                    {status === "submitting" ? "Submitting" : "Submit application"}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// File picker. The native file input is unstyleable across browsers, so it is
// visually hidden behind a label acting as the button; the chosen filename is
// shown next to it because a hidden input otherwise gives no feedback at all.
// ---------------------------------------------------------------------------
function FileField({
  id,
  anchorId,
  label,
  buttonLabel,
  accept,
  hint,
  optional,
  file,
  error,
  inputRef,
  onSelect,
  onClear,
}: {
  id: string;
  anchorId: string;
  label: string;
  buttonLabel: string;
  accept: string;
  hint: string;
  optional?: boolean;
  file: File | null;
  error?: string;
  inputRef: React.RefObject<HTMLInputElement>;
  onSelect: (file: File | null) => void;
  onClear: () => void;
}) {
  return (
    <div id={anchorId}>
      <GroupLabel optional={optional} hint={hint}>
        {label}
      </GroupLabel>
      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor={id}
          className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-navy px-4 text-sm font-medium text-navy transition-colors hover:bg-navy hover:text-white has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-navy"
        >
          {buttonLabel}
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept={accept}
            className="sr-only"
            onChange={(e) => onSelect(e.target.files?.[0] ?? null)}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
          />
        </label>
        {file && (
          <span className="flex min-w-0 items-center gap-2.5 text-sm text-ink">
            <span className="truncate">{file.name}</span>
            <button
              type="button"
              onClick={onClear}
              className="shrink-0 text-muted underline underline-offset-2 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              Remove
            </button>
          </span>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// A single repeatable Section E case-study block. This one DOES get a border:
// the enclosure is what says "these twelve fields describe case study 2 and
// not case study 1", which is information rather than decoration.
// ---------------------------------------------------------------------------
function CaseStudyBlock({
  index,
  draft,
  errors,
  fieldDomId,
  onChange,
  onRemove,
  canRemove,
  taxonomy,
  taxonomyStatus,
}: {
  index: number;
  draft: CaseStudyDraft;
  errors: Errors;
  fieldDomId: (key: string) => string;
  onChange: <K extends keyof CaseStudyDraft>(key: K, value: CaseStudyDraft[K]) => void;
  onRemove: () => void;
  canRemove: boolean;
  taxonomy: TaxonomyData | null;
  taxonomyStatus: "loading" | "ready" | "error";
}) {
  const prefix = `caseStudies.${index}`;

  return (
    <div className="rounded-lg border border-hairline bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-3.5 sm:px-6">
        <h3 className="text-[15px] font-medium text-ink">Case study {index + 1}</h3>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded text-sm text-muted underline underline-offset-2 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          >
            Remove
          </button>
        )}
      </div>

      <div className="flex flex-col gap-6 px-5 py-6 sm:px-6">
        <Field label="Title" htmlFor={fieldDomId(`${prefix}.title`)} error={errors[`${prefix}.title`]}>
          <TextInput
            id={fieldDomId(`${prefix}.title`)}
            error={errors[`${prefix}.title`]}
            value={draft.title}
            maxLength={CASE_STUDY_LIMITS.title}
            onChange={(e) => onChange("title", e.target.value)}
            placeholder="What the engagement was"
          />
          <CharCounter value={draft.title} limit={CASE_STUDY_LIMITS.title} />
        </Field>

        <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
          <Field
            label="Client industry"
            htmlFor={fieldDomId(`${prefix}.clientIndustryId`)}
            error={errors[`${prefix}.clientIndustryId`]}
          >
            <Select
              id={fieldDomId(`${prefix}.clientIndustryId`)}
              error={errors[`${prefix}.clientIndustryId`]}
              value={draft.clientIndustryId}
              disabled={taxonomyStatus !== "ready"}
              onChange={(e) =>
                onChange("clientIndustryId", e.target.value === "" ? "" : Number(e.target.value))
              }
            >
              <option value="">
                {taxonomyStatus === "ready" ? "Select an industry" : "Loading"}
              </option>
              {taxonomy?.industries.map((sector) => (
                <optgroup key={sector.id} label={sector.name}>
                  <option value={sector.id}>{sector.name}</option>
                  {sector.children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>

          <Field
            label="Client revenue"
            htmlFor={fieldDomId(`${prefix}.clientSizeBand`)}
            error={errors[`${prefix}.clientSizeBand`]}
          >
            <Select
              id={fieldDomId(`${prefix}.clientSizeBand`)}
              error={errors[`${prefix}.clientSizeBand`]}
              value={draft.clientSizeBand ?? ""}
              onChange={(e) =>
                onChange("clientSizeBand", (e.target.value || null) as ClientRevenueBand | null)
              }
            >
              <option value="">Select a band</option>
              {CLIENT_REVENUE_BAND_OPTIONS.map((band) => (
                <option key={band} value={band}>
                  {CLIENT_REVENUE_BAND_LABELS[band]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Duration"
            htmlFor={fieldDomId(`${prefix}.durationMonths`)}
            error={errors[`${prefix}.durationMonths`]}
            hint="Months."
          >
            <TextInput
              id={fieldDomId(`${prefix}.durationMonths`)}
              type="number"
              min={0}
              max={600}
              error={errors[`${prefix}.durationMonths`]}
              value={draft.durationMonths}
              onChange={(e) =>
                onChange("durationMonths", e.target.value === "" ? "" : Number(e.target.value))
              }
            />
          </Field>
        </div>

        <div id={fieldDomId(`${prefix}.pillarIds`)}>
          <GroupLabel>Delivery pillars involved</GroupLabel>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label={`Case study ${index + 1} pillars`}
          >
            {taxonomyStatus === "ready" &&
              taxonomy!.pillars.map((pillar) => (
                <Chip
                  key={pillar.id}
                  id={fieldDomId(`${prefix}.pillarIds.${pillar.id}`)}
                  name={`${prefix}.pillarIds`}
                  label={pillar.name}
                  checked={draft.pillarIds.includes(pillar.id)}
                  onChange={() => onChange("pillarIds", toggleInArray(draft.pillarIds, pillar.id))}
                />
              ))}
            {taxonomyStatus === "loading" && <p className="text-sm text-muted">Loading</p>}
          </div>
          <GroupError message={errors[`${prefix}.pillarIds`]} />
        </div>

        {/* Situation / intervention / outcome are short and read as one
            narrative, so on a wide column they sit side by side in order. */}
        <div className="grid gap-x-6 gap-y-6 xl:grid-cols-3">
          <Field
            label="Situation"
            htmlFor={fieldDomId(`${prefix}.situationText`)}
            error={errors[`${prefix}.situationText`]}
            hint="What was broken."
          >
            <TextArea
              id={fieldDomId(`${prefix}.situationText`)}
              error={errors[`${prefix}.situationText`]}
              value={draft.situationText}
              maxLength={CASE_STUDY_LIMITS.situationText}
              onChange={(e) => onChange("situationText", e.target.value)}
            />
            <CharCounter value={draft.situationText} limit={CASE_STUDY_LIMITS.situationText} />
          </Field>

          <Field
            label="Intervention"
            htmlFor={fieldDomId(`${prefix}.interventionText`)}
            error={errors[`${prefix}.interventionText`]}
            hint="What you did."
          >
            <TextArea
              id={fieldDomId(`${prefix}.interventionText`)}
              error={errors[`${prefix}.interventionText`]}
              value={draft.interventionText}
              maxLength={CASE_STUDY_LIMITS.interventionText}
              onChange={(e) => onChange("interventionText", e.target.value)}
            />
            <CharCounter
              value={draft.interventionText}
              limit={CASE_STUDY_LIMITS.interventionText}
            />
          </Field>

          <Field
            label="Outcome"
            htmlFor={fieldDomId(`${prefix}.outcomeText`)}
            error={errors[`${prefix}.outcomeText`]}
            hint="Quantified. Percent, rupees, or time saved."
          >
            <TextArea
              id={fieldDomId(`${prefix}.outcomeText`)}
              error={errors[`${prefix}.outcomeText`]}
              value={draft.outcomeText}
              maxLength={CASE_STUDY_LIMITS.outcomeText}
              onChange={(e) => onChange("outcomeText", e.target.value)}
            />
            <CharCounter value={draft.outcomeText} limit={CASE_STUDY_LIMITS.outcomeText} />
          </Field>
        </div>

        <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2">
          <div id={fieldDomId(`${prefix}.role`)}>
            <GroupLabel>Your role</GroupLabel>
            <RadioCardGroup
              name={`${prefix}.role`}
              variant="inline"
              options={CASE_STUDY_ROLE_OPTIONS}
              labels={CASE_STUDY_ROLE_LABELS}
              value={draft.role}
              onChange={(v) => onChange("role", v)}
            />
            <GroupError message={errors[`${prefix}.role`]} />
          </div>

          <div id={fieldDomId(`${prefix}.referenceable`)}>
            <GroupLabel hint="Can we name this client, or only describe the work?">
              Referenceable
            </GroupLabel>
            <RadioCardGroup
              name={`${prefix}.referenceable`}
              variant="inline"
              options={REFERENCEABLE_OPTIONS}
              labels={REFERENCEABLE_LABELS}
              value={draft.referenceable}
              onChange={(v) => onChange("referenceable", v)}
            />
            <GroupError message={errors[`${prefix}.referenceable`]} />
          </div>
        </div>
      </div>
    </div>
  );
}
