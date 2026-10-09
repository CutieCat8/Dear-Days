#!/usr/bin/env bash
# Applies supabase/migrations to a throw-away Postgres 15 container (with minimal auth/storage stand-ins from
# supabase/tests/bootstrap.sql) and runs supabase/tests/tests.sql plus a concurrent-join test.
# Needs Docker. Never touches a remote project.
set -euo pipefail

cd "$(dirname "$0")/.."
NAME=dear-days-db-test
PSQL=(docker exec -i "$NAME" psql -U postgres -v ON_ERROR_STOP=1 -q)

docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=postgres postgres:15-alpine >/dev/null
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT

echo "waiting for Postgres..."
for _ in $(seq 1 60); do
  if docker exec "$NAME" pg_isready -U postgres >/dev/null 2>&1 && "${PSQL[@]}" -c "select 1" >/dev/null 2>&1; then break; fi
  sleep 1
done

echo "bootstrap (auth/storage stand-ins)"
"${PSQL[@]}" < supabase/tests/bootstrap.sql
for f in supabase/migrations/*.sql; do
  echo "apply $f"
  "${PSQL[@]}" < "$f"
done

echo "run tests"
"${PSQL[@]}" < supabase/tests/tests.sql

echo "concurrent joins (3 people race for the 1 free seat)"
"${PSQL[@]}" <<'SQL'
insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-0000000000b1', 'c-owner@example.com'),
  ('10000000-0000-4000-8000-0000000000b2', 'c-1@example.com'),
  ('10000000-0000-4000-8000-0000000000b3', 'c-2@example.com'),
  ('10000000-0000-4000-8000-0000000000b4', 'c-3@example.com');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-0000000000b1', false);
set role authenticated;
select public.create_room('Race', 'now', 'sunrise');
SQL
CODE=$("${PSQL[@]}" -At -c "select invite_code from public.rooms where name = 'Race'")
START=$(( $(date +%s) + 4 ))
OUT=$(mktemp -d)
for n in 2 3 4; do
  docker exec -i "$NAME" psql -U postgres -At -c "
    select pg_sleep(greatest(0, extract(epoch from (to_timestamp($START) - clock_timestamp()))));
    select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-0000000000b$n', true);
    set local role authenticated;
    select public.join_room('$CODE');" > "$OUT/$n.out" 2>&1 &
done
wait
OK=$(grep -L 'ROOM_FULL' "$OUT"/*.out | wc -l | tr -d ' ')
FULL=$(grep -l 'ROOM_FULL' "$OUT"/*.out | wc -l | tr -d ' ')
MEMBERS=$("${PSQL[@]}" -At -c "select count(*) from public.room_members m join public.rooms r on r.id = m.room_id where r.name = 'Race'")
echo "joined=$OK rejected=$FULL members=$MEMBERS"
if [ "$OK" != "1" ] || [ "$FULL" != "2" ] || [ "$MEMBERS" != "2" ]; then
  echo "FAILED: expected exactly one successful join and two ROOM_FULL"; cat "$OUT"/*.out; exit 1
fi
echo "ALL DATABASE TESTS PASSED (including concurrent joins)"
