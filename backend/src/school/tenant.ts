import { Response } from 'express';
import { getPool } from '../db/client';

/**
 * TieEdu Schools data access.
 *
 * Every reader/writer in this module takes a `schoolId` as a REQUIRED parameter
 * and the WHERE clause always includes it. There is deliberately no "load
 * everything then filter in JS" path and no header-driven tenant resolution —
 * the caller gets the school id from a signed-in membership, never from a
 * client-sent `x-school-id`. That contract is asserted in
 * `scripts/school-tenant.test.ts`.
 *
 * PG outage honesty (same as placement): no JSON fallback, 503 with a plain
 * message. A 403 here would read as "you lost access" when the real cause is
 * infrastructure.
 */

export interface SchoolTenantRow {
  school_id: string;
  code: string;
  name: string;
  short_name: string;
  city: string;
  state: string;
  board: string;
  motto: string;
  session: string;
  status: string;
  theme_color: string;
}

export interface SchoolMemberRow {
  member_id: string;
  school_id: string;
  user_id: string;
  role: 'admin' | 'coordinator' | 'teacher' | 'student';
  class_level: string;
  section: string;
  roll_no: string | null;
  status: string;
  created_at: string;
}

export interface SchoolProgramRow {
  program_id: string;
  school_id: string;
  slug: string;
  title: string;
  category: string;
  track: string;
  class_min: number;
  class_max: number;
  description: string;
  curriculum: { ref: string; title: string }[];
  status: string;
}

export interface SchoolNoticeRow {
  notice_id: string;
  school_id: string;
  title: string;
  body: string;
  kind: string;
  pinned: boolean;
  published_at: string;
}

export const SCHOOL_PG_ERROR =
  'School data store unavailable (PostgreSQL) — the school portal cannot serve requests right now';

export const isSchoolConnectionFailure = (err: any): boolean => {
  const code = err?.code || '';
  const message = String(err?.message || '');
  return (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'ETIMEDOUT' ||
    code === '57P03' ||
    message.includes('Connection') ||
    message.includes('timeout') ||
    message.includes('DATABASE_URL')
  );
};

export const schoolPgUnavailable = (res: Response) =>
  res.status(503).json({ error: SCHOOL_PG_ERROR });

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function findSchoolByCode(code: string): Promise<SchoolTenantRow | null> {
  const r = await getPool().query<SchoolTenantRow>(
    `SELECT school_id, code, name, short_name, city, state, board, motto, session, status, theme_color
       FROM school WHERE code = $1 AND status = 'active'`,
    [code]
  );
  return r.rows?.[0] || null;
}

export async function findSchoolById(schoolId: string): Promise<SchoolTenantRow | null> {
  const r = await getPool().query<SchoolTenantRow>(
    `SELECT school_id, code, name, short_name, city, state, board, motto, session, status, theme_color
       FROM school WHERE school_id = $1`,
    [schoolId]
  );
  return r.rows?.[0] || null;
}

/** All active memberships of a signed-in user (one school for S0 students). */
export async function findMemberships(userId: string): Promise<SchoolMemberRow[]> {
  const r = await getPool().query<SchoolMemberRow>(
    `SELECT member_id, school_id, user_id, role, class_level, section, roll_no, status, created_at
       FROM school_member
      WHERE user_id = $1 AND status = 'active'
      ORDER BY created_at DESC`,
    [userId]
  );
  return r.rows || [];
}

export async function findMember(
  schoolId: string,
  userId: string
): Promise<SchoolMemberRow | null> {
  const r = await getPool().query<SchoolMemberRow>(
    `SELECT member_id, school_id, user_id, role, class_level, section, roll_no, status, created_at
       FROM school_member
      WHERE school_id = $1 AND user_id = $2 AND status = 'active'`,
    [schoolId, userId]
  );
  return r.rows?.[0] || null;
}

/** Resolve a member by roll number + school, used by the login flow. */
export async function findMemberByRollNo(
  schoolId: string,
  rollNo: string
): Promise<SchoolMemberRow | null> {
  const r = await getPool().query<SchoolMemberRow>(
    `SELECT member_id, school_id, user_id, role, class_level, section, roll_no, status, created_at
       FROM school_member
      WHERE school_id = $1 AND roll_no = $2 AND status = 'active'`,
    [schoolId, rollNo]
  );
  return r.rows?.[0] || null;
}

export async function listPrograms(
  schoolId: string,
  classLevel?: string
): Promise<SchoolProgramRow[]> {
  const level = classLevel ? Number.parseInt(classLevel, 10) : NaN;
  const params: any[] = [schoolId];
  const filter = Number.isFinite(level)
    ? ' AND class_min <= $2 AND class_max >= $2'
    : '';
  if (Number.isFinite(level)) params.push(level);
  const r = await getPool().query<SchoolProgramRow>(
    `SELECT program_id, school_id, slug, title, category, track, class_min, class_max, description, curriculum, status
       FROM school_program
      WHERE school_id = $1 AND status = 'active'${filter}
      ORDER BY track, class_min, title`,
    params
  );
  return r.rows || [];
}

export async function findProgram(
  schoolId: string,
  programId: string
): Promise<SchoolProgramRow | null> {
  const r = await getPool().query<SchoolProgramRow>(
    `SELECT program_id, school_id, slug, title, category, track, class_min, class_max, description, curriculum, status
       FROM school_program
      WHERE school_id = $1 AND program_id = $2 AND status = 'active'`,
    [schoolId, programId]
  );
  return r.rows?.[0] || null;
}

export async function listNotices(
  schoolId: string,
  limit = 30
): Promise<SchoolNoticeRow[]> {
  const r = await getPool().query<SchoolNoticeRow>(
    `SELECT notice_id, school_id, title, body, kind, pinned, published_at
       FROM school_notice
      WHERE school_id = $1
      ORDER BY pinned DESC, published_at DESC
      LIMIT $2`,
    [schoolId, limit]
  );
  return r.rows || [];
}

/**
 * Compact progress index: { [program_id]: lesson ref[] }. Sized for a phone
 * screen, never the whole ledger — a class-wide graduation table can come in a
 * later teacher phase.
 */
export async function loadProgressMap(
  schoolId: string,
  userId: string
): Promise<Record<string, string[]>> {
  const r = await getPool().query<{ program_id: string; lesson_ref: string }>(
    `SELECT program_id, lesson_ref FROM school_progress
      WHERE school_id = $1 AND user_id = $2`,
    [schoolId, userId]
  );
  const map: Record<string, string[]> = {};
  for (const row of r.rows || []) {
    if (!map[row.program_id]) map[row.program_id] = [];
    map[row.program_id].push(row.lesson_ref);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function recordProgress(
  schoolId: string,
  userId: string,
  programId: string,
  lessonRef: string
): Promise<void> {
  await getPool().query(
    `INSERT INTO school_progress (school_id, user_id, program_id, lesson_ref)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (school_id, user_id, program_id, lesson_ref) DO NOTHING`,
    [schoolId, userId, programId, lessonRef]
  );
}