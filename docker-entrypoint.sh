#!/bin/sh
set -eu

echo "[entrypoint] Starting PayrollPilot API..."

if [ "${SKIP_DB_MIGRATE:-0}" != "1" ]; then
  echo "[entrypoint] Running prisma migrate deploy..."
  npx prisma migrate deploy
  echo "[entrypoint] Migrations complete."
else
  echo "[entrypoint] Skipping migrations (SKIP_DB_MIGRATE=1)."
fi

echo "[entrypoint] Starting Node server on port ${PORT:-8000}..."
exec node dist/src/server.js
