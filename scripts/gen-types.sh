#!/usr/bin/env bash
# Regenerate packages/db-types from the database schema.
#   bash scripts/gen-types.sh          # from staging (needs `npx supabase login`)
#   bash scripts/gen-types.sh --local  # from the local stack (needs `supabase start`)
# Run after every migration that is applied to staging (definition of done).
set -euo pipefail

cd "$(dirname "$0")/.."
OUT=packages/db-types/src/database.ts
REF="${SUPABASE_PROJECT_REF:-bcwenlnhakibibdwzyok}" # staging project ref (not a secret)

if [ "${1:-}" = "--local" ]; then
  npx supabase gen types typescript --local --schema public > "$OUT.tmp"
else
  npx supabase gen types typescript --project-id "$REF" --schema public > "$OUT.tmp"
fi

mv "$OUT.tmp" "$OUT"
npx prettier --write "$OUT" > /dev/null
echo "Wrote $OUT"
