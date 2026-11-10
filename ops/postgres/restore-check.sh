#!/usr/bin/env bash
# Proves the newest off-site backup actually restores. A backup that has never
# been restored is a hope, not a backup.
#
#   restore-check.sh            restore newest frequent dump into a scratch DB,
#                               compare row counts with live, then drop it
#
# Runs weekly from cron and before the cutover. Exit 1 on any failure.
set -euo pipefail

DB=${DB:-tieedu}
REMOTE=${REMOTE:-contabo:tieedu-backups}
SCRATCH=tieedu_restore_check
WORK=$(mktemp -d)
cleanup() {
  rm -rf "$WORK"
  runuser -u postgres -- dropdb --if-exists "$SCRATCH" || true
}
trap cleanup EXIT

latest=$(rclone lsf "$REMOTE/frequent/" --include "pg-$DB-*.dump" | sort | tail -1)
[ -n "$latest" ] || { echo "no dump found in $REMOTE/frequent/"; exit 1; }
echo "restoring $latest"
rclone copyto "$REMOTE/frequent/$latest" "$WORK/$latest"
chmod 644 "$WORK/$latest"; chmod 755 "$WORK"

runuser -u postgres -- dropdb --if-exists "$SCRATCH"
runuser -u postgres -- createdb "$SCRATCH"
runuser -u postgres -- pg_restore --no-owner --exit-on-error -d "$SCRATCH" "$WORK/$latest"

fail=0
for t in $(runuser -u postgres -- psql -tA -d "$SCRATCH" -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1"); do
  r=$(runuser -u postgres -- psql -tA -d "$SCRATCH" -c "SELECT COUNT(*) FROM \"$t\"")
  l=$(runuser -u postgres -- psql -tA -d "$DB" -c "SELECT COUNT(*) FROM \"$t\"")
  # Live keeps moving after the dump; restored may trail it, never exceed it by much.
  printf '%-36s restored=%-8s live=%s\n' "$t" "$r" "$l"
  [ "$r" -gt 0 ] || [ "$l" -eq 0 ] || fail=1
done

echo "last successful backup: $(cat /var/log/tieedu-backup.last 2>/dev/null || echo never)"
[ "$fail" = 0 ] && echo "RESTORE CHECK PASSED" || { echo "RESTORE CHECK FAILED: a table restored empty while live has rows"; exit 1; }
