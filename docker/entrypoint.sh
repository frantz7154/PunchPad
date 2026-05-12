#!/bin/sh
set -e
echo "[entrypoint] running prisma migrate deploy"
node_modules/.bin/prisma migrate deploy
echo "[entrypoint] seeding (idempotent)"
node_modules/.bin/prisma db seed || true
echo "[entrypoint] starting app"
exec "$@"
