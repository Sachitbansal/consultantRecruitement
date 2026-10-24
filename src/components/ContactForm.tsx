"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { contact } from "@/lib/gop-content";

type FieldErrors = Record<string, string>;
type ContactValues = Record<string, string>;

// Next API route on the same origin. This replaced /gop/contact.php when the
// site moved off the cPanel shared host onto its own Node server.
const ENDPOINT = "/api/contact";

function post(payload: ContactValues): Promise<Response> {
  return fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(payload),
  });
}

type ContactResponse = {
  ok?: boolean;
  error?: string;
  fieldErrors?: FieldErrors;
};

/**
 * The endpoint answers JSON, but the filters in front of it answer HTML, so
 * response.json() would throw on exactly the failures worth reporting.
 */
async function readJson(response: Response): Promise<ContactResponse | null> {
  const text = await response.text();
  try {
    return JSON.parse(text) as ContactResponse;
  } catch {
    return null;
  }
}

const PERSONAS = contact.personas.map((p) => p.value);

/** Mirrors the server rules in /api/contact so mistakes surface before a round trip. */
function validate(values: Record<string, string>): FieldErrors {
  const errors: FieldErrors = {};

  const name = values.name.trim();
  if (!name) errors.name = "Please enter your name";
  else if (name.length < 2) errors.name = "That name looks too short";
  else if (!/\p{L}/u.test(name)) errors.name = "Please enter a real name";

  const company = values.company.trim();
  if (!company) errors.company = "Please enter your organisation";
  else if (company.length < 2) errors.company = "That organisation name looks too short";

  if (values.role.trim().length > 120) errors.role = "That role is too long";

  if (!PERSONAS.includes(values.persona)) errors.persona = "Please tell us who you are";

  if (!(contact.topics as string[]).includes(values.topic))
    errors.topic = "Please choose what you would like to discuss";

  const email = values.email.trim();
  if (!email) errors.email = "Please enter your email address";
  else if (!/^[^\s@]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/.test(email))
    errors.email = "Please use a full email address, e.g. name@company.com";

  const phone = values.phone.trim();
  // Optional, but if given it has to be plausibly dialable.
  if (phone && !/^[+()\d][\d\s()+-]{6,19}$/.test(phone))
    errors.phone = "That phone number does not look right";

  if (values.message.trim().length > 5000)
    errors.message = "Please keep it under 5000 characters";

  if (values.consent !== "yes")
    errors.consent = "Please confirm you have read the privacy policy";

  return errors;
}

export default function ContactForm() {
  const uid = useId();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [sending, setSending] = useState(false);
  const router = useRouter();
  const personaRef = useRef<HTMLSelectElement>(null);

  // Audience CTAs link here as /contact/?i=investor and so on; preselect it.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("i");
    if (wanted && PERSONAS.includes(wanted) && personaRef.current)
      personaRef.current.value = wanted;
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;

    const values = {
      name: data.name ?? "",
      company: data.company ?? "",
      role: data.role ?? "",
      email: data.email ?? "",
      phone: data.phone ?? "",
      persona: data.persona ?? "",
      topic: data.topic ?? "",
      revenue: data.revenue ?? "",
      message: data.message ?? "",
      consent: data.consent ?? "",
      website: data.website ?? "", // honeypot
    };

    const found = validate(values);
    setErrors(found);
    setFormError("");
    if (Object.keys(found).length) {
      form
        .querySelector<HTMLElement>(
          '[data-invalid="true"] input, [data-invalid="true"] select, [data-invalid="true"] textarea',
        )
        ?.focus();
      return;
    }

    setSending(true);
    setBlocked(false);
    try {
      const res = await post(values);
      const payload = await readJson(res);

      if (!res.ok || !payload?.ok) {
        if (payload?.fieldErrors) setErrors(payload.fieldErrors);

        // 409/406 mean a filter in front of the endpoint rejected the request,
        // not that anything is wrong with what was typed. Offer the mailto
        // route so a blocked visitor is not left at a dead end.
        if (res.status === 409 || res.status === 406) {
          setBlocked(true);
          setFormError("Our server blocked this submission.");
        } else {
          setFormError(
            payload?.error ??
              "Could not send your message. Please try again shortly.",
          );
        }
        return;
      }
      // The thanks page is noindex and doubles as the conversion URL for
      // analytics, so success always lands there rather than swapping in a
      // message.
      form.reset();
      router.push("/contact/thanks/");
      return;
    } catch {
      setBlocked(true);
      setFormError(
        "Could not reach the server. Check your connection and try again.",
      );
    } finally {
      setSending(false);
    }
  }

  const field = (name: string) => ({
    className: "field",
    "data-invalid": errors[name] ? "true" : undefined,
  });

  const control = (name: string) => ({
    id: `${uid}-${name}`,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${uid}-${name}-err` : undefined,
  });

  const errorFor = (name: string) =>
    errors[name] ? (
      <span className="field-error" id={`${uid}-${name}-err`}>
        {errors[name]}
      </span>
    ) : null;

  return (
    <form className="enq" onSubmit={onSubmit} noValidate>
      {formError && (
        <p className="form-alert" role="alert">
          {formError}
          {blocked && (
            <>
              {" "}
              Please email us directly at{" "}
              <a href={`mailto:${contact.email}`}>{contact.email}</a> and
              we&rsquo;ll pick it up from there.
            </>
          )}
        </p>
      )}

      <div className="form-row">
        <div {...field("name")}>
          <label htmlFor={`${uid}-name`}>Full name</label>
          <input {...control("name")} type="text" autoComplete="name" required />
          {errorFor("name")}
        </div>
        <div {...field("email")}>
          <label htmlFor={`${uid}-email`}>Business email</label>
          <input {...control("email")} type="email" autoComplete="email" required />
          {errorFor("email")}
        </div>
      </div>

      <div className="form-row">
        <div {...field("company")}>
          <label htmlFor={`${uid}-company`}>Organisation</label>
          <input
            {...control("company")}
            type="text"
            autoComplete="organization"
            required
          />
          {errorFor("company")}
        </div>
        <div {...field("role")}>
          <label htmlFor={`${uid}-role`}>
            Role <span className="optional">(optional)</span>
          </label>
          <input {...control("role")} type="text" autoComplete="organization-title" />
          {errorFor("role")}
        </div>
      </div>

      <div className="form-row">
        <div {...field("persona")}>
          <label htmlFor={`${uid}-persona`}>I am a</label>
          <select {...control("persona")} ref={personaRef} defaultValue="" required>
            <option value="">Select one</option>
            {contact.personas.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errorFor("persona")}
        </div>
        <div {...field("phone")}>
          <label htmlFor={`${uid}-phone`}>
            Phone <span className="optional">(optional)</span>
          </label>
          <input {...control("phone")} type="tel" autoComplete="tel" />
          {errorFor("phone")}
        </div>
      </div>

      <div className="form-row">
        <div {...field("topic")}>
          <label htmlFor={`${uid}-topic`}>What would you like to discuss?</label>
          <select {...control("topic")} defaultValue="" required>
            <option value="">Select a topic</option>
            {contact.topics.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errorFor("topic")}
        </div>
        <div {...field("revenue")}>
          <label htmlFor={`${uid}-revenue`}>
            Business revenue band <span className="optional">(optional)</span>
          </label>
          <select {...control("revenue")} defaultValue="">
            <option value="">Select a range</option>
            {contact.revenueOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errorFor("revenue")}
        </div>
      </div>

      <div {...field("message")}>
        <label htmlFor={`${uid}-message`}>
          Additional context <span className="optional">(optional)</span>
        </label>
        <textarea {...control("message")} rows={4} />
        {errorFor("message")}
      </div>

      <div {...field("consent")}>
        <label className="check" htmlFor={`${uid}-consent`}>
          <input {...control("consent")} type="checkbox" value="yes" required />{" "}
          I have read the <a href="/privacy-policy/">privacy policy</a> and agree to
          GOP using these details to respond to my enquiry.
        </label>
        {errorFor("consent")}
      </div>

      {/* Bait for form-filling bots. Real visitors never see or tab into it. */}
      <div className="hp" aria-hidden="true">
        <label htmlFor={`${uid}-website`}>Website</label>
        <input
          id={`${uid}-website`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <button type="submit" disabled={sending}>
        {sending ? "Sending…" : contact.submitLabel}
      </button>

      <p className="form-note">
        Please do not include confidential financial documents or data in this form.
      </p>
    </form>
  );
}
