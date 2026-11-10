# CockroachDB Cloud → PostgreSQL on the Contabo VPS

Runbook for moving every relational table off CockroachDB Cloud onto PostgreSQL 16
on the same VPS that runs the app, with no data loss and no user-visible change.

Server: Contabo Cloud VPS 4 — 4 vCPU, 8 GB RAM, 100 GB disk, Ubuntu 24.04, PM2 + Nginx,
app at `/var/www/tiedu`. No hardware upgrade needed.

## What moves and what does not

| Data | Lives in | Effect of the move |
|---|---|---|
| Users, sessions, orders, courses, progress | `backend/data/db.json` on the VPS | Untouched. Logins never notice. |
| `app_state` (a full copy of db.json) | CockroachDB | Copied once, then the mirror is switched off (`ENABLE_PG_REPLICA=0`). Off-site safety comes from `ops/postgres/backup.sh` instead. |
| devices, push_subscriptions, staff, audit, notification_reminders | CockroachDB, dual-written to db.json | Copied. Anything missed is backfilled from db.json at boot. |
| placement_*, school*, drive_*, student_profile, student_resume … | CockroachDB only | Copied under the write freeze and verified row-for-row. |

`school-platform` (PM2 `tieedu-school`) uses Prisma with `provider = "cockroachdb"`.
It is a separate step (section 7) — first confirm whether it holds live data.

## Tools in this repo

- `backend/scripts/pg-migrate.ts` (`npm run db:migrate -- <cmd>`): `plan`, `schema`, `copy --yes`, `verify`.
  One read-only snapshot of the source, one transaction on the target, row-count + per-row digest verification.
  Works in either direction, so the same tool is the rollback.
- `backend/src/db/writeFreeze.ts`: `touch backend/data/.pg-write-freeze` pauses every database write
  (driver-level guard) and answers PG-only write routes with a 503 "try again in a minute".
  Reads, login and everything in db.json keep working. `rm` the file to lift it. No restart needed.
- `DATABASE_SSL=0`: needed for a localhost PostgreSQL (no TLS).
- `ops/postgres/setup-postgres.sh`, `backup.sh`, `restore-check.sh`, `tieedu-backup.cron`.

## Phase A — prepare (live site unaffected)

1. Contabo panel → take a **snapshot** of the VPS.
2. Contabo panel → Object Storage → create bucket `tieedu-backups`, create S3 credentials.
3. Deploy this branch to the server as usual (`git pull` + build + `pm2 restart tiedu-backend`).
   The new code is inert until the flag file exists or `DATABASE_SSL` is set.
4. On the server:
   ```bash
   cd /var/www/tiedu
   chmod +x ops/postgres/*.sh
   sudo bash ops/postgres/setup-postgres.sh          # PG16 + rclone, prints listening sockets
   cat /root/tieedu-pg.env                            # PROD_ and STAGING_DATABASE_URL
   rclone config                                      # new remote "contabo": s3 → provider Other →
                                                      # endpoint from the Contabo panel (e.g. https://eu2.contabostorage.com)
   openssl rand -hex 32 > /root/.tieedu-backup-passphrase && chmod 600 /root/.tieedu-backup-passphrase
   ```
   **Copy the passphrase to your password manager.** Without it the encrypted `.env` backup cannot be opened.
5. Find where the backend gets its env — `.env` file or PM2:
   ```bash
   pm2 env 1 | grep -E 'DATABASE_URL|ENABLE_PG_REPLICA'   # if shown here, PM2 overrides backend/.env
   grep -E 'DATABASE_URL|ENABLE_PG_REPLICA' backend/.env
   ```

## Phase B — rehearsal (live site unaffected; repeat until clean)

```bash
cd /var/www/tiedu/backend
source /root/tieedu-pg.env
export SOURCE_DATABASE_URL="$(grep ^DATABASE_URL= .env | cut -d= -f2-)"   # current CockroachDB
export TARGET_DATABASE_URL="$STAGING_DATABASE_URL"

npm run db:migrate -- schema        # app's own migrations on staging
npm run db:migrate -- plan          # must end with "No schema problems"
npm run db:migrate -- copy --yes    # copy + automatic verify; must end with "VERIFIED"
```

Then run a staging backend against it on a spare port and click through every area:

```bash
DATABASE_URL="$STAGING_DATABASE_URL" DATABASE_SSL=0 ENABLE_PG_REPLICA=0 PORT=5099 \
  DB_FILE=/tmp/db-staging.json node dist/server.js
# (cp data/db.json /tmp/db-staging.json first, so the rehearsal never writes the real ledger)
```

Check: login/signup, course page, checkout, certificate verify, admin dashboard + devices + audit,
TPO portal, mock drive register/launch, school portal, push subscribe.

Backups, once against staging:
```bash
DBS=tieedu_staging ops/postgres/backup.sh frequent && DB=tieedu_staging ops/postgres/restore-check.sh
```

Note how long `copy` took — that is the length of the freeze.

## Phase C — cutover (03:00 IST, ~5 minutes)

```bash
cd /var/www/tiedu/backend
source /root/tieedu-pg.env
export SOURCE_DATABASE_URL="<current CockroachDB URL>"
export TARGET_DATABASE_URL="$PROD_DATABASE_URL"

npm run db:migrate -- schema && npm run db:migrate -- plan     # before the freeze

touch data/.pg-write-freeze                                     # 1. freeze (no restart)
npm run db:migrate -- copy --yes                                # 2. copy + verify → must say VERIFIED
#    Anything else → rm data/.pg-write-freeze and stop. Nothing changed for users.

cp .env .env.before-pg                                          # 3. repoint
#    edit .env:  DATABASE_URL=<PROD_DATABASE_URL>   DATABASE_SSL=0   ENABLE_PG_REPLICA=0
#    (and in the PM2 ecosystem too, if step A5 showed PM2 sets them)
pm2 stop tiedu-backend
rm data/.pg-write-freeze                                        # 4. unfreeze only while stopped,
pm2 start tiedu-backend --update-env                            #    so no write can reach the old cluster

curl -s localhost:5000/api/health                               # 5. pg ok, storage label
pm2 logs tiedu-backend --lines 80 --nostream                    #    "[PostgreSQL] Connected to localhost…"
```
Then by hand: student login, admin login, one placement page, one drive page, one school page.

Install backups:
```bash
sudo install -m 644 -o root /var/www/tiedu/ops/postgres/tieedu-backup.cron /etc/cron.d/tieedu-backup
/var/www/tiedu/ops/postgres/backup.sh frequent && /var/www/tiedu/ops/postgres/restore-check.sh
```

## Phase D — watch (2–4 weeks)

- Daily: `tail -n 20 /var/log/tieedu-backup.log`, `cat /var/log/tieedu-backup.last`, `pm2 logs` for errors, `df -h /`.
- **Do not delete the CockroachDB cluster yet.** It is the rollback.
- After 2–4 quiet weeks: final `pg_dump` archived, then shut the cluster down.

### Rollback

```bash
touch data/.pg-write-freeze
SOURCE_DATABASE_URL="$PROD_DATABASE_URL" TARGET_DATABASE_URL="<CockroachDB URL>" \
  npm run db:migrate -- copy --yes --overwrite          # carries post-cutover writes back
cp .env.before-pg .env
pm2 stop tiedu-backend && rm data/.pg-write-freeze && pm2 start tiedu-backend --update-env
```

## 7. school-platform (separate)

Branch `feat/school-postgres` switches Prisma to `provider = "postgresql"` and replaces the init
migration with a PostgreSQL baseline. The regenerated SQL was diffed against the CockroachDB one:
same 24 tables, 16 enums, 43 indexes, 34 foreign keys; the only difference is CockroachDB's
`schema_locked` lines. `pg-migrate.ts` skips `_prisma_migrations` (each side keeps its own history).

**Do not deploy this branch before step 4** — it is the cutover itself for the school app.

```bash
# 1. databases (once)
runuser -u postgres -- createdb -O tieedu tieedu_school
runuser -u postgres -- createdb -O tieedu tieedu_school_staging
SCHOOL_PG="postgresql://tieedu:<password from /root/tieedu-pg.env>@localhost:5432/tieedu_school"

# 2. rehearsal, from a checkout of feat/school-postgres
cd /var/www/tiedu/school-platform
DATABASE_URL="${SCHOOL_PG}_staging" npx prisma migrate deploy
cd ../backend
SOURCE_DATABASE_URL="<school CockroachDB URL>" TARGET_DATABASE_URL="${SCHOOL_PG}_staging" npm run db:migrate -- plan
SOURCE_DATABASE_URL="<school CockroachDB URL>" TARGET_DATABASE_URL="${SCHOOL_PG}_staging" npm run db:migrate -- copy --yes

# 3. cutover: same as 2 against $SCHOOL_PG, with `pm2 stop tieedu-school` before the copy
#    (the school app has no freeze flag; a stop of ~1 min at 03:00 is the freeze)
# 4. deploy feat/school-postgres, set DATABASE_URL=$SCHOOL_PG in school-platform/.env,
#    npm run build, pm2 start tieedu-school --update-env
```
Add `tieedu_school` to `DBS` in `/etc/cron.d/tieedu-backup` (`DBS="tieedu tieedu_school"`).

## What gets faster / what doesn't

- Faster: TPO/placement, mock drives, school portal, admin devices/audit/staff, push sends —
  every query drops from a cross-internet round trip to localhost. Saves also stop pushing a
  full ~14 MB JSON copy over the network.
- Same: student course pages, login, quizzes, Drops (already served from db.json in memory);
  page assets (Nginx). Accessibility is unrelated to the database.

## Risks

| Risk | Guard |
|---|---|
| VPS/disk loss — DB is no longer off-box | 15-min off-site dumps + daily uploads/secrets, weekly restore check, Contabo snapshots |
| Copy misses a row | Single-snapshot copy, single-transaction write, row-for-row digest; no switch without VERIFIED |
| Write lost during switch | Driver-level freeze; unfreeze only while the backend is stopped |
| Logins break | Users/sessions live in db.json; JWT_SECRET unchanged |
| RAM pressure | 1 GB shared_buffers, 4 GB swap present, ~6 GB free today |
