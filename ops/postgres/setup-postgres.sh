#!/usr/bin/env bash
# One-time PostgreSQL 16 install for the TieEdu VPS (Ubuntu 24.04).
#
#   sudo bash ops/postgres/setup-postgres.sh
#
# Safe to re-run: it never changes an existing role's password and never drops
# a database. Creates:
#   - role `tieedu` with a random password
#   - databases `tieedu` (production) and `tieedu_staging` (rehearsal)
#   - /root/tieedu-pg.env (chmod 600) holding both DATABASE_URLs
# PostgreSQL listens on localhost only - nothing is exposed to the internet.
set -euo pipefail

DB_USER=${DB_USER:-tieedu}
DBS=${DBS:-"tieedu tieedu_staging"}
ENV_OUT=${ENV_OUT:-/root/tieedu-pg.env}

[ "$(id -u)" = 0 ] || { echo "run as root"; exit 1; }

apt-get update -q
apt-get install -y -q postgresql-16 postgresql-client-16 rclone
systemctl enable --now postgresql

# 8 GB box shared with Node/Next/PM2 apps: give PostgreSQL ~1 GB of buffers.
cat > /etc/postgresql/16/main/conf.d/tieedu.conf <<'CONF'
listen_addresses = 'localhost'
max_connections = 60
shared_buffers = 1GB
effective_cache_size = 3GB
work_mem = 8MB
maintenance_work_mem = 256MB
wal_compression = on
checkpoint_completion_target = 0.9
random_page_cost = 1.1
timezone = 'UTC'
log_timezone = 'UTC'
log_min_duration_statement = 500
CONF
systemctl restart postgresql

psql_su() { runuser -u postgres -- psql -v ON_ERROR_STOP=1 -tA "$@"; }

if [ "$(psql_su -c "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'")" != 1 ]; then
  PASS=$(openssl rand -hex 24)
  psql_su -c "CREATE ROLE $DB_USER LOGIN PASSWORD '$PASS'"
  {
    echo "# Written by setup-postgres.sh on $(date -u +%FT%TZ). Keep secret."
    echo "PROD_DATABASE_URL=postgresql://$DB_USER:$PASS@localhost:5432/tieedu"
    echo "STAGING_DATABASE_URL=postgresql://$DB_USER:$PASS@localhost:5432/tieedu_staging"
  } > "$ENV_OUT"
  chmod 600 "$ENV_OUT"
  echo "Created role $DB_USER; URLs saved to $ENV_OUT"
else
  echo "Role $DB_USER already exists - password left unchanged (see $ENV_OUT)."
fi

for db in $DBS; do
  if [ "$(psql_su -c "SELECT 1 FROM pg_database WHERE datname='$db'")" != 1 ]; then
    runuser -u postgres -- createdb -O "$DB_USER" "$db"
    echo "Created database $db"
  fi
  # gen_random_uuid() is built in from PostgreSQL 13; pgcrypto only as a belt.
  psql_su -d "$db" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto" >/dev/null
done

echo
echo "Listening on:"; ss -tlnp | grep 5432 || true
echo "Expected: 127.0.0.1:5432 and [::1]:5432 only."
