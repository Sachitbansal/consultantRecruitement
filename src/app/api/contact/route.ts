import { NextRequest, NextResponse } from "next/server";
import { promises as dns } from "node:dns";
import nodemailer from "nodemailer";
import { z } from "zod";
import { contact } from "@/lib/gop-content";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Node runtime: needs DNS lookups and an SMTP socket. Never edge.
export const runtime = "nodejs";

/**
 * Contact enquiry handler for the landing page.
 *
 * This is a port of the old php/contact.php that ran on the cPanel shared host
 * (sbssdigital.com/gop). The site now runs on a Node server behind nginx, so
 * PHP and PHPMailer are gone — but every rule the PHP version enforced is
 * reproduced here: origin guard, per-IP rate limit, honeypot, field validation,
 * email-domain DNS check, header-injection stripping, and the acknowledgement
 * mail that deliberately never echoes the visitor's message back.
 *
 * The BitNinja 409 cookie-challenge workaround the old client needed is NOT
 * ported: that filter belongs to the shared host, which no longer serves this
 * form.
 */

const SMTP_HOST = process.env.SMTP_HOST ?? "mail.sbssdigital.com";
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 465);
const SMTP_USER = process.env.SMTP_USER ?? "noreply@sbssdigital.com";
const SMTP_PASS = process.env.SMTP_PASS ?? "";
const FROM_EMAIL = process.env.CONTACT_FROM_EMAIL ?? "noreply@sbssdigital.com";
const FROM_NAME = process.env.CONTACT_FROM_NAME ?? "Growth Operating Partners";
const TO_EMAIL = process.env.CONTACT_TO_EMAIL ?? "avneesh.bansal@sbssdigital.com";
const TO_NAME = process.env.CONTACT_TO_NAME ?? "Avneesh Bansal";
const SEND_ACK = (process.env.CONTACT_SEND_ACK ?? "true") !== "false";
const VERIFY_EMAIL_DOMAIN =
  (process.env.CONTACT_VERIFY_EMAIL_DOMAIN ?? "true") !== "false";

// Scheme + host only, no path. Both the apex and any www variant must be
// listed or submits break on whichever one is in the address bar.
const ALLOWED_ORIGINS = (
  process.env.CONTACT_ALLOWED_ORIGINS ?? "https://gop.sbssdigital.com"
)
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const RATE_LIMIT = Number(process.env.CONTACT_RATE_LIMIT ?? 5);
const RATE_WINDOW_MS = Number(process.env.CONTACT_RATE_WINDOW_SEC ?? 900) * 1000;

/** Strip control characters, then trim — same normalisation as PHP's field(). */
function clean(value: unknown): string {
  if (typeof value !== "string") return "";
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
}

/** Strip CR/LF so user input can never inject extra mail headers. */
function headerSafe(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const enquirySchema = z.object({
  name: z
    .string()
    .min(1, "Please enter your name")
    .min(2, "That name looks too short")
    .max(120, "That name is too long")
    // Digits or punctuation alone is never a real name.
    .regex(/\p{L}/u, "Please enter a real name"),
  company: z
    .string()
    .min(1, "Please enter your company name")
    .min(2, "That company name looks too short")
    .max(160, "That company name is too long"),
  email: z
    .string()
    .min(1, "Please enter your email address")
    .max(200, "That email address is too long")
    .email("That does not look like a valid email address")
    // zod's .email() accepts user@localhost; require a dotted domain + real TLD.
    .regex(
      /@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/,
      "Please use a full email address, e.g. name@company.com",
    ),
  phone: z
    .string()
    .regex(/^[+()\d][\d\s()+-]{6,19}$/, "That phone number does not look right")
    .or(z.literal("")),
  // Whitelisted so the dropdown cannot smuggle arbitrary text into the email.
  revenue: z
    .string()
    .refine(
      (v) => v === "" || (contact.revenueOptions as string[]).includes(v),
      "Please choose one of the listed ranges",
    ),
  message: z.string().max(5000, "Please keep it under 5000 characters"),
  // Honeypot. Named 'website' rather than 'company', which is a real field.
  website: z.string(),
});

/**
 * Confirms the address is on a domain that can actually receive mail. MX is
 * the right record, but plenty of small domains accept mail on their A record
 * alone, so both count. Returns true when DNS is unavailable — refusing real
 * visitors because a resolver hiccuped is the worse failure.
 */
async function emailDomainDeliverable(email: string): Promise<boolean> {
  const domain = email.slice(email.lastIndexOf("@") + 1);
  if (!domain) return false;
  const lookups: Promise<unknown>[] = [
    dns.resolveMx(domain),
    dns.resolve4(domain),
    dns.resolve6(domain),
  ];
  const results = await Promise.allSettled(lookups);
  if (results.some((r) => r.status === "fulfilled")) return true;
  // Distinguish "domain does not exist" from "resolver failed": only the
  // former should reject the visitor.
  const definitivelyMissing = results.every(
    (r) =>
      r.status === "rejected" &&
      ["ENOTFOUND", "ENODATA"].includes(
        (r.reason as NodeJS.ErrnoException)?.code ?? "",
      ),
  );
  return !definitivelyMissing;
}

function smtpTransport() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    // 465 = implicit TLS, 587 = STARTTLS.
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
  });
}

export async function POST(req: NextRequest) {
  // Same-origin guard. Browsers always send Origin on cross-origin POSTs, so a
  // mismatch means the request did not come from our own page. An absent
  // Origin (curl, same-origin form post) is allowed, matching the PHP version.
  const origin = (req.headers.get("origin") ?? "").replace(/\/+$/, "");
  if (origin && ALLOWED_ORIGINS.length && !ALLOWED_ORIGINS.includes(origin)) {
    console.warn("[contact] blocked origin");
    return NextResponse.json(
      { ok: false, error: "Request blocked." },
      { status: 403 },
    );
  }

  const ip = getClientIp(req);
  const rl = checkRateLimit(`contact:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "Too many messages from this connection. Try again later.",
      },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 400 },
    );
  }

  const raw = {
    name: clean(body.name),
    company: clean(body.company),
    email: clean(body.email),
    phone: clean(body.phone),
    revenue: clean(body.revenue),
    message: clean(body.message),
    website: clean(body.website),
  };

  const parsed = enquirySchema.safeParse(raw);
  const fieldErrors: Record<string, string> = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] ? String(issue.path[0]) : "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
  }

  if (
    !fieldErrors.email &&
    VERIFY_EMAIL_DOMAIN &&
    !(await emailDomainDeliverable(raw.email))
  ) {
    fieldErrors.email =
      "That email domain does not seem to exist. Please check the spelling.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Please check the highlighted fields.",
        fieldErrors,
      },
      { status: 400 },
    );
  }

  // Honeypot tripped: accept silently so the bot learns nothing.
  if (raw.website !== "") {
    return NextResponse.json({ ok: true });
  }

  const safeName = headerSafe(raw.name);
  const safeCompany = headerSafe(raw.company);
  const safeEmail = headerSafe(raw.email);

  const rows: Record<string, string> = {
    Name: safeName,
    Company: safeCompany,
    Email: safeEmail,
    Phone: raw.phone !== "" ? headerSafe(raw.phone) : "—",
    Revenue: raw.revenue !== "" ? headerSafe(raw.revenue) : "Not specified",
    IP: ip,
    Received: new Date().toISOString(),
  };

  const textRows = Object.entries(rows)
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
  const htmlRows = Object.entries(rows)
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 16px 4px 0;color:#5b6472">${escapeHtml(label)}</td>` +
        `<td style="padding:4px 0"><strong>${escapeHtml(value)}</strong></td></tr>`,
    )
    .join("");

  const messageBlock =
    raw.message !== ""
      ? `<div style="white-space:pre-wrap;padding:16px;background:#eef0f3;` +
        `border-left:3px solid #0b1f40;border-radius:4px">` +
        `${escapeHtml(raw.message).replace(/\n/g, "<br>")}</div>`
      : `<p style="color:#5b6472;font-style:italic">No message provided.</p>`;

  // Config check sits here, not at the top: field validation and the honeypot
  // must behave identically whether or not SMTP happens to be configured.
  if (!SMTP_PASS) {
    // Fail loudly in the log, vaguely in the response.
    console.error("[contact] SMTP_PASS is not set");
    return NextResponse.json(
      { ok: false, error: "The contact form is not configured yet." },
      { status: 500 },
    );
  }

  const transport = smtpTransport();

  try {
    await transport.sendMail({
      // From must stay on the authenticated domain or SPF/DKIM fails; the
      // visitor goes in Reply-To so hitting reply answers them directly.
      from: { name: FROM_NAME, address: FROM_EMAIL },
      to: { name: TO_NAME, address: TO_EMAIL },
      replyTo: { name: safeName, address: safeEmail },
      subject: `[GOP enquiry] ${safeCompany} — ${safeName}`,
      text: `${textRows}\n\n${raw.message !== "" ? raw.message : "No message provided."}`,
      html:
        `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;` +
        `font-size:15px;color:#1a2233;line-height:1.6">` +
        `<h2 style="margin:0 0 16px;font-size:17px;color:#0b1f40">New diagnostic call request</h2>` +
        `<table style="border-collapse:collapse;margin-bottom:20px">${htmlRows}</table>` +
        `${messageBlock}</div>`,
    });
  } catch (err) {
    // Never leak SMTP host, credentials or stack details to the browser.
    console.error(
      "[contact] send failed:",
      err instanceof Error ? err.message : "unknown error",
    );
    return NextResponse.json(
      {
        ok: false,
        error: "Could not send your message right now. Please try again shortly.",
      },
      { status: 502 },
    );
  }

  // Acknowledgement to the sender. Deliberately does NOT echo the visitor's
  // message back: anyone can type a stranger's address into the form, so
  // echoing arbitrary text would turn this endpoint into a way to mail
  // attacker-written content to third parties. Only the name appears, escaped.
  //
  // A failure here never fails the request — the enquiry is already delivered.
  if (SEND_ACK) {
    try {
      const escapedName = escapeHtml(safeName);
      await transport.sendMail({
        from: { name: FROM_NAME, address: FROM_EMAIL },
        to: { name: safeName, address: safeEmail },
        // Replies to the acknowledgement reach the team, not the noreply box.
        replyTo: { name: TO_NAME, address: TO_EMAIL },
        headers: {
          "Auto-Submitted": "auto-replied",
          "X-Auto-Response-Suppress": "All",
        },
        subject: "We have your enquiry — Growth Operating Partners",
        text:
          `Hello ${safeName},\n\n` +
          `Thanks for reaching out to Growth Operating Partners. Your enquiry has reached our team and is being reviewed.\n\n` +
          `We will be in touch within two business days to schedule your free diagnostic call - no pitch, no obligation.\n\n` +
          `Operator-led Growth. Investor-ready Outcomes.\n` +
          `This is an automated confirmation - no need to reply to it.`,
        html:
          `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;` +
          `font-size:15px;color:#1a2233;line-height:1.6;max-width:560px">` +
          `<p>Hello ${escapedName},</p>` +
          `<p>Thanks for reaching out to Growth Operating Partners. Your enquiry has ` +
          `reached our team and is being reviewed.</p>` +
          `<p>We will be in touch within two business days to schedule your free ` +
          `diagnostic call — no pitch, no obligation.</p>` +
          `<p style="margin-top:28px;padding-top:16px;border-top:1px solid #dce0e6;` +
          `color:#5b6472;font-size:13px">` +
          `Operator-led Growth. Investor-ready Outcomes.<br>` +
          `This is an automated confirmation — no need to reply to it.</p>` +
          `</div>`,
      });
    } catch (err) {
      console.error(
        "[contact] acknowledgement failed:",
        err instanceof Error ? err.message : "unknown error",
      );
    }
  }

  return NextResponse.json({ ok: true });
}
