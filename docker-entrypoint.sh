#!/bin/sh
set -eu

if [ "${SKIP_DB_MIGRATE:-0}" != "1" ]; then
  echo "Running prisma migrate deploy..."
  npx prisma migrate deploy
fi

exec node dist/src/server.js
