#!/usr/bin/env node
/**
 * Admin bootstrap seed script.
 *
 * Plain Node ESM (not TypeScript) on purpose: it only depends on
 * `@prisma/client` and `bcryptjs`, both production dependencies that
 * survive the Dockerfile's `npm prune --omit=dev` step, so this script
 * runs unmodified both on a dev machine (`npm run seed:admin`) and inside
 * the built production container — no ts-node/tsx needed at runtime.
 *
 * Usage (locally):
 *   npm run seed:admin -- --email admin@client.com --password 'S0me$trongPassw0rd!' --name "Jane Doe"
 *
 * Usage (inside the running Docker container — RECOMMENDED for production,
 * so the real password never has to live in docker-compose.yml or a
 * long-lived container env var, only as a one-off exec arg).
 *
 * The production image's runner stage only copies the specific
 * directories it needs to run the built app (see Dockerfile) and does not
 * include `scripts/` — that is intentional; this script is an
 * operator/setup-time tool, not something the running app depends on, and
 * the Dockerfile is not to be modified just to bake it in. Copy it into
 * the already-running container with `docker compose cp`, then exec it.
 * The container runs as a non-root user that cannot create new directories
 * under /app (only /app/uploads is writable at runtime), so copy the file
 * directly to /app (not a new subdirectory):
 *
 *   docker compose cp scripts/seed-admin.mjs app:/app/seed-admin.mjs
 *   docker compose exec app node /app/seed-admin.mjs \
 *     --email admin@client.com --password 'S0me$trongPassw0rd!' --name "Jane Doe"
 *
 * (node_modules in the container already has @prisma/client + bcryptjs —
 * both are production dependencies — so no extra install step is needed.)
 *
 * Falls back to ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD /
 * ADMIN_BOOTSTRAP_NAME env vars when a flag isn't passed, but CLI args
 * always take precedence.
 *
 * Idempotent: if an admin with the given email already exists, the script
 * UPDATES the password/name (re-hashing) instead of crashing on the unique
 * email constraint, and prints "updated" vs "created" so re-runs are safe.
 *
 * Refuses to run with a weak/placeholder password:
 *   - the literal .env.example placeholder value
 *   - anything matching /^change_me/i
 *   - anything shorter than 12 characters
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PLACEHOLDER_PASSWORD = "change_me_to_a_strong_password";
const MIN_PASSWORD_LENGTH = 12;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      out[key] = next;
      i++;
    } else {
      out[key] = "true";
    }
  }
  return out;
}

function isWeakPassword(password) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password === PLACEHOLDER_PASSWORD) {
    return "Refusing to seed an admin with the .env.example placeholder password. Set a real password.";
  }
  if (/^change_me/i.test(password)) {
    return "Refusing to seed an admin with a 'change_me*' placeholder password. Set a real password.";
  }
  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const email = (args.email ?? process.env.ADMIN_BOOTSTRAP_EMAIL ?? "").trim().toLowerCase();
  const password = args.password ?? process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "";
  const name = args.name ?? process.env.ADMIN_BOOTSTRAP_NAME ?? undefined;

  if (!email || !email.includes("@")) {
    console.error("[seed:admin] A valid --email (or ADMIN_BOOTSTRAP_EMAIL) is required.");
    process.exitCode = 1;
    return;
  }

  const weakness = isWeakPassword(password);
  if (weakness) {
    console.error(`[seed:admin] ${weakness}`);
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.adminUser.findUnique({ where: { email } });

  if (existing) {
    await prisma.adminUser.update({
      where: { email },
      data: { passwordHash, ...(name ? { name } : {}) },
    });
    console.log(`[seed:admin] Admin user already existed for ${email} — password updated.`);
  } else {
    await prisma.adminUser.create({
      data: { email, passwordHash, name: name ?? null },
    });
    console.log(`[seed:admin] Admin user created for ${email}.`);
  }
}

main()
  .catch((err) => {
    console.error("[seed:admin] Unexpected error:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
