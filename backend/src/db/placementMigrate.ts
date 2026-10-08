import { getPool, isDbReachable } from './client';

/**
 * Placement Intelligence Module — schema.
 *
 * Every table is prefixed `placement_` because the cluster is shared with other
 * projects (see the note on `ensureAuditTable`: a generic name like `college`
 * or `audit` belongs to somebody else by now) and because the prefix makes the
 * module's blast radius obvious in a list of tables.
 *
 * Rules this schema encodes so they cannot be violated by a careless insert:
 *
 *  - TENANCY: every table carries `college_id`. The only exception is
 *    `placement_access` where a platform super admin holds a NULL college_id
 *    meaning "all colleges" — enforced by CHECK, not by convention.
 *  - NO TYPED TOTALS: no column anywhere stores a placement rate, a placed
 *    count or a package mix. Those are computed by the metric engine from
 *    `placement_offer` / `placement_student_season` rows (plan §4 rule).
 *  - ONE ROW PER REAL WORLD THING: an offer row per Company Placed-k, a
 *    programme_member row per membership (a student may sit in several).
 *
 * CockroachDB constraints respected: no SERIAL (gen_random_uuid), no pg_trgm
 * (fuzzy company matching runs in the import layer, not SQL), no generated
 * columns (btech_band / package_band are derived at read time by the metric
 * engine so the band definitions live in one place — the code — not seven
 * column definitions).
 */

export async function ensurePlacementCollegeTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS placement_college (
      college_id  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      slug        TEXT NOT NULL UNIQUE,
      name        TEXT NOT NULL,
      short_name  TEXT NOT NULL DEFAULT '',
      theme_color TEXT NOT NULL DEFAULT '#1F3A5F',
      logo_url    TEXT,
      status      TEXT NOT NULL DEFAULT 'active',
      created_by  TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

/**
 * Who may open the Campus TPO portal, in which college, as whom.
 *
 * `user_id` references the JSON-ledger `users` table, so it is TEXT with no
 * FK — the ledger is not in this database. The link is enforced at the auth
 * layer (a grant only ever resolves for a user id that exists) and by the
 * seed/invite paths, which are the only writers.
 *
 * `permissions` is an additive JSONB list on top of the role defaults, same
 * contract as `staff.permissions`.
 */
export async function ensurePlacementAccessTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS placement_access (
      access_id      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      user_id        TEXT NOT NULL,
      college_id     TEXT,
      email          TEXT NOT NULL,
      name           TEXT NOT NULL DEFAULT '',
      placement_role TEXT NOT NULL,
      scopes         JSONB NOT NULL DEFAULT '{}',
      permissions    JSONB NOT NULL DEFAULT '[]',
      status         TEXT NOT NULL DEFAULT 'active',
      invited_by     TEXT,
      invited_at     TIMESTAMPTZ,
      accepted_at    TIMESTAMPTZ,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT placement_access_role_valid
        CHECK (placement_role IN (
          'super_admin','management','tpo_head','tpo_officer','data_officer',
          'master_trainer','vendor_trainer','faculty_mentor','hod','student'
        )),
      CONSTRAINT placement_access_status_valid
        CHECK (status IN ('active','invited','disabled')),
      CONSTRAINT placement_access_college_required
        CHECK (placement_role = 'super_admin' OR college_id IS NOT NULL)
    );
  `);
  // The auth path looks grants up by user on every TPO request.
  await getPool().query(`CREATE INDEX IF NOT EXISTS placement_access_user_idx ON placement_access(user_id);`);
  await getPool().query(`CREATE INDEX IF NOT EXISTS placement_access_college_idx ON placement_access(college_id);`);
  await getPool().query(`
    CREATE UNIQUE INDEX IF NOT EXISTS placement_access_user_college_idx
      ON placement_access(user_id, college_id);
  `);
}

/**
 * Invite tokens for TPO staff onboarding.
 *
 * The token is the primary key because it is the only value the invitee ever
 * holds; looking the row up by token is the whole accept flow. Expiry is
 * absolute (7 days by default) rather than a sliding session so a lost invite
 * cannot grant access months later.
 */
export async function ensurePlacementInviteTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS placement_invite (
      token          TEXT PRIMARY KEY,
      college_id     TEXT NOT NULL,
      email          TEXT NOT NULL,
      placement_role TEXT NOT NULL,
      scopes         JSONB NOT NULL DEFAULT '{}',
      invited_by     TEXT,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at     TIMESTAMPTZ NOT NULL,
      used_at        TIMESTAMPTZ,
      used_user_id   TEXT
    );
  `);
  await getPool().query(`CREATE INDEX IF NOT EXISTS placement_invite_email_idx ON placement_invite(email);`);
  await getPool().query(`CREATE INDEX IF NOT EXISTS placement_invite_college_idx ON placement_invite(college_id);`);
}

/** Links an imported student row to the TieEdu account that owns it. */
export async function ensurePlacementStudentLinkTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS placement_student_link (
      college_id TEXT NOT NULL,
      roll_no    TEXT NOT NULL,
      user_id    TEXT NOT NULL,
      linked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (college_id, roll_no)
    );
  `);
  await getPool().query(`CREATE INDEX IF NOT EXISTS placement_student_link_user_idx ON placement_student_link(user_id);`);
}

export async function ensurePlacementSeasonTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS placement_season (
      college_id   TEXT NOT NULL,
      season_id    TEXT NOT NULL,
      start_date   DATE,
      end_date     DATE,
      status       TEXT NOT NULL DEFAULT 'open',
      locked_by    TEXT,
      locked_at    TIMESTAMPTZ,
      lock_reason  TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (college_id, season_id),
      CONSTRAINT placement_season_status_valid CHECK (status IN ('open','locked'))
    );
  `);
}

/** Static student profile. Contact columns are PII — see `placement.students.pii`. */
export async function ensurePlacementStudentTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS placement_student (
      college_id      TEXT NOT NULL,
      roll_no         TEXT NOT NULL,
      name            TEXT NOT NULL DEFAULT '',
      gender          TEXT,
      course          TEXT,
      branch          TEXT,
      program         TEXT,
      cluster         TEXT,
      admission_year  TEXT,
      email           TEXT,
      email_personal  TEXT,
      mobile          TEXT,
      father_mobile   TEXT,
      state           TEXT,
      district        TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (college_id, roll_no)
    );
  `);
}

/**
 * One row per student per season — the analysis unit. Every metric in the plan
 * (§6) counts this table or joins it to offers.
 *
 * Ranges are CHECKed at the database because an import that lets CPI = 42
 * through poisons every band rate computed after it; the import validates too,
 * but validation in one layer is a preview, not a guarantee.
 */
export async function ensurePlacementStudentSeasonTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS placement_student_season (
      id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      college_id           TEXT NOT NULL,
      roll_no              TEXT NOT NULL,
      season_id            TEXT NOT NULL,
      year_of_study        TEXT,
      class10_pct          NUMERIC(6,2),
      class12_pct          NUMERIC(6,2),
      btech_pct            NUMERIC(6,2),
      cpi                  NUMERIC(4,2),
      attendance_pct       NUMERIC(5,2),
      backlogs             INT NOT NULL DEFAULT 0,
      gap_year             INT NOT NULL DEFAULT 0,
      eligible             TEXT NOT NULL DEFAULT 'Y',
      eligibility_reason   TEXT,
      drives_participated  INT NOT NULL DEFAULT 0,
      opted_out            TEXT,
      ej_flag              TEXT,
      ej_details           TEXT,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (college_id, roll_no, season_id),
      CONSTRAINT placement_ss_btech_range CHECK (btech_pct IS NULL OR (btech_pct >= 0 AND btech_pct <= 100)),
      CONSTRAINT placement_ss_cpi_range   CHECK (cpi IS NULL OR (cpi >= 0 AND cpi <= 10)),
      CONSTRAINT placement_ss_eligible    CHECK (eligible IN ('Y','N'))
    );
  `);
  await getPool().query(
    `CREATE INDEX IF NOT EXISTS placement_ss_season_idx ON placement_student_season(college_id, season_id);`
  );
  await getPool().query(
    `CREATE INDEX IF NOT EXISTS placement_ss_roll_idx ON placement_student_season(college_id, roll_no);`
  );
}

/**
 * Canonical companies per college. `aliases` on the row is the plan's §5 rule 3
 * fast path; `placement_company_alias` is the queryable form used during import
 * matching. Never auto-create a company silently — the import layer queues
 * unknown names for manual confirmation.
 */
export async function ensurePlacementCompanyTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS placement_company (
      company_id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      college_id        TEXT NOT NULL,
      canonical_name    TEXT NOT NULL,
      aliases           JSONB NOT NULL DEFAULT '[]',
      category          TEXT,
      type              TEXT,
      sector            TEXT,
      hq_city           TEXT,
      key_account_owner TEXT,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await getPool().query(
    `CREATE INDEX IF NOT EXISTS placement_company_college_idx ON placement_company(college_id);`
  );
  await getPool().query(
    `CREATE INDEX IF NOT EXISTS placement_company_name_idx ON placement_company(college_id, canonical_name);`
  );

  await getPool().query(`
    CREATE TABLE IF NOT EXISTS placement_company_alias (
      college_id TEXT NOT NULL,
      alias      TEXT NOT NULL,
      company_id TEXT NOT NULL REFERENCES placement_company(company_id) ON DELETE CASCADE,
      confirmed  BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (college_id, alias)
    );
  `);
}

/**
 * A drive is a real visit; company-reported counts (registered/appeared/
 * selected) live here and are ALWAYS shown separately from student-derived
 * counts (plan §5 cleaning rule 7). Never merged, never summed together.
 */
export async function ensurePlacementDriveTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS placement_drive (
      drive_id     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      college_id   TEXT NOT NULL,
      season_id    TEXT NOT NULL,
      company_id   TEXT NOT NULL REFERENCES placement_company(company_id) ON DELETE RESTRICT,
      reference_no TEXT,
      date         DATE,
      mode         TEXT,
      officer      TEXT,
      courses      JSONB NOT NULL DEFAULT '[]',
      rounds       JSONB NOT NULL DEFAULT '[]',
      stipend      NUMERIC(10,2),
      package_ctc  NUMERIC(6,2),
      registered   INT,
      appeared     INT,
      selected     INT,
      status       TEXT NOT NULL DEFAULT 'completed',
      notes        TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await getPool().query(
    `CREATE INDEX IF NOT EXISTS placement_drive_lookup_idx ON placement_drive(college_id, season_id, company_id);`
  );
}

/**
 * One row per Company Placed-k / Packages-k pair. `ctc_lpa` NULL means the
 * offer exists but the package was not recorded — kept, banded as
 * "Package not recorded", never dropped (plan §5 rule 2). Values are LPA on
 * the way in; the import converts rupees (>1000) before insert.
 */
export async function ensurePlacementOfferTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS placement_offer (
      offer_id   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      college_id TEXT NOT NULL,
      roll_no    TEXT NOT NULL,
      season_id  TEXT NOT NULL,
      company_id TEXT NOT NULL REFERENCES placement_company(company_id) ON DELETE RESTRICT,
      drive_id   TEXT REFERENCES placement_drive(drive_id) ON DELETE SET NULL,
      ctc_lpa    NUMERIC(6,2),
      offer_type TEXT NOT NULL DEFAULT 'FTE',
      offer_date DATE,
      accepted   TEXT,
      source     TEXT NOT NULL DEFAULT 'campus',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT placement_offer_ctc_range CHECK (ctc_lpa IS NULL OR (ctc_lpa >= 0 AND ctc_lpa <= 100)),
      CONSTRAINT placement_offer_source_valid CHECK (source IN ('campus','off-campus','self'))
    );
  `);
  await getPool().query(
    `CREATE INDEX IF NOT EXISTS placement_offer_season_idx ON placement_offer(college_id, season_id);`
  );
  await getPool().query(
    `CREATE INDEX IF NOT EXISTS placement_offer_student_idx ON placement_offer(college_id, roll_no, season_id);`
  );
  await getPool().query(
    `CREATE INDEX IF NOT EXISTS placement_offer_company_idx ON placement_offer(college_id, company_id, season_id);`
  );
}

export async function ensurePlacementVendorTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS placement_vendor (
      vendor_id      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      college_id     TEXT NOT NULL,
      name           TEXT NOT NULL,
      contract_start DATE,
      contract_end   DATE,
      fee            NUMERIC(12,2),
      outcome_kpis   JSONB NOT NULL DEFAULT '{}',
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await getPool().query(`CREATE INDEX IF NOT EXISTS placement_vendor_college_idx ON placement_vendor(college_id);`);
}

/** Training cohorts and tiers (Super-150, ICP, TBPPP, Super 50, Super 400…). */
export async function ensurePlacementProgrammeTables(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS placement_programme (
      programme_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      college_id   TEXT NOT NULL,
      name         TEXT NOT NULL,
      vendor_id    TEXT REFERENCES placement_vendor(vendor_id) ON DELETE SET NULL,
      season_id    TEXT,
      description  TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await getPool().query(
    `CREATE INDEX IF NOT EXISTS placement_programme_college_idx ON placement_programme(college_id);`
  );

  // Many-to-many: 130 ICP students are also in Super-150, so membership is a
  // row, never a flag on the student.
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS placement_programme_member (
      college_id  TEXT NOT NULL,
      programme_id TEXT NOT NULL REFERENCES placement_programme(programme_id) ON DELETE CASCADE,
      roll_no     TEXT NOT NULL,
      joined_on   DATE,
      left_on     DATE,
      reason      TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (college_id, programme_id, roll_no)
    );
  `);
  await getPool().query(
    `CREATE INDEX IF NOT EXISTS placement_pm_roll_idx ON placement_programme_member(college_id, roll_no);`
  );
}

/** Season KPI targets (placement_rate 0.55, ge15_students 30…). */
export async function ensurePlacementTargetTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS placement_target (
      college_id   TEXT NOT NULL,
      season_id    TEXT NOT NULL,
      kpi_code     TEXT NOT NULL,
      target_value NUMERIC(12,4) NOT NULL,
      created_by   TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (college_id, season_id, kpi_code)
    );
  `);
}

/**
 * Field-level audit — who changed what, old value, new value, why (plan §3
 * "every edit ... written to an audit log"). Separate from the platform `audit`
 * table so placement history survives any platform-side retention policy and
 * so a placement query never has to join another project's rows.
 */
export async function ensurePlacementAuditTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS placement_audit (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      college_id  TEXT,
      table_name  TEXT NOT NULL,
      record_id   TEXT NOT NULL,
      field       TEXT,
      old_value   TEXT,
      new_value   TEXT,
      changed_by  TEXT NOT NULL,
      changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reason      TEXT
    );
  `);
  await getPool().query(
    `CREATE INDEX IF NOT EXISTS placement_audit_college_idx ON placement_audit(college_id, changed_at DESC);`
  );
  await getPool().query(
    `CREATE INDEX IF NOT EXISTS placement_audit_record_idx ON placement_audit(table_name, record_id);`
  );
}

/**
 * Runs every placement migration. Returns false when PostgreSQL is unreachable
 * or a statement fails — and says which, because the placement module has no
 * JSON fallback: a server that "starts fine" while its placement tables are
 * missing would answer every TPO request with a confusing query error later.
 */
export async function runPlacementMigrations(): Promise<boolean> {
  if (!(await isDbReachable(6000))) {
    console.log(
      '💡 [Placement] PostgreSQL unreachable or not configured — Campus TPO portal will answer 503. (Requires DATABASE_URL.)'
    );
    return false;
  }

  try {
    await ensurePlacementCollegeTable();
    await ensurePlacementAccessTable();
    await ensurePlacementInviteTable();
    await ensurePlacementStudentLinkTable();
    await ensurePlacementSeasonTable();
    await ensurePlacementStudentTable();
    await ensurePlacementStudentSeasonTable();
    await ensurePlacementCompanyTable();
    await ensurePlacementDriveTable();
    await ensurePlacementOfferTable();
    await ensurePlacementVendorTable();
    await ensurePlacementProgrammeTables();
    await ensurePlacementTargetTable();
    await ensurePlacementAuditTable();
    console.log('✅ [Placement] Schema ready (college, access, invite, season, student, company, drive, offer, programme, target, audit).');
    return true;
  } catch (err: any) {
    console.log('💡 [Placement] Migration failed: ' + err.message);
    console.log('💡 [Placement] Campus TPO endpoints will answer 503 until the schema is applied. No partial state is used.');
    return false;
  }
}
