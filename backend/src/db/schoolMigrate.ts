import { getPool } from './client';

/**
 * TieEdu Schools segment — schema.
 *
 * A separate segment from the placement/college module and from the JSON-ledger
 * product: every `school_*` table is PostgreSQL/CockroachDB only, exactly like
 * `placement_*`, so the school segment never competes with the shared JSON store.
 *
 * Rules this schema encodes so they cannot be violated by a careless insert:
 *
 *  - TENANCY: every table carries `school_id`, NOT NULL, FK to `school`. There is
 *    no school where `school_id` is NULL. Data access is additionally scoped in
 *    the repository layer (`school/tenant.ts`), where every query takes a school
 *    id as a required parameter — the database is the backstop, never the first
 *    line of defence.
 *  - THE USER TABLE IS ELSEWHERE: `school_member.user_id` references the
 *    JSON-ledger `users` table, so it is TEXT with no FK — same contract as
 *    `placement_access.user_id`. The link is enforced at the auth layer: a
 *    membership only ever resolves for a user id that exists, and the seed is the
 *    only writer of new members.
 *  - CURRICULUM IS SELF-CONTAINED: `school_program.curriculum` is a JSONB list of
 *    `{ref, title}` lessons. The school segment must stay fully decoupled from
 *    the college courses engine (a bug there cannot take the school route down),
 *    so a programme carries its own outline. A later phase can deep-link
 *    individual lessons into the college engine without a schema change.
 *
 * CockroachDB constraints respected (mirroring placementMigrate.ts): no SERIAL
 * (gen_random_uuid), no generated columns, no unsupported extensions.
 */

export async function ensureSchoolTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS school (
      school_id   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      code        TEXT NOT NULL UNIQUE,
      name        TEXT NOT NULL,
      short_name  TEXT NOT NULL DEFAULT '',
      city        TEXT NOT NULL DEFAULT '',
      state       TEXT NOT NULL DEFAULT '',
      board       TEXT NOT NULL DEFAULT '',
      motto       TEXT NOT NULL DEFAULT '',
      session     TEXT NOT NULL DEFAULT '',
      status      TEXT NOT NULL DEFAULT 'active',
      theme_color TEXT NOT NULL DEFAULT '#0369A1',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function ensureSchoolMemberTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS school_member (
      member_id   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      school_id   TEXT NOT NULL REFERENCES school(school_id),
      user_id     TEXT NOT NULL,
      role        TEXT NOT NULL CHECK (role IN ('admin','coordinator','teacher','student')),
      class_level TEXT NOT NULL DEFAULT '',
      section     TEXT NOT NULL DEFAULT '',
      roll_no     TEXT,
      status      TEXT NOT NULL DEFAULT 'active',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, user_id),
      UNIQUE (school_id, roll_no)
    );
  `);
}

export async function ensureSchoolProgramTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS school_program (
      program_id  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      school_id   TEXT NOT NULL REFERENCES school(school_id),
      slug        TEXT NOT NULL,
      title       TEXT NOT NULL,
      category    TEXT NOT NULL DEFAULT '',
      track       TEXT NOT NULL DEFAULT 'core',
      class_min   INT  NOT NULL DEFAULT 3,
      class_max   INT  NOT NULL DEFAULT 12,
      description TEXT NOT NULL DEFAULT '',
      curriculum  JSONB NOT NULL DEFAULT '[]',
      status      TEXT NOT NULL DEFAULT 'active',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, slug)
    );
  `);
}

export async function ensureSchoolNoticeTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS school_notice (
      notice_id    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      school_id    TEXT NOT NULL REFERENCES school(school_id),
      title        TEXT NOT NULL,
      body         TEXT NOT NULL DEFAULT '',
      kind         TEXT NOT NULL DEFAULT 'general',
      pinned       BOOL NOT NULL DEFAULT FALSE,
      published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function ensureSchoolProgressTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS school_progress (
      progress_id   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      school_id     TEXT NOT NULL REFERENCES school(school_id),
      user_id       TEXT NOT NULL,
      program_id    TEXT NOT NULL,
      lesson_ref    TEXT NOT NULL,
      completed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, user_id, program_id, lesson_ref)
    );
    CREATE INDEX IF NOT EXISTS idx_school_progress_lookup
      ON school_progress (school_id, user_id, program_id);
  `);
}

export async function runSchoolMigrations(): Promise<boolean> {
  await ensureSchoolTable();
  await ensureSchoolMemberTable();
  await ensureSchoolProgramTable();
  await ensureSchoolNoticeTable();
  await ensureSchoolProgressTable();
  return true;
}