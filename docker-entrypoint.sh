#!/bin/sh
set -eu

echo "[entrypoint] Starting PayrollPilot API..."

if [ -z "${DATABASE_URL:-}" ] && [ -n "${DATABASE_HOST:-}" ] && [ -n "${DATABASE_USER:-}" ] && [ -n "${DATABASE_NAME:-}" ]; then
  DATABASE_PASSWORD="${DATABASE_PASSWORD:-}"
  export DATABASE_URL="postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT:-5432}/${DATABASE_NAME}"
  echo "[entrypoint] Built DATABASE_URL from DATABASE_HOST/USER/NAME."
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[entrypoint] ERROR: DATABASE_URL (or DATABASE_HOST + DATABASE_USER + DATABASE_NAME) is not set." >&2
  exit 1
fi

if [ "${SKIP_DB_MIGRATE:-0}" != "1" ]; then
  echo "[entrypoint] Running prisma migrate deploy..."
  npx prisma migrate deploy
  echo "[entrypoint] Migrations complete."
else
  echo "[entrypoint] Skipping migrations (SKIP_DB_MIGRATE=1)."
fi

echo "[entrypoint] Starting Node server on port ${PORT:-8000}..."
exec node dist/src/server.js
