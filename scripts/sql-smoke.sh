#!/usr/bin/env bash
# Applies every migration to a disposable local Postgres, proves each rollback restores the schema
# that preceded its migration, then runs every smoke suite. Touches no hosted database.
# Needs PostgreSQL server binaries; set PG_BIN if they are not under /usr/lib/postgresql/*/bin.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BIN="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
[ -x "$BIN/initdb" ] || { echo "PostgreSQL server binaries not found; set PG_BIN." >&2; exit 2; }
WORK="$(mktemp -d)"; PORT="${PG_PORT:-54331}"
if [ "$(id -u)" = 0 ]; then chown postgres "$WORK"; as_pg() { su postgres -c "$*"; }; else as_pg() { bash -c "$*"; }; fi
cleanup() { as_pg "$BIN/pg_ctl -D $WORK/data -m immediate stop" >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT
as_pg "$BIN/initdb -D $WORK/data -A trust -U postgres -E UTF8 --locale=C" >/dev/null
as_pg "$BIN/pg_ctl -D $WORK/data -o '-p $PORT -k $WORK -c listen_addresses=' -l $WORK/server.log -w start" >/dev/null
run() { "$BIN/psql" -h "$WORK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -f "$1" >/dev/null; }
dump() { "$BIN/pg_dump" -h "$WORK" -p "$PORT" -U postgres -d postgres --schema-only --no-owner | grep -v '^\\\(un\)\?restrict' > "$1"; }
run "$ROOT/supabase/tests/fixtures/hosted_baseline.sql"
for migration in $(ls "$ROOT"/supabase/migrations/*.sql | sort); do
  name="$(basename "$migration")"; rollback="$ROOT/supabase/rollbacks/$name"
  if [ -f "$rollback" ]; then dump "$WORK/before.sql"; fi
  run "$migration"; echo "applied   $name"
  if [ -f "$rollback" ]; then
    run "$rollback"; dump "$WORK/after.sql"
    diff -q "$WORK/before.sql" "$WORK/after.sql" >/dev/null || { echo "ROLLBACK DOES NOT RESTORE THE PRIOR SCHEMA: $name" >&2; exit 1; }
    run "$migration"; echo "rollback  $name restores the prior schema; migration re-applied"
  fi
done
for suite in $(ls "$ROOT"/supabase/tests/*.sql | sort); do run "$suite"; echo "passed    $(basename "$suite")"; done
