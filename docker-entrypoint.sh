#!/bin/sh
# Runs once per container start, before the Next.js server boots.
#
# `prisma migrate deploy` (NOT `migrate dev`, NOT `db push`) applies any
# migrations in prisma/migrations/ that haven't been applied to the target
# database yet, and is safe to run every time the container starts —
# it's a no-op if the DB is already up to date. This is the standard,
# recommended approach for running Prisma migrations in a production
# container: it requires no interactive input and doesn't try to generate
# new migrations, so a stale/incomplete migration can never be created by
# accident on a live server.
set -e

echo "[entrypoint] Applying database migrations (prisma migrate deploy)..."
./node_modules/.bin/prisma migrate deploy
echo "[entrypoint] Migrations up to date. Starting application..."

exec "$@"
