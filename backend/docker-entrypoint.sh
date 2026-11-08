#!/bin/sh
set -e
echo "==> prisma migrate deploy"
npx prisma migrate deploy
if [ "${SEED_ON_BOOT:-false}" = "true" ]; then
  echo "==> seed"
  node dist-seed/seed.js || echo "seed omitido (ya aplicado o sin datos)"
fi
echo "==> start"
exec node dist/main
