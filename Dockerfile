# syntax=docker/dockerfile:1
#
# Multi-stage build for the GOP Consultant Recruitment Portal (Next.js 14 +
# Prisma 5). Self-hosted target: this image is run by docker-compose.yml on
# the client's own server, not on any managed/serverless platform.
#
# Base: node:22-alpine (Node 22 LTS "Jod"). Chosen over 20 because it's the
# current LTS with the longest runway from today, and alpine keeps the final
# image small. `openssl` + `libc6-compat` are installed because Prisma's
# query engine binaries need OpenSSL at runtime and some native npm deps
# need glibc compatibility shims on musl.

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl

# ---------------------------------------------------------------------------
# deps: install ALL dependencies (including devDependencies) with a clean,
# reproducible `npm ci`. devDependencies are needed in the next stage to run
# `next build` (typescript, tailwind, etc.) and `prisma generate`.
# ---------------------------------------------------------------------------
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------------------
# builder: generate the Prisma client (must happen on the SAME alpine/musl
# base as the runtime image, so the downloaded query-engine binary matches
# the OS the app will actually run on), build the Next.js standalone
# output, then prune devDependencies out of node_modules.
#
# IMPORTANT: `prisma` (the CLI) was moved from devDependencies to
# dependencies in package.json specifically so it survives `npm prune
# --omit=dev` below — it's needed at container startup to run
# `prisma migrate deploy` (see docker-entrypoint.sh).
# ---------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

# ---------------------------------------------------------------------------
# runner: minimal production image, runs as a non-root user.
#
# Next.js `output: 'standalone'` traces only the JS files it can see being
# required and copies a pruned node_modules into .next/standalone itself.
# That trace is known to miss Prisma's native query-engine binary because
# it's resolved at runtime via a computed path, not a static require().
# To avoid shipping an image that builds fine but crashes on the first
# Prisma query, we deliberately overlay the FULL pruned (prod-only)
# node_modules from the builder stage on top of the standalone output,
# which is verified (see deploy verification) to contain the generated
# .prisma/client engine files. This costs some image size but guarantees
# correctness for a self-hosted single-server deployment.
# ---------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs \
  && adduser -S nextjs -u 1001 -G nodejs

COPY --from=builder /app/public ./public

# Next.js standalone server + its own (partial) node_modules.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Overlay the full, pruned production node_modules (includes prisma CLI,
# @prisma/client, and the generated .prisma/client query-engine binaries)
# on top of the standalone trace's node_modules, to guarantee nothing is
# missing at runtime.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Needed at runtime by `prisma migrate deploy` (schema + migration files).
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh \
  && mkdir -p /app/uploads \
  && chown -R nextjs:nodejs /app/uploads

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
