#!/usr/bin/env bash
# Off-site backup to Contabo Object Storage.
#
#   backup.sh frequent   every 15 min: PostgreSQL dumps + db.json      (kept 2 days)
#   backup.sh daily      once a day:   the above + uploads + secrets   (kept 35 days)
#
# Every artefact is checked before upload (dump readable, JSON parses), and the
# run fails loudly - non-zero exit, line in the log - rather than uploading
# something that would not restore. /var/log/tieedu-backup.last holds the time
# of the last fully successful run; restore-check.sh and monitoring read it.
set -euo pipefail

KIND=${1:-frequent}
APP_DIR=${APP_DIR:-/var/www/tiedu}
DBS=${DBS:-tieedu}
REMOTE=${REMOTE:-contabo:tieedu-backups}
PASSPHRASE_FILE=${PASSPHRASE_FILE:-/root/.tieedu-backup-passphrase}
HEALTHCHECK_URL=${HEALTHCHECK_URL:-}

case "$KIND" in frequent|daily) ;; *) echo "usage: $0 frequent|daily"; exit 2;; esac

# One run at a time; a slow upload must not stack runs on top of each other.
exec 9>/run/tieedu-backup.lock
flock -n 9 || { echo "$(date -u +%FT%TZ) previous backup still running - skipped"; exit 0; }

TS=$(date -u +%Y%m%dT%H%M%SZ)
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
log() { echo "$(date -u +%FT%TZ) [$KIND] $*"; }

for db in $DBS; do
  out="$WORK/pg-$db-$TS.dump"
  # One bad database must not cost the rest of the run - db.json especially.
  # The run still exits 1 and leaves tieedu-backup.last stale, so it is noticed.
  if runuser -u postgres -- pg_dump --format=custom --compress=6 "$db" > "$out" && pg_restore --list "$out" > /dev/null; then
    log "dumped $db ($(du -h "$out" | cut -f1))"
  else
    log "ERROR: dump of $db failed - continuing with the rest"
    rm -f "$out"
    FAILED=1
  fi
done

# db.json is replaced by atomic rename, so a plain copy is a complete file.
cp "$APP_DIR/backend/data/db.json" "$WORK/db-$TS.json"
python3 -c 'import json,sys; json.load(open(sys.argv[1], encoding="utf-8-sig"))' "$WORK/db-$TS.json"
gzip -6 "$WORK/db-$TS.json"
log "copied db.json ($(du -h "$WORK/db-$TS.json.gz" | cut -f1))"

if [ "$KIND" = daily ]; then
  tar -czf "$WORK/uploads-$TS.tgz" -C "$APP_DIR/backend" uploads
  log "archived uploads ($(du -h "$WORK/uploads-$TS.tgz" | cut -f1))"
  # .env holds JWT_SECRET and the certificate signing key: losing the latter makes
  # every future certificate unverifiable. Uploaded only encrypted.
  if [ -f "$PASSPHRASE_FILE" ]; then
    tar -czf - -C "$APP_DIR" $(cd "$APP_DIR" && ls -d backend/.env frontend/.env* 2>/dev/null) \
      | openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass "file:$PASSPHRASE_FILE" \
      > "$WORK/secrets-$TS.tgz.enc"
    log "encrypted secrets"
  else
    log "WARNING: $PASSPHRASE_FILE missing - .env files NOT backed up"
  fi
fi

rclone copy --no-traverse "$WORK" "$REMOTE/$KIND/"
log "uploaded to $REMOTE/$KIND/"

if [ "$KIND" = frequent ]; then
  rclone delete --min-age 2d "$REMOTE/frequent/"
else
  rclone delete --min-age 35d "$REMOTE/daily/"
fi

[ -z "${FAILED:-}" ] || { log "finished WITH ERRORS"; exit 1; }
date -u +%FT%TZ > /var/log/tieedu-backup.last
[ -n "$HEALTHCHECK_URL" ] && curl -fsS -m 10 "$HEALTHCHECK_URL" > /dev/null || true
log "done"
