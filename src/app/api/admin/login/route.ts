import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isSessionSecretConfigured, setSessionCookie } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Node runtime required (bcrypt, Prisma).
export const runtime = "nodejs";

// Generic error message on every failure path below — never reveal whether
// the email exists, whether the password was wrong, or whether the server
// is misconfigured. All of those collapse to the same 401/500 response body
// so a client can't distinguish them.
const GENERIC_AUTH_ERROR = "Invalid email or password.";

const loginSchema = z.object({
  email: z.string().trim().min(1).max(320).email(),
  password: z.string().min(1).max(200),
});

// 10 attempts per 10 minutes per IP. Single-server in-memory limiter — see
// src/lib/rate-limit.ts for the documented limitation (does not share state
// across multiple app replicas).
const LOGIN_RATE_LIMIT = 10;
const LOGIN_RATE_WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`login:${ip}`, LOGIN_RATE_LIMIT, LOGIN_RATE_WINDOW_MS);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  if (!isSessionSecretConfigured()) {
    // Fail closed: never authenticate with an unconfigured/placeholder
    // secret. Logged server-side only; client sees a generic message.
    console.error("[admin:login] SESSION_SECRET is missing or placeholder; refusing auth.");
    return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
  }
  const { email, password } = parsed.data;

  try {
    const admin = await prisma.adminUser.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, passwordHash: true },
    });

    // Always run a bcrypt compare, even when no user is found, using a
    // fixed dummy hash — keeps response timing close between "no such
    // user" and "wrong password" so login can't be used to enumerate
    // admin emails via a timing side channel.
    const DUMMY_HASH = "$2b$10$CwTycUXWue0Thq9StjUM0uJ8Q8lXe5vfk3lqK1v.b1O1I5.6q9J3.";
    const hashToCompare = admin?.passwordHash ?? DUMMY_HASH;
    const passwordMatches = await bcrypt.compare(password, hashToCompare);

    if (!admin || !passwordMatches) {
      return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
    }

    await setSessionCookie({ adminId: admin.id, email: admin.email });

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    return NextResponse.json({ email: admin.email }, { status: 200 });
  } catch (err) {
    console.error("[admin:login] unexpected error", {
      message: err instanceof Error ? err.message : "unknown error",
    });
    return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
