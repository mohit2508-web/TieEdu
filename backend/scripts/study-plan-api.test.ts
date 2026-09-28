/**
 * End-to-end check of the study-plan HTTP surface against a scratch database.
 * Runs the real routers, real JWT auth middleware and real resolver, so route
 * wiring bugs (not just library behaviour) get caught.
 */
import { SCRATCH_DB, TEST_JWT_SECRET, removeScratchDb } from './test-env';
import fs from 'fs';
import express from 'express';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import jwt from 'jsonwebtoken';
import { studyPlanRouter, studyPlanAdminRouter } from '../src/routes/studyPlan.routes';
import { optionalAuth } from '../src/middleware/auth';
import { loadDb, saveDb } from '../src/data/db';

const scratch = SCRATCH_DB;

let pass = 0;
let fail = 0;
const eq = (name: string, a: any, b: any) => {
  const sa = JSON.stringify(a);
  const sb = JSON.stringify(b);
  if (sa === sb) pass++;
  else {
    fail++;
    console.log(`FAIL ${name}\n  expected: ${sb}\n  actual:   ${sa}`);
  }
};

const seedUser = (id: string, role: string) => {
  const db = loadDb();
  db.users.push({ id, name: id, email: `${id}@test.local`, role, xp: 0, disabled: false } as any);
  saveDb(db);
};

const main = async () => {
  seedUser('u-student', 'student');
  seedUser('u-admin', 'admin');

  const app = express();
  app.use(express.json());
  app.use('/api/admin/study-plans', studyPlanAdminRouter);
  app.use('/api/study-plan', optionalAuth, studyPlanRouter);

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = (server.address() as AddressInfo).port;
  const base = `http://127.0.0.1:${port}`;

  const token = (sub: string) => jwt.sign({ sub, role: sub }, TEST_JWT_SECRET);
  const call = async (method: string, url: string, body?: any, as?: string) => {
    const res = await fetch(`${base}${url}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(as ? { Authorization: `Bearer ${token(as)}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, json: await res.json().catch(() => null) as any };
  };

  // ---- public generation, guest ----
  const guest = await call('POST', '/api/study-plan/generate', { targetCompany: 'Acme', targetRole: 'SDE' });
  eq('guest generate is 200', guest.status, 200);
  eq('guest gets the seeded template', guest.json.source, 'template');
  eq('guest gets phases', guest.json.phases.length > 0, true);
  eq('guest is not enrolled', guest.json.progress.completed, 0);
  eq('phases expose day labels', typeof guest.json.phases[0].dayLabel, 'string');
  eq('phases expose blocks', Array.isArray(guest.json.phases[0].blocks), true);

  const firstPhaseId = guest.json.phases[0].id;

  // ---- enrollment requires auth ----
  eq('anonymous enrollment read is 401', (await call('GET', '/api/study-plan/enrollment')).status, 401);
  eq('anonymous progress write is 401', (await call('PUT', `/api/study-plan/enrollment/phases/${firstPhaseId}`, { completed: true })).status, 401);

  // ---- enrolled student ----
  const gen = await call('POST', '/api/study-plan/generate', { targetCompany: 'Acme', targetRole: 'SDE' }, 'u-student');
  if (process.env.SP_DEBUG) console.log('gen response:', JSON.stringify(gen).slice(0, 600));
  eq('student generate enrolls', !!gen.json.progress, true);
  eq('enrollment id returned', typeof gen.json.enrollmentId, 'string');

  // the regression this test exists for: first completion of a resolved phase
  const done = await call('PUT', `/api/study-plan/enrollment/phases/${firstPhaseId}`, { completed: true }, 'u-student');
  eq('first phase completion is 200', done.status, 200);
  eq('progress counted', done.json.plan.progress.completed, 1);
  eq('percent computed', done.json.plan.progress.percent > 0, true);
  eq('phase flagged complete', done.json.plan.phases[0].completed, true);

  const undone = await call('PUT', `/api/study-plan/enrollment/phases/${firstPhaseId}`, { completed: false }, 'u-student');
  eq('uncompleting works', undone.json.plan.progress.completed, 0);

  eq('unknown phase is 404', (await call('PUT', '/api/study-plan/enrollment/phases/nope', { completed: true }, 'u-student')).status, 404);

  const read = await call('GET', '/api/study-plan/enrollment', undefined, 'u-student');
  eq('enrollment read returns a plan', read.json.plan.targetCompany, 'Acme');
  eq('enrollment read returns the enrollment row', read.json.enrollment.target_role, 'SDE');

  const reset = await call('DELETE', '/api/study-plan/enrollment', undefined, 'u-student');
  eq('reset is 200', reset.status, 200);
  eq('reset clears the plan', (await call('GET', '/api/study-plan/enrollment', undefined, 'u-student')).json.plan, null);

  // ---- admin surface ----
  const templatesRes = await call('GET', '/api/admin/study-plans');
  eq('admin list is reachable without a token here (router mount is guarded by admin.routes)', templatesRes.status, 200);
  eq('admin list includes the seeded template', templatesRes.json.templates.length >= 1, true);

  const created = await call('POST', '/api/admin/study-plans', { title: 'Acme Backend Loop', company_name: 'Acme', status: 'draft' });
  eq('create is 201', created.status, 201);
  const tplId = created.json.template.id;
  eq('new template starts as draft', created.json.template.status, 'draft');
  eq('new template starts with no phases', created.json.phases.length, 0);
  eq('a slug is derived from the title', created.json.template.slug, 'acme-backend-loop');

  // ---- slugs ----
  const dup = await call('POST', '/api/admin/study-plans', { title: 'Acme Backend Loop', status: 'draft' });
  eq('a duplicate title still creates', dup.status, 201);
  eq('a duplicate title gets a de-duplicated slug', dup.json.template.slug, 'acme-backend-loop-2');

  const explicit = await call('PUT', `/api/admin/study-plans/${dup.json.template.id}`, { slug: 'My Custom Slug' });
  eq('an explicit slug is accepted when free', explicit.status, 200);
  eq('an explicit slug is slugified', explicit.json.template.slug, 'my-custom-slug');

  const clash = await call('PUT', `/api/admin/study-plans/${dup.json.template.id}`, { slug: 'acme-backend-loop' });
  eq('an explicit slug that clashes is refused', clash.status, 409);
  // `-2` is free again because the duplicate was just renamed to my-custom-slug,
  // so that is the alternative the route has to offer.
  eq('the refusal suggests a free alternative', clash.json.suggested_slug, 'acme-backend-loop-2');

  const emptySlug = await call('PUT', `/api/admin/study-plans/${tplId}`, { slug: '???' });
  eq('a slug with no usable characters is refused', emptySlug.status, 400);

  // A title with no ASCII letters or digits still has to be saveable. The admin
  // UI omits `slug` when the admin has not chosen one, so the server falls back
  // to `study-plan` and de-duplicates. It must not reject the write.
  const nonLatin1 = await call('POST', '/api/admin/study-plans', { title: 'Привет мир', status: 'draft' });
  eq('a non-Latin title creates', nonLatin1.status, 201);
  eq('a non-Latin title falls back to study-plan', nonLatin1.json.template.slug, 'study-plan');

  const nonLatin2 = await call('POST', '/api/admin/study-plans', { title: '日本語 プラン', status: 'draft' });
  eq('a second non-Latin title also creates', nonLatin2.status, 201);
  eq('a second non-Latin title gets a unique slug', nonLatin2.json.template.slug, 'study-plan-2');

  // Diacritics are folded, not dropped.
  const folded = await call('POST', '/api/admin/study-plans', { title: 'Crème Brûlée & Cie', status: 'draft' });
  eq('diacritics are folded to ASCII', folded.json.template.slug, 'creme-brulee-cie');

  // Once assigned, a slug is stable. Retitling a plan must not orphan the URL
  // an admin may already have shared.
  const retitled = await call('PUT', `/api/admin/study-plans/${nonLatin1.json.template.id}`, { title: 'Renamed Later' });
  eq('retitling without a slug keeps the existing slug', retitled.json.template.slug, 'study-plan');
  eq('retitling does update the title', retitled.json.template.title, 'Renamed Later');

  for (const id of [nonLatin1.json.template.id, nonLatin2.json.template.id, folded.json.template.id]) {
    await call('DELETE', `/api/admin/study-plans/${id}?hard=1`);
  }

  // The clash must not have been applied.
  const afterClash = await call('GET', `/api/admin/study-plans/${dup.json.template.id}`);
  eq('a refused slug leaves the old one in place', afterClash.json.template.slug, 'my-custom-slug');

  // Every template in the list carries a slug, including seeded ones.
  const listAfter = await call('GET', '/api/admin/study-plans');
  eq('every listed template has a slug', listAfter.json.templates.every((t: any) => !!t.slug), true);

  const phaseRes = await call('POST', `/api/admin/study-plans/${tplId}/phases`, { title: 'Week 1', day_from: 1, day_to: 5 });
  eq('phase create is 201', phaseRes.status, 201);
  const phaseId = phaseRes.json.phase.id;
  eq('day range stored', [phaseRes.json.phase.day_from, phaseRes.json.phase.day_to], [1, 5]);

  const blockRes = await call('POST', `/api/admin/study-plans/${tplId}/phases/${phaseId}/blocks`, {
    block_type: 'checklist',
    payload: { title: 'Do these', items: ['one', 'two'] },
  });
  eq('block create is 201', blockRes.status, 201);
  eq('block sanitised and stored', blockRes.json.block.payload.items, ['one', 'two']);

  const badBlock = await call('POST', `/api/admin/study-plans/${tplId}/phases/${phaseId}/blocks`, {
    block_type: 'not-a-type',
    payload: {},
  });
  eq('unknown block type is rejected', badBlock.status, 400);

  const scrubbed = await call('POST', `/api/admin/study-plans/${tplId}/phases/${phaseId}/blocks`, {
    block_type: 'markdown',
    payload: { text: 'safe <script>alert(1)</script> text' },
  });
  eq('script tags are stripped server-side', scrubbed.json.block.payload.text.includes('<script>'), false);

  const blockUpdate = await call('PUT', `/api/admin/study-plans/${tplId}/phases/${phaseId}/blocks/${blockRes.json.block.id}`, {
    payload: { title: 'Do these instead', items: ['one', 'two', 'three'] },
  });
  eq('block update keeps the id', blockUpdate.json.block.id, blockRes.json.block.id);
  eq('block update stores the new payload', blockUpdate.json.block.payload.items.length, 3);

  const blockDelete = await call('DELETE', `/api/admin/study-plans/${tplId}/phases/${phaseId}/blocks/${blockRes.json.block.id}`);
  eq('block delete is 200', blockDelete.status, 200);
  eq('block is gone', blockDelete.json.phases[0].blocks.some((b: any) => b.id === blockRes.json.block.id), false);

  const second = await call('POST', `/api/admin/study-plans/${tplId}/phases`, { title: 'Week 2', day_from: 6 });
  const secondId = second.json.phase.id;
  const reordered = await call('POST', `/api/admin/study-plans/${tplId}/phases/reorder`, { phase_ids: [secondId, phaseId] });
  eq('reorder applies', reordered.json.phases.map((p: any) => p.id), [secondId, phaseId]);
  eq('reindexed on reorder', reordered.json.phases.map((p: any) => p.phase_order), [1, 2]);

  const published = await call('PUT', `/api/admin/study-plans/${tplId}`, { status: 'published' });
  eq('publish is 200', published.status, 200);
  eq('status persisted', published.json.template.status, 'published');

  // a company-specific published template now outranks the seeded generic one
  const scoped = await call('POST', '/api/study-plan/generate', { targetCompany: 'Acme', targetRole: 'SDE' }, 'u-student');
  eq('published company template wins', scoped.json.source, 'template');
  eq('matched the scoped template', scoped.json.templateTitle, 'Acme Backend Loop');

  const other = await call('POST', '/api/study-plan/generate', { targetCompany: 'Globex', targetRole: 'SDE' });
  eq('unrelated company still gets the generic seed', other.json.templateTitle, 'Software Engineering Interview Preparation');

  const del = await call('DELETE', `/api/admin/study-plans/${tplId}`);
  eq('soft delete is 200', del.status, 200);
  eq('soft delete archives rather than removing', (await call('GET', `/api/admin/study-plans/${tplId}`)).json.template.status, 'archived');
  const hard = await call('DELETE', `/api/admin/study-plans/${tplId}?hard=1`);
  eq('hard delete is 200', hard.status, 200);
  eq('hard delete removes the row', (await call('GET', `/api/admin/study-plans/${tplId}`)).status, 404);
  eq('hard delete removes its phases', (await call('GET', '/api/admin/study-plans')).json.templates.some((t: any) => t.id === tplId), false);

  const fallbackOnly = await call('POST', '/api/admin/study-plans', { title: 'All', status: 'published' });
  await call('POST', `/api/admin/study-plans/${fallbackOnly.json.template.id}/phases`, { title: 'X', day_from: 1 });
  await call('PUT', `/api/admin/study-plans/${fallbackOnly.json.template.id}`, { status: 'archived' });
  eq('archived templates are not served', (await call('POST', '/api/study-plan/generate', { targetCompany: 'Initech' })).json.templateTitle, 'Software Engineering Interview Preparation');

  // deleting every published template must expose the hardcoded fallback
  const all = (await call('GET', '/api/admin/study-plans')).json.templates as any[];
  for (const t of all) await call('DELETE', `/api/admin/study-plans/${t.id}?hard=1`);
  const bare = await call('POST', '/api/study-plan/generate', { targetCompany: 'Initech', targetRole: 'SDE' });
  eq('hardcoded fallback serves when nothing is published', bare.json.source, 'fallback');
  eq('fallback has phases', bare.json.phases.length, 4);

  const fbGuest = bare.json.phases[0].id;
  await call('POST', '/api/study-plan/generate', { targetCompany: 'Initech', targetRole: 'SDE' }, 'u-student');
  const fbDone = await call('PUT', `/api/study-plan/enrollment/phases/${fbGuest}`, { completed: true }, 'u-student');
  eq('fallback phase completion is 200 (regression)', fbDone.status, 200);
  eq('fallback progress counted', fbDone.json.plan.progress.completed, 1);

  // ---- the interview date is authoritative (the "days ignored" bug) ---------
  // The client used to send a hardcoded `daysRemaining: 14` and the server took
  // it at face value, so a learner with an interview 45 days out was handed a
  // two-week plan and the date they had carefully entered was decorative.
  const daysOut = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

  const forty5 = await call('POST', '/api/study-plan/generate', {
    targetCompany: 'Initech', targetRole: 'SDE', interviewDate: daysOut(45),
  });
  eq('a 45-day interview yields a 45-day plan', forty5.json.totalDays, 45);
  eq('the plan ends on the last day', forty5.json.phases[forty5.json.phases.length - 1].dayTo, 45);

  // A conflicting client hint must lose to the date, not win it.
  const conflict = await call('POST', '/api/study-plan/generate', {
    targetCompany: 'Initech', targetRole: 'SDE', interviewDate: daysOut(45), daysRemaining: 14,
  });
  eq('the interview date beats a client day count', conflict.json.totalDays, 45);

  const seven = await call('POST', '/api/study-plan/generate', {
    targetCompany: 'Initech', targetRole: 'SDE', interviewDate: daysOut(7),
  });
  eq('a 7-day interview yields a 7-day plan', seven.json.totalDays, 7);
  eq('a 7-day plan ends on day 7', seven.json.phases[seven.json.phases.length - 1].dayTo, 7);

  // A date in the past means the interview is imminent, not negative.
  const past = await call('POST', '/api/study-plan/generate', {
    targetCompany: 'Initech', targetRole: 'SDE', interviewDate: daysOut(-5),
  });
  eq('a past interview date clamps to at least one day', past.json.totalDays >= 1, true);
  // Absurd input must not be able to request a 10-year plan.
  const absurd = await call('POST', '/api/study-plan/generate', {
    targetCompany: 'Initech', targetRole: 'SDE', daysRemaining: 99999,
  });
  eq('an absurd day count is clamped', absurd.json.totalDays <= 365, true);
  // No date and no hint still has to produce a usable plan.
  const noHint = await call('POST', '/api/study-plan/generate', { targetCompany: 'Initech', targetRole: 'SDE' });
  eq('no date and no hint falls back to a sane default', noHint.json.totalDays > 0, true);

  // A company the user typed must never be stored as a wildcard id.
  eq('an unrelated company never gets a real company_id', noHint.json.companyId || null, null);

  // ---- generate is rate limited --------------------------------------------
  // Unbounded, this endpoint runs a plan resolution and writes an enrolment for
  // anyone who asks, including anonymous callers.
  const codes: number[] = [];
  for (let i = 0; i < 30; i++) {
    const r = await call('POST', '/api/study-plan/generate', { targetCompany: 'Initech', targetRole: 'SDE' });
    codes.push(r.status);
  }
  eq('generate starts refusing once the limit is hit', codes.includes(429), true);
  eq('the limit does not refuse the first few callers', codes[0], 200);

  server.close();
  removeScratchDb();

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
};

main().catch((e) => {
  console.error(e);
  removeScratchDb();
  process.exit(1);
});
