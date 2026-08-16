"use client";

import { useRef, useState } from "react";
import type { Level, DeliveryFunction, Skill, Industry } from "@prisma/client";
import {
  LEVEL_OPTIONS,
  LEVEL_LABELS,
  LEVEL_YEAR_RANGE_LABELS,
  DELIVERY_FUNCTION_OPTIONS,
  DELIVERY_FUNCTION_LABELS,
  SKILL_LABELS,
  SKILL_CLUSTERS,
  INDUSTRY_OPTIONS,
  INDUSTRY_LABELS,
} from "@/lib/constants";
import { Field } from "@/components/Field";
import { TextInput, TextArea } from "@/components/TextInput";
import { ChipGroup } from "@/components/Chip";
import { RadioCardGroup } from "@/components/RadioCardGroup";

const MAX_CV_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ACCEPTED_CV_EXTENSIONS = [".pdf", ".doc", ".docx"];

// `maxChars` is mirrored by the same limits in the zod schema on the API
// route — the client cap is a courtesy, the server one is authoritative.
const QUALIFYING_QUESTIONS: {
  field: keyof FormState;
  label: string;
  maxChars: number;
}[] = [
  { field: "qWhatIsGop", label: "What is GOP?", maxChars: 200 },
  {
    field: "qWhyJoinGop",
    label: "Why do you want to be part of GOP?",
    maxChars: 200,
  },
  {
    field: "qKeySkills",
    label:
      "What are your key skills that make you the go-to person for this role?",
    maxChars: 300,
  },
  {
    field: "qRelevantExperience",
    label:
      "What's your relevant experience that qualifies you for this role?",
    maxChars: 300,
  },
  {
    field: "qHowDeliver",
    label: "How will you deliver your services?",
    maxChars: 200,
  },
];

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  level: Level | null;
  functions: DeliveryFunction[];
  skills: Skill[];
  city: string;
  state: string;
  country: string;
  remote: boolean;
  industries: Industry[];
  additionalNotes: string;
  qWhatIsGop: string;
  qWhyJoinGop: string;
  qKeySkills: string;
  qRelevantExperience: string;
  qHowDeliver: string;
}

const initialState: FormState = {
  fullName: "",
  email: "",
  phone: "",
  level: null,
  functions: [],
  skills: [],
  city: "",
  state: "",
  country: "India",
  remote: false,
  industries: [],
  additionalNotes: "",
  qWhatIsGop: "",
  qWhyJoinGop: "",
  qKeySkills: "",
  qRelevantExperience: "",
  qHowDeliver: "",
};

type Errors = Partial<Record<keyof FormState | "cv", string>>;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function toggleInArray<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export function ApplicationForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">(
    "idle",
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleCvChange(file: File | null) {
    if (!file) {
      setCvFile(null);
      setErrors((e) => ({ ...e, cv: undefined }));
      return;
    }
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ACCEPTED_CV_EXTENSIONS.includes(ext)) {
      setErrors((e) => ({
        ...e,
        cv: "Upload a .pdf, .doc, or .docx file.",
      }));
      setCvFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > MAX_CV_SIZE_BYTES) {
      setErrors((e) => ({
        ...e,
        cv: "That file is larger than 10MB. Upload a smaller file.",
      }));
      setCvFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setErrors((e) => ({ ...e, cv: undefined }));
    setCvFile(file);
  }

  function clearCv() {
    setCvFile(null);
    setErrors((e) => ({ ...e, cv: undefined }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function validate(): Errors {
    const next: Errors = {};
    if (!form.fullName.trim()) next.fullName = "Enter your full name.";
    if (!form.email.trim()) next.email = "Enter your email address.";
    else if (!isValidEmail(form.email))
      next.email = "Enter a valid email address.";
    if (!form.phone.trim()) next.phone = "Enter your mobile number.";
    if (!form.level) next.level = "Select your level.";
    if (form.functions.length === 0)
      next.functions = "Select at least one delivery function.";
    if (form.skills.length === 0)
      next.skills = "Select at least one skill.";
    if (!form.city.trim()) next.city = "Enter your city.";
    if (!form.state.trim()) next.state = "Enter your state.";
    if (!form.country.trim()) next.country = "Enter your country.";
    if (form.industries.length === 0)
      next.industries = "Select at least one industry.";
    if (!cvFile) next.cv = "Upload your CV.";
    for (const q of QUALIFYING_QUESTIONS) {
      const value = (form[q.field] as string).trim();
      if (!value) {
        next[q.field] = "This answer is required.";
      } else if (value.length > q.maxChars) {
        next[q.field] = `Keep this under ${q.maxChars} characters.`;
      }
    }
    return next;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validation = validate();
    setErrors(validation);
    if (Object.values(validation).some(Boolean)) {
      // Focus the first invalid field for a faster fix.
      const firstKey = Object.keys(validation)[0];
      const el = document.getElementById(firstKey);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setStatus("submitting");
    setSubmitError(null);

    try {
      const body = new FormData();
      body.append("fullName", form.fullName);
      body.append("email", form.email);
      body.append("phone", form.phone);
      body.append("level", form.level as string);
      form.functions.forEach((f) => body.append("functions", f));
      form.skills.forEach((s) => body.append("skills", s));
      body.append("city", form.city);
      body.append("state", form.state);
      body.append("country", form.country);
      body.append("remote", String(form.remote));
      form.industries.forEach((i) => body.append("industries", i));
      body.append("additionalNotes", form.additionalNotes);
      body.append("qWhatIsGop", form.qWhatIsGop);
      body.append("qWhyJoinGop", form.qWhyJoinGop);
      body.append("qKeySkills", form.qKeySkills);
      body.append("qRelevantExperience", form.qRelevantExperience);
      body.append("qHowDeliver", form.qHowDeliver);
      if (cvFile) body.append("cv", cvFile);

      const res = await fetch("/api/applications", {
        method: "POST",
        body,
      });

      if (!res.ok) {
        let message = "Something went wrong. Please try again.";
        try {
          const data = await res.json();
          if (data?.message) message = data.message;
        } catch {
          // Response wasn't JSON (e.g. a plain 404 page) — keep default message.
        }
        setSubmitError(message);
        setStatus("error");
        return;
      }

      const data = await res.json();
      setApplicationId(data?.id ?? null);
      setStatus("success");
    } catch {
      setSubmitError(
        "Something went wrong reaching the server. Check your connection and try again.",
      );
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-lg border border-hairline bg-white p-8 text-center">
        <h2 className="font-display text-2xl text-ink mb-2">
          Application submitted
        </h2>
        <p className="text-muted">
          Thanks, {form.fullName.split(" ")[0] || "there"} &mdash; we have
          your application
          {applicationId ? (
            <>
              {" "}
              (reference <span className="font-mono text-ink">{applicationId}</span>)
            </>
          ) : null}
          . We&apos;ll be in touch if there&apos;s a fit.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-10">
      {/* Contact details */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl text-ink">Contact details</h2>
        <Field label="Full name" htmlFor="fullName" error={errors.fullName}>
          <TextInput
            id="fullName"
            error={errors.fullName}
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            autoComplete="name"
          />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Email" htmlFor="email" error={errors.email}>
            <TextInput
              id="email"
              type="email"
              error={errors.email}
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              autoComplete="email"
            />
          </Field>
          <Field label="Mobile" htmlFor="phone" error={errors.phone}>
            <TextInput
              id="phone"
              type="tel"
              error={errors.phone}
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              autoComplete="tel"
            />
          </Field>
        </div>

        {/* Location lives inside Contact details rather than as its own
            section — it's part of "who and where you are". */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="City" htmlFor="city" error={errors.city}>
            <TextInput
              id="city"
              error={errors.city}
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              autoComplete="address-level2"
            />
          </Field>
          <Field label="State" htmlFor="state" error={errors.state}>
            <TextInput
              id="state"
              error={errors.state}
              value={form.state}
              onChange={(e) => update("state", e.target.value)}
              autoComplete="address-level1"
            />
          </Field>
          <Field label="Country" htmlFor="country" error={errors.country}>
            <TextInput
              id="country"
              error={errors.country}
              value={form.country}
              onChange={(e) => update("country", e.target.value)}
              autoComplete="country-name"
            />
          </Field>
        </div>

        <label
          htmlFor="remote"
          className="flex items-center gap-2 cursor-pointer select-none text-sm text-ink w-fit"
        >
          <input
            id="remote"
            type="checkbox"
            checked={form.remote}
            onChange={(e) => update("remote", e.target.checked)}
            className="h-4 w-4 rounded border-hairline text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy"
          />
          Open to remote engagements
        </label>
      </section>

      {/* Level */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl text-ink">Level</h2>
        <div id="level">
          <RadioCardGroup
            name="level"
            options={LEVEL_OPTIONS}
            labels={LEVEL_LABELS}
            subLabels={LEVEL_YEAR_RANGE_LABELS}
            value={form.level}
            onChange={(v) => update("level", v)}
          />
        </div>
        {errors.level && (
          <p role="alert" className="text-sm text-red-700">
            {errors.level}
          </p>
        )}
      </section>

      {/* Delivery functions */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl text-ink">Delivery function(s)</h2>
        <p className="text-sm text-muted -mt-1">Select all that apply.</p>
        <div id="functions">
          <ChipGroup
            name="functions"
            options={DELIVERY_FUNCTION_OPTIONS}
            labels={DELIVERY_FUNCTION_LABELS}
            selected={form.functions}
            onToggle={(v) => update("functions", toggleInArray(form.functions, v))}
          />
        </div>
        {errors.functions && (
          <p role="alert" className="text-sm text-red-700">
            {errors.functions}
          </p>
        )}
      </section>

      {/* Skills, grouped by cluster */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl text-ink">Skills</h2>
        <p className="text-sm text-muted -mt-1">Select all that apply.</p>
        <div id="skills" className="flex flex-col gap-5">
          {Object.entries(SKILL_CLUSTERS).map(([cluster, skills]) => (
            <div key={cluster} className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-navy">{cluster}</h3>
              <ChipGroup
                name={`skills-${cluster}`}
                options={skills}
                labels={SKILL_LABELS}
                selected={form.skills}
                onToggle={(v) => update("skills", toggleInArray(form.skills, v))}
              />
            </div>
          ))}
        </div>
        {errors.skills && (
          <p role="alert" className="text-sm text-red-700">
            {errors.skills}
          </p>
        )}
      </section>

      {/* Industry experience */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl text-ink">Industry experience</h2>
        <p className="text-sm text-muted -mt-1">Select all that apply.</p>
        <div id="industries">
          <ChipGroup
            name="industries"
            options={INDUSTRY_OPTIONS}
            labels={INDUSTRY_LABELS}
            selected={form.industries}
            onToggle={(v) => update("industries", toggleInArray(form.industries, v))}
          />
        </div>
        {errors.industries && (
          <p role="alert" className="text-sm text-red-700">
            {errors.industries}
          </p>
        )}
      </section>

      {/* Anything else */}
      <section className="flex flex-col gap-3">
        <Field label="Anything else" htmlFor="additionalNotes" optional>
          <TextArea
            id="additionalNotes"
            value={form.additionalNotes}
            onChange={(e) => update("additionalNotes", e.target.value)}
          />
        </Field>
      </section>

      {/* Qualifying questions */}
      <section className="flex flex-col gap-5">
        <h2 className="font-display text-xl text-ink">A few questions</h2>
        {QUALIFYING_QUESTIONS.map((q) => {
          const value = form[q.field] as string;
          const remaining = q.maxChars - value.length;
          return (
            <Field key={q.field} label={q.label} htmlFor={q.field} error={errors[q.field]}>
              <TextArea
                id={q.field}
                error={errors[q.field]}
                value={value}
                maxLength={q.maxChars}
                onChange={(e) => update(q.field, e.target.value as never)}
              />
              <p className="mt-1 text-xs text-muted text-right">
                {remaining} characters left
              </p>
            </Field>
          );
        })}
      </section>

      {/* CV upload */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl text-ink">CV</h2>
        <div id="cv">
          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor="cvFile"
              className="inline-flex items-center justify-center rounded-md border border-navy px-4 py-2 text-sm font-medium text-navy cursor-pointer transition-colors hover:bg-navy hover:text-white focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-navy"
            >
              Upload CV
              <input
                ref={fileInputRef}
                id="cvFile"
                type="file"
                accept=".pdf,.doc,.docx"
                className="sr-only"
                onChange={(e) => handleCvChange(e.target.files?.[0] ?? null)}
                aria-invalid={!!errors.cv}
                aria-describedby={errors.cv ? "cv-error" : undefined}
              />
            </label>
            {cvFile && (
              <span className="flex items-center gap-2 text-sm text-ink">
                {cvFile.name}
                <button
                  type="button"
                  onClick={clearCv}
                  className="text-muted hover:text-red-700 underline underline-offset-2"
                >
                  Clear
                </button>
              </span>
            )}
          </div>
          <p className="text-xs text-muted mt-2">
            PDF, DOC, or DOCX. Max 10MB.
          </p>
        </div>
        {errors.cv && (
          <p id="cv-error" role="alert" className="text-sm text-red-700">
            {errors.cv}
          </p>
        )}
      </section>

      {status === "error" && submitError && (
        <p role="alert" className="text-sm text-red-700">
          {submitError}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={status === "submitting"}
          className="inline-flex items-center justify-center rounded-md bg-navy px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-navy-deep disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {status === "submitting" ? "Submitting…" : "Submit Application"}
        </button>
      </div>
    </form>
  );
}
