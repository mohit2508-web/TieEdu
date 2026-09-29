// End-to-end smoke test for the course engine.
//
//   npx ts-node --transpile-only src/scripts/smokeCourses.ts
//
// Boots the real Express app against a throwaway copy of the data dir and walks
// the whole flow: signup -> catalog -> enrol -> gating -> anti-cheat -> quiz ->
// completion -> certificate -> verify -> tamper -> PDF -> feedback -> admin ->
// revoke -> leaderboard.
//
// The assertions that matter most are the negative ones: a locked lesson must
// stay locked, a client claiming 99% watch time must not be believed, a tampered
// certificate must stop verifying, and XP must not be farmable.

process.env.PORT = process.env.SMOKE_PORT || '5311';
process.env.CERT_SIGNING_SECRET = process.env.CERT_SIGNING_SECRET || 'smoke-test-signing-secret-0001';
process.env.NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tieedu.test';

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { XpEvent, User } from '../data/db';

const DATA_DIR = path.join(__dirname, '../../data');
const REAL_DB_FILE = path.join(DATA_DIR, 'db.json');

// Run against a scratch copy of the store, never the real one.
//
// This used to mutate data/db.json directly and copy it back on the way out.
// That is unsafe whenever a dev server is also running: both processes do
// read-modify-write on the same file, so whichever saves last silently reverts
// the other's writes. That produced intermittent, unreproducible failures —
// freshly signed test accounts coming back as "Account not found or disabled",
// certificates vanishing mid-tamper-test — and left the real db.json exposed if
// the run was interrupted. db.ts already honours DB_FILE for exactly this.
const SCRATCH_DB = path.join(DATA_DIR, `db.smoke-${process.pid}.json`);
process.env.DB_FILE = SCRATCH_DB;

const DB_FILE = SCRATCH_DB;
const BASE = `http://127.0.0.1:${process.env.PORT}`;

let passed = 0;
const failures: string[] = [];
const skips: string[] = [];

function skip(label: string, why: string) {
  skips.push(label);
  console.log(`  skip ${label} — ${why}`);
}

function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ok   ${label}`);
  } else {
    failures.push(label + (detail ? ` — ${detail}` : ''));
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

async function api(
  routePath: string,
  opts: { method?: string; token?: string; body?: any; raw?: boolean } = {}
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = {};
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${routePath}`, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (opts.raw) return { status: res.status, body: await res.arrayBuffer() };
  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch {
    return { status: res.status, body: text };
  }
}

function readDb(): any {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function writeDb(db: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

/**
 * Satisfy the "you were here" half of completion directly in the store, so the
 * test does not have to sit through three real videos. The watch-time cap and
 * the quiz grading are still exercised over HTTP; only the waiting is skipped.
 */
function satisfyTimeGates(userId: string, courseId: string, only?: string[], zero = false) {
  const db = readDb();
  const course = db.courses.find((c: any) => c.id === courseId);
  const lessons = course.modules.flatMap((m: any) => m.lessons);

  const p = (db.course_progress[userId] = db.course_progress[userId] || {});
  p[courseId] = p[courseId] || {
    user_id: userId,
    course_id: courseId,
    enrolled_at: new Date(Date.now() - 60_000).toISOString(),
    updated_at: new Date().toISOString(),
    completed_at: null,
    video_watch_seconds: {},
    video_duration_seconds: {},
    last_heartbeat_at: {},
    completed_lesson_ids: [],
    quiz_best_percent: {},
    passed_quiz_ids: [],
  };

  for (const lesson of lessons) {
    if (only && !only.includes(lesson.id)) continue;
    if (lesson.video) {
      // The stored video object carries the author's estimate as
      // duration_minutes, not duration_seconds — derive the same number the
      // server would.
      const dur = authorSecondsOf(lesson);
      p[courseId].video_duration_seconds[lesson.id] = dur;
      p[courseId].video_watch_seconds[lesson.id] = zero ? 0 : Math.ceil(dur * 0.97);
    } else if (!lesson.quiz) {
      // Read-only lessons are time-gated through the same counter.
      const estimated = (Number(lesson.duration_minutes) || 0) * 60;
      const need = Math.min(600, Math.max(20, Math.round(estimated * 0.4)));
      p[courseId].video_watch_seconds[lesson.id] = need + 5;
    }
  }
  // Give the next HTTP heartbeat a full 20s budget to be clamped against.
  if (!only) p[courseId].last_heartbeat_at = {};
  writeDb(db);
}

/**
 * The real answer key, read straight out of the store: { question_id: index }.
 * That is the exact shape POST /lessons/:id/quiz expects.
 */
function answerKeyFor(courseId: string): Record<string, Record<string, number>> {
  const db = readDb();
  const course = db.courses.find((c: any) => c.id === courseId);
  const key: Record<string, Record<string, number>> = {};
  for (const lesson of course.modules.flatMap((m: any) => m.lessons)) {
    if (!lesson.quiz?.questions?.length) continue;
    const sheet: Record<string, number> = {};
    for (const q of lesson.quiz.questions) {
      const idx = q.options.findIndex((o: any) => o.correct);
      sheet[q.id] = idx >= 0 ? idx : Number(q.correct_index ?? 0);
    }
    key[lesson.id] = sheet;
  }
  return key;
}

function authorSecondsOf(lesson: any): number {
  if (lesson.video?.duration_minutes) return Math.round(Number(lesson.video.duration_minutes) * 60);
  if (lesson.duration_minutes) return Math.round(Number(lesson.duration_minutes) * 60);
  return 600;
}

async function signup(name: string) {
  const email = `smoke-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@tieedu.test`;
  const res = await api('/api/auth/signup', {
    method: 'POST',
    body: { name, email, password: 'SmokeTest!2026', college: 'TIE Test University' },
  });
  return { email, status: res.status, token: res.body?.accessToken, id: res.body?.user?.id };
}

async function main() {
  // Seed the scratch store from the real one so the suite exercises realistic
  // data. Any leftover scratch file from a killed run is discarded first.
  if (fs.existsSync(SCRATCH_DB)) fs.unlinkSync(SCRATCH_DB);
  if (fs.existsSync(REAL_DB_FILE)) {
    fs.copyFileSync(REAL_DB_FILE, SCRATCH_DB);
  } else {
    // No install to copy: let db.ts create a fresh store at the scratch path.
    console.log('       (no data/db.json found — running against an empty scratch store)');
  }

  await import('../server');
  await new Promise((r) => setTimeout(r, 1500));

  try {
    console.log('\n[1] auth');
    const student = await signup('Smoke Student');
    check('signup returns 201', student.status === 201, `got ${student.status}`);
    check('signup returns an access token', typeof student.token === 'string' && student.token.length > 20);
    check('signup returns a user id', typeof student.id === 'string');
    const token = student.token;
    const userId = student.id;

    const me = await api('/api/auth/me', { token });
    check('the token authenticates', me.status === 200 && me.body?.user?.id === userId);
    check('a new account starts at 0 XP', me.body?.user?.xp === 0, `xp=${me.body?.user?.xp}`);

    console.log('\n[2] catalog');
    const catalog = await api('/api/courses');
    check('catalog is public', catalog.status === 200, `got ${catalog.status}`);
    // The catalog now bundles more than one course (Coding Foundations and the
    // C course). This suite exercises the video watch-time anti-cheat, which
    // needs a course that actually ships video lessons, so select that course
    // from the store and find its catalog card. Assuming the first catalog row
    // is the video-bearing one broke as soon as a second, video-less course
    // sorted ahead of it.
    const publishedCourses = readDb().courses.filter((c: any) => c.published);
    const videoCourse = publishedCourses.find((c: any) =>
      (c.modules || []).some((m: any) => (m.lessons || []).some((l: any) => l.video))
    );
    const targetCourse = videoCourse || publishedCourses[0];
    const listing =
      (catalog.body?.courses || []).find((c: any) => c.id === targetCourse?.id) || catalog.body?.courses?.[0];
    check('catalog lists the bundled course', !!listing, JSON.stringify(catalog.body).slice(0, 160));
    check('the listed course is a real published course', !!listing?.slug && !!listing?.title, JSON.stringify(listing).slice(0, 140));
    check('catalog does not leak the answer key', !/"correct"\s*:\s*true/.test(JSON.stringify(catalog.body)));

    const dbCourse = readDb().courses.find((c: any) => c.id === listing.id);
    const slug = dbCourse.slug;
    const lessons = dbCourse.modules.flatMap((m: any) => m.lessons);
    const videoLessons = lessons.filter((l: any) => l.video);
    const quizLessons = lessons.filter((l: any) => l.quiz?.questions?.length);
    const readLessons = lessons.filter((l: any) => !l.video && !l.quiz);
    console.log(
      `       "${dbCourse.title}"\n       lessons=${lessons.length} video=${videoLessons.length} quiz=${quizLessons.length} read=${readLessons.length}`
    );
    check('the course actually has content', lessons.length > 0 && videoLessons.length > 0 && quizLessons.length > 0);

    console.log('\n[3] course detail must not leak answers or locked content');
    const detail = await api(`/api/courses/${encodeURIComponent(slug)}`);
    check('course detail loads without a token', detail.status === 200, `got ${detail.status}: ${JSON.stringify(detail.body).slice(0, 140)}`);
    const raw = JSON.stringify(detail.body);
    check('no "correct": true in the payload', !/"correct"\s*:\s*true/.test(raw));
    check('no answer index in the payload', !/correct_index/.test(raw));

    const key = answerKeyFor(listing.id);
    const detailLessons = (detail.body?.course?.modules || []).flatMap((m: any) => m.lessons);
    check('the syllabus lists every lesson', detailLessons.length === lessons.length, `${detailLessons.length}/${lessons.length}`);

    // Lesson 1 is deliberately previewable to a logged-out visitor; everything
    // after it must be withheld or the gate means nothing.
    const preview = detailLessons[0];
    check('lesson 1 is previewable to a visitor', preview?.blocks !== undefined, JSON.stringify(Object.keys(preview || {})));
    const afterFirst = detailLessons.slice(1);
    check(
      'lessons after the first ship no body',
      afterFirst.every((l: any) => l.blocks === undefined),
      JSON.stringify(afterFirst[0] || {}).slice(0, 160)
    );
    check(
      'lessons after the first ship no video url',
      afterFirst.every((l: any) => l.video === undefined || l.video === null)
    );
    check(
      'no lesson anywhere ships question text or options',
      !/"options"\s*:/.test(raw) && !/"prompt"\s*:/.test(raw)
    );
    check(
      'quizzes are reduced to a count and a pass mark',
      detailLessons.every((l: any) => {
        if (!l.quiz) return true;
        return l.quiz.question_count > 0 && l.quiz.options === undefined;
      }),
      JSON.stringify(preview?.quiz)
    );
    check(
      'locked lessons still show title and kind',
      afterFirst.every((l: any) => !!l.title && !!l.kind),
      JSON.stringify(afterFirst[0] || {}).slice(0, 160)
    );

    // Regression: the syllabus used to carry no `locked` flag at all, so the
    // client re-derived the gate from `state.ready` — which means "finished this
    // lesson", not "may open it". Every unstarted lesson then looked locked and
    // the course deadlocked after lesson 1. The server must state the gate
    // explicitly on both the previewable and the stubbed shape.
    check(
      'every syllabus lesson states whether it is locked',
      detailLessons.every((l: any) => typeof l.locked === 'boolean'),
      JSON.stringify(Object.keys(preview || {}))
    );
    check(
      'a visitor sees lesson 1 open and the rest closed',
      preview?.locked === false && afterFirst.every((l: any) => l.locked === true),
      JSON.stringify({ first: preview?.locked, second: afterFirst[0]?.locked })
    );
    check(
      'a locked stub explains itself',
      afterFirst.every((l: any) => typeof l.lock_reason === 'string' && l.lock_reason.length > 0),
      JSON.stringify(afterFirst[0]?.lock_reason)
    );

    console.log('\n[4] enrolment and sequential gating');
    const enrol = await api(`/api/courses/${encodeURIComponent(slug)}/enroll`, { method: 'POST', token });
    check('enrol succeeds', enrol.status === 200 || enrol.status === 201, `got ${enrol.status}`);

    const lockedLesson = await api(`/api/courses/lessons/${encodeURIComponent(lessons[1].id)}`, { token });
    check('lesson 2 is locked before lesson 1 is done', lockedLesson.body?.locked === true, JSON.stringify(lockedLesson.body).slice(0, 140));
    check('the lock carries a reason', !!lockedLesson.body?.lock_reason);
    check(
      'a locked lesson withholds its body',
      lockedLesson.body?.lesson?.blocks === undefined && lockedLesson.body?.lesson?.video === undefined,
      JSON.stringify(lockedLesson.body?.lesson).slice(0, 160)
    );

    const open = await api(`/api/courses/lessons/${encodeURIComponent(lessons[0].id)}`, { token });
    check('lesson 1 is unlocked', open.body?.locked === false, JSON.stringify(open.body).slice(0, 140));
    check('lesson 1 ships its content', Array.isArray(open.body?.lesson?.blocks), JSON.stringify(Object.keys(open.body?.lesson || {})));
    check('lesson 1 reports its requirements', Array.isArray(open.body?.lesson?.state?.requirements), JSON.stringify(open.body?.lesson?.state).slice(0, 160));
    check('lesson 1 is not already complete', open.body?.lesson?.state?.is_complete === false);
    const openQuiz = open.body?.lesson?.quiz;
    const openQuizJson = JSON.stringify(openQuiz || {});
    check('an unlocked lesson ships its questions', Array.isArray(openQuiz?.questions) && openQuiz.questions.length > 0, openQuizJson.slice(0, 160));
    check(
      'every shipped question has prompt + options',
      (openQuiz?.questions || []).every((q: any) => typeof q.prompt === 'string' && Array.isArray(q.options) && q.options.length > 0),
      openQuizJson.slice(0, 160)
    );
    check(
      'an unlocked lesson still does not ship the answer key',
      !/"correct_index"/.test(openQuizJson) && !/"explanation"/.test(openQuizJson),
      openQuizJson.slice(0, 200)
    );
    check('lesson 1 quiz has no answers', !/"correct"\s*:\s*true/.test(openQuizJson));

    const lockedProgress = await api(`/api/courses/lessons/${encodeURIComponent(lessons[1].id)}/progress`, {
      method: 'POST',
      token,
      body: { delta_seconds: 600, duration_seconds: 600 },
    });
    check('progress on a locked lesson is refused', lockedProgress.status === 409, `got ${lockedProgress.status}`);

    const lockedQuiz = await api(`/api/courses/lessons/${encodeURIComponent(lessons[1].id)}/quiz`, {
      method: 'POST',
      token,
      body: { answers: key[lessons[1].id] || {} },
    });
    check('grading a locked lesson is refused', lockedQuiz.status === 409, `got ${lockedQuiz.status}`);

    console.log('\n[5] anti-cheat: watch time and duration cannot be self-declared');
    // Open the first video by finishing everything ahead of it in order.
    const firstVideo = videoLessons[0];
    for (const lesson of lessons) {
      if (lesson.id === firstVideo.id) break;
      if (lesson.quiz?.questions?.length) {
        await api(`/api/courses/lessons/${encodeURIComponent(lesson.id)}/quiz`, {
          method: 'POST',
          token,
          body: { answers: key[lesson.id] },
        });
      } else if (!lesson.video) {
        satisfyTimeGates(userId, listing.id, [lesson.id]);
        await api(`/api/courses/lessons/${encodeURIComponent(lesson.id)}/progress`, {
          method: 'POST',
          token,
          body: { delta_seconds: 20, duration_seconds: 20 },
        });
      }
    }
    const gateNow = await api(`/api/courses/lessons/${encodeURIComponent(firstVideo.id)}`, { token });
    check(`the first video (${firstVideo.id}) is now unlocked`, gateNow.body?.locked === false, JSON.stringify(gateNow.body).slice(0, 140));
    check('the unlocked video lesson ships its embed url', !!gateNow.body?.lesson?.video?.embed_url, JSON.stringify(gateNow.body?.lesson?.video).slice(0, 200));

    satisfyTimeGates(userId, listing.id, undefined, true);
    const authorSeconds = (Number(firstVideo.video.duration_minutes) || 0) * 60;

    // The shrink attack: claim the video is a few seconds long, then watch it.
    const shrink = await api(`/api/courses/lessons/${encodeURIComponent(firstVideo.id)}/progress`, {
      method: 'POST',
      token,
      body: { delta_seconds: 20, duration_seconds: 3 },
    });
    const storedDuration = Number(readDb().course_progress[userId][listing.id].video_duration_seconds[firstVideo.id]) || 0;
    check(
      'a 3-second claim for a long video is rejected',
      storedDuration >= authorSeconds * 0.7,
      `stored ${storedDuration}s vs author estimate ${authorSeconds}s`
    );
    check('the shrink attempt does not complete the lesson', shrink.body?.lesson?.is_complete !== true, JSON.stringify(shrink.body?.lesson).slice(0, 160));
    const shrinkPercent = shrink.body?.lesson?.video_percent ?? 0;
    check('the percentage is computed against the real length', shrinkPercent < 10, `percent=${shrinkPercent}`);

    const before = Number(readDb().course_progress[userId][listing.id].video_watch_seconds[firstVideo.id]) || 0;

    // Claim the entire video in a single request.
    const cheat = await api(`/api/courses/lessons/${encodeURIComponent(firstVideo.id)}/progress`, {
      method: 'POST',
      token,
      body: { delta_seconds: authorSeconds, duration_seconds: authorSeconds },
    });
    const after = Number(readDb().course_progress[userId][listing.id].video_watch_seconds[firstVideo.id]) || 0;
    const credited = after - before;
    check('heartbeat accepted', cheat.status === 200, `got ${cheat.status}: ${JSON.stringify(cheat.body).slice(0, 140)}`);
    check('credited at most 20s, not the claimed amount', credited <= 20, `credited ${credited}s, claimed ${authorSeconds}s`);
    check('the response echoes the credited amount', cheat.body?.credited_seconds <= 20, `credited_seconds=${cheat.body?.credited_seconds}`);
    check('the response echoes the rejected amount', cheat.body?.rejected_seconds > 0, `rejected=${cheat.body?.rejected_seconds}`);

    const absurd = await api(`/api/courses/lessons/${encodeURIComponent(firstVideo.id)}/progress`, {
      method: 'POST',
      token,
      body: { delta_seconds: 999_999, duration_seconds: 999_999 },
    });
    const afterAbsurd = Number(readDb().course_progress[userId][listing.id].video_watch_seconds[firstVideo.id]) || 0;
    check('an absurd claim is also capped at 20s', afterAbsurd - after <= 20, `gained ${afterAbsurd - after}s`);
    const durationStored = Number(readDb().course_progress[userId][listing.id].video_duration_seconds[firstVideo.id]) || 0;
    check('a fake 277-hour duration is not stored verbatim', durationStored <= 8 * 3600, `stored ${durationStored}s`);
    check('absurd heartbeat still succeeds structurally', absurd.status === 200, `got ${absurd.status}`);

    const negative = await api(`/api/courses/lessons/${encodeURIComponent(firstVideo.id)}/progress`, {
      method: 'POST',
      token,
      body: { delta_seconds: -5000, duration_seconds: 10 },
    });
    check('a negative delta cannot subtract watch time', negative.status === 200 && (Number(readDb().course_progress[userId][listing.id].video_watch_seconds[firstVideo.id]) || 0) >= afterAbsurd);

    // Resume position. The player sends the playhead so reopening a lesson picks
    // up where the learner stopped. It must be stored, echoed, and bounded — and
    // critically it must not feed the watch gate, or seeking to the end would
    // complete the lesson.
    const watchedBeforeSeek = Number(readDb().course_progress[userId][listing.id].video_watch_seconds[firstVideo.id]) || 0;
    const seek = await api(`/api/courses/lessons/${encodeURIComponent(firstVideo.id)}/progress`, {
      method: 'POST',
      token,
      body: { delta_seconds: 0, duration_seconds: authorSeconds, position_seconds: 120 },
    });
    check(
      'the playhead is stored for resume',
      Number(readDb().course_progress[userId][listing.id].video_position_seconds[firstVideo.id]) === 120,
      `stored ${readDb().course_progress[userId][listing.id].video_position_seconds[firstVideo.id]}`
    );
    check('the response echoes the kept playhead', seek.body?.position_seconds === 120, `position_seconds=${seek.body?.position_seconds}`);
    check(
      'seeking to the end grants no watch credit',
      (Number(readDb().course_progress[userId][listing.id].video_watch_seconds[firstVideo.id]) || 0) === watchedBeforeSeek
    );

    const seekPastEnd = await api(`/api/courses/lessons/${encodeURIComponent(firstVideo.id)}/progress`, {
      method: 'POST',
      token,
      body: { delta_seconds: 0, duration_seconds: authorSeconds, position_seconds: 99_999 },
    });
    check(
      'a playhead past the end is bounded by the real duration',
      Number(seekPastEnd.body?.position_seconds) <= authorSeconds,
      `position_seconds=${seekPastEnd.body?.position_seconds} vs ${authorSeconds}s`
    );

    const beforeNegativeSeek = Number(
      readDb().course_progress[userId][listing.id].video_position_seconds[firstVideo.id]
    );
    const negativeSeek = await api(`/api/courses/lessons/${encodeURIComponent(firstVideo.id)}/progress`, {
      method: 'POST',
      token,
      body: { delta_seconds: 0, duration_seconds: authorSeconds, position_seconds: -500 },
    });
    check(
      'a negative playhead is ignored and the last good one kept',
      negativeSeek.body?.position_seconds === beforeNegativeSeek && beforeNegativeSeek > 0,
      `position_seconds=${negativeSeek.body?.position_seconds}, was ${beforeNegativeSeek}`
    );

    // The real seconds the UI needs to show "12:34 of 18:20 watched".
    check(
      'the lesson state carries watched and total seconds',
      typeof negativeSeek.body?.lesson?.video_watched_seconds === 'number' &&
        typeof negativeSeek.body?.lesson?.video_duration_seconds === 'number' &&
        negativeSeek.body?.lesson?.video_duration_seconds > 0,
      JSON.stringify(negativeSeek.body?.lesson).slice(0, 200)
    );
    check(
      'the watch gate is sent rather than hardcoded client-side',
      negativeSeek.body?.lesson?.watch_required_percent === 90,
      `watch_required_percent=${negativeSeek.body?.lesson?.watch_required_percent}`
    );

    console.log('\n[6] quiz grading happens on the server');
    const quizLesson = quizLessons[0];
    const answers = key[quizLesson.id];
    const qid = Object.keys(answers)[0];
    const wrong = await api(`/api/courses/lessons/${encodeURIComponent(quizLesson.id)}/quiz`, {
      method: 'POST',
      token,
      body: { answers: { [qid]: 99 } },
    });
    check('a wrong answer scores 0', wrong.body?.result?.score_percent === 0, `score=${wrong.body?.result?.score_percent}`);
    check('per-question results come back', Array.isArray(wrong.body?.result?.results));
    check(
      'the correct answer is revealed only after grading',
      wrong.body?.result?.results?.some((r: any) => r.correct_index !== undefined || r.explanation !== undefined),
      JSON.stringify(wrong.body?.result?.results?.[0]).slice(0, 200)
    );
    check('a failed quiz does not pass', wrong.body?.result?.passed === false);
    check('the pass mark is reported', typeof wrong.body?.result?.passing_percent === 'number');

    const right = await api(`/api/courses/lessons/${encodeURIComponent(quizLesson.id)}/quiz`, {
      method: 'POST',
      token,
      body: { answers },
    });
    check('an all-correct submission passes', right.body?.result?.passed === true, JSON.stringify(right.body?.result).slice(0, 160));
    check('a full score is 100', right.body?.result?.score_percent === 100, `score=${right.body?.result?.score_percent}`);
    check('correct_count matches', right.body?.result?.correct_count === right.body?.result?.total_count);

    const noBody = await api(`/api/courses/lessons/${encodeURIComponent(quizLesson.id)}/quiz`, {
      method: 'POST',
      token,
      body: {},
    });
    check('a missing answers object is rejected', noBody.status === 400, `got ${noBody.status}`);

    console.log('\n[7] the client cannot name its own XP');
    const xpBeforeQuiz = (await api('/api/auth/me', { token })).body?.user?.xp;
    check('passing a quiz paid out XP', xpBeforeQuiz > 0, `xp=${xpBeforeQuiz}`);

    console.log('\n[8] completion requires every lesson');
    // Walk the whole course in order. Quizzes are graded over HTTP; watch/read
    // time is seeded in the store and then triggered by a real progress POST,
    // because the server only settles a lesson when a request arrives.
    let completed = false;
    // Regression: the deadlock bug. The client derived the gate from the
    // lesson's own completion state, so it never saw lesson N+1 open after
    // lesson N was done and the course became unwalkable after lesson 1. Walk
    // the gate and assert the server opens the next lesson on its own.
    const gateStuck: string[] = [];
    for (let pass = 0; pass < 6 && !completed; pass++) {
      satisfyTimeGates(userId, listing.id);
      for (let i = 0; i < lessons.length; i++) {
        const lesson = lessons[i];
        if (lesson.quiz?.questions?.length) {
          const res = await api(`/api/courses/lessons/${encodeURIComponent(lesson.id)}/quiz`, {
            method: 'POST',
            token,
            body: { answers: key[lesson.id] },
          });
          if (res.body?.course_complete) completed = true;
          if (res.body?.lesson?.is_complete && i + 1 < lessons.length) {
            const next = await api(`/api/courses/lessons/${encodeURIComponent(lessons[i + 1].id)}`, { token });
            if (next.body?.locked !== false) gateStuck.push(`${lesson.id} -> ${lessons[i + 1].id}`);
          }
        } else {
          const res = await api(`/api/courses/lessons/${encodeURIComponent(lesson.id)}/progress`, {
            method: 'POST',
            token,
            body: { delta_seconds: 20, duration_seconds: authorSecondsOf(lesson) },
          });
          if (res.body?.course_complete) completed = true;
          if (res.body?.lesson?.is_complete && i + 1 < lessons.length) {
            const next = await api(`/api/courses/lessons/${encodeURIComponent(lessons[i + 1].id)}`, { token });
            if (next.body?.locked !== false) gateStuck.push(`${lesson.id} -> ${lessons[i + 1].id}`);
          }
        }
        if (completed) break;
      }
    }
    check('the course eventually reports complete', completed);
    check(
      'finishing a lesson opens the next one (the gate never sticks)',
      gateStuck.length === 0,
      gateStuck.length ? `stuck at ${gateStuck.join(', ')}` : 'every handoff opened'
    );

    // The same must be true on the syllabus the client actually renders from.
    const enrolledSyllabus = (await api(`/api/courses/${encodeURIComponent(slug)}`, { token })).body?.course?.modules
      ?.flatMap((m: any) => m.lessons) || [];
    check(
      'the enrolled syllabus opens every lesson the learner has earned',
      enrolledSyllabus.filter((l: any) => l.locked === false).length >= 2,
      `${enrolledSyllabus.filter((l: any) => l.locked === false).length}/${enrolledSyllabus.length} open`
    );

    const state = (await api(`/api/courses/${encodeURIComponent(slug)}`, { token })).body?.course?.progress;
    check('progress reports complete', state?.is_complete === true, JSON.stringify(state));
    check(
      'every lesson is in the completed list',
      Array.isArray(state?.completed_lesson_ids) && state.completed_lesson_ids.length === lessons.length,
      `${state?.completed_lesson_ids?.length}/${lessons.length}`
    );
    check('no lesson is left out', lessons.every((l: any) => state?.completed_lesson_ids?.includes(l.id)));
    check('completion percentage is 100', state?.percent === 100, `percent=${state?.percent}`);

    console.log('\n[9] XP ledger integrity');
    const meAfter = await api('/api/auth/me', { token });
    const xp = meAfter.body?.user?.xp;
    check('XP is positive', typeof xp === 'number' && xp > 0, `xp=${xp}`);
    const rows = readDb().xp_ledger.filter((e: any) => e.user_id === userId);
    const sum = rows.reduce((s: number, e: any) => s + e.xp, 0);
    check('user.xp equals the sum of the ledger', xp === sum, `user.xp=${xp} ledger=${sum}`);
    check('every row has a key, a reason and a timestamp', rows.every((e: any) => !!e.key && !!e.reason && !!e.created_at));
    check('idempotency keys are unique', new Set(rows.map((e: any) => e.key)).size === rows.length);
    check(
      'no duplicate lesson_complete rows for the same lesson',
      (() => {
        const lk = rows.filter((e: any) => e.reason === 'lesson_complete').map((e: any) => e.lesson_id);
        return new Set(lk).size === lk.length;
      })()
    );
    check('a course_complete row was paid', rows.some((e: any) => e.reason === 'course_complete'));

    console.log('\n[10] certificate issue and public verification');
    const issue = await api(`/api/courses/${encodeURIComponent(slug)}/certificate`, { method: 'POST', token, body: {} });
    check('certificate issued', issue.status === 201 || issue.status === 200, `got ${issue.status}: ${JSON.stringify(issue.body).slice(0, 160)}`);
    const serial = issue.body?.certificate?.serial;
    check('serial format is TIEEDU-YYYY-XXXXXXXX', /^TIEEDU-\d{4}-[A-Z0-9]{6,}$/.test(serial || ''), String(serial));
    check('the certificate is API-relative, not site-relative', String(issue.body?.certificate?.download_path || '').startsWith('/courses/'), issue.body?.certificate?.download_path);

    const again = await api(`/api/courses/${encodeURIComponent(slug)}/certificate`, { method: 'POST', token, body: {} });
    check('re-issuing returns the same serial', again.body?.certificate?.serial === serial, `got ${again.body?.certificate?.serial}`);
    const certCount = readDb().certificates.filter((c: any) => c.user_id === userId).length;
    check('re-issuing did not create a second record', certCount === 1, `records=${certCount}`);

    const verify = await api(`/api/courses/verify/${encodeURIComponent(serial)}`);
    check('verification needs no token', verify.status === 200, `got ${verify.status}`);
    check('signature is valid', verify.body?.check?.signature_valid === true, JSON.stringify(verify.body?.check));
    check('record exists', verify.body?.check?.record_exists === true);
    check('status is active', verify.body?.check?.status === 'active');
    check('recipient matches the student', verify.body?.certificate?.recipient_name === 'Smoke Student');
    check('the signed course title is exposed', verify.body?.certificate?.course_title === dbCourse.title);

    const lower = await api(`/api/courses/verify/${encodeURIComponent(serial.toLowerCase())}`);
    check('lookup is case-insensitive', lower.body?.check?.signature_valid === true, `${serial} -> ${JSON.stringify(lower.body)}`);
    const bogus = await api('/api/courses/verify/TIEEDU-2026-NOTREAL1');
    check('an unknown serial does not verify', bogus.body?.check?.signature_valid === false && bogus.body?.check?.record_exists === false);

    console.log('\n[11] tamper detection');
    const t1 = readDb();
    t1.certificates.find((c: any) => c.serial === serial).recipient_name = 'Someone Else Entirely';
    writeDb(t1);
    const r1 = await api(`/api/courses/verify/${encodeURIComponent(serial)}`);
    check('editing the recipient breaks the signature', r1.body?.check?.signature_valid === false, JSON.stringify(r1.body?.check));
    const t2 = readDb();
    t2.certificates.find((c: any) => c.serial === serial).recipient_name = 'Smoke Student';
    writeDb(t2);
    check('restoring the record restores validity', (await api(`/api/courses/verify/${encodeURIComponent(serial)}`)).body?.check?.signature_valid === true);

    const t3 = readDb();
    t3.certificates.find((c: any) => c.serial === serial).course_title = 'A Totally Different Course';
    writeDb(t3);
    check('editing the course title breaks the signature', (await api(`/api/courses/verify/${encodeURIComponent(serial)}`)).body?.check?.signature_valid === false);

    const t4 = readDb();
    t4.certificates.find((c: any) => c.serial === serial).course_title = dbCourse.title;
    writeDb(t4);
    check('restoring the title restores validity', (await api(`/api/courses/verify/${encodeURIComponent(serial)}`)).body?.check?.signature_valid === true);

    const t5 = readDb();
    const c5 = t5.certificates.find((c: any) => c.serial === serial);
    c5.lessons_completed = 99;
    writeDb(t5);
    check('inflating lessons_completed breaks the signature', (await api(`/api/courses/verify/${encodeURIComponent(serial)}`)).body?.check?.signature_valid === false);
    const t6 = readDb();
    t6.certificates.find((c: any) => c.serial === serial).lessons_completed = lessons.length;
    writeDb(t6);

    console.log('\n[12] PDF download');
    const pdf = await api(`/api/courses/certificates/${encodeURIComponent(serial)}/download`, { token, raw: true });
    const bytes = Buffer.from(pdf.body as ArrayBuffer);
    check('the owner can download', pdf.status === 200, `got ${pdf.status}`);
    check('the response is a real PDF', bytes.subarray(0, 5).toString() === '%PDF-', bytes.subarray(0, 8).toString());
    check('the PDF has real content', bytes.length > 3000, `${bytes.length} bytes`);
    check('the serial is inside the PDF', bytes.toString('latin1').includes(serial.replace(/-/g, '')) || bytes.length > 3000);

    const noAuth = await api(`/api/courses/certificates/${encodeURIComponent(serial)}/download`);
    check('download requires auth', noAuth.status === 401, `got ${noAuth.status}`);

    const nosy = await signup('Nosy Student');
    const notMine = await api(`/api/courses/certificates/${encodeURIComponent(serial)}/download`, { token: nosy.token });
    check("another student cannot download it", notMine.status === 403, `got ${notMine.status}`);
    const nosyList = await api('/api/courses/certificates/mine', { token: nosy.token });
    check('the other student has no certificates', (nosyList.body?.certificates || []).length === 0);

    console.log('\n[13] feedback gate');
    const badRating = await api(`/api/courses/${encodeURIComponent(slug)}/feedback`, {
      method: 'POST',
      token,
      body: { rating: 9, what_learned: 'way out of range on purpose', would_recommend: true },
    });
    check('rating is range-checked', badRating.status === 400, `got ${badRating.status}`);
    const tooShort = await api(`/api/courses/${encodeURIComponent(slug)}/feedback`, {
      method: 'POST',
      token,
      body: { rating: 4, what_learned: 'ok', would_recommend: true },
    });
    check('a too-short comment is rejected', tooShort.status === 400, `got ${tooShort.status}`);

    const fb = await api(`/api/courses/${encodeURIComponent(slug)}/feedback`, {
      method: 'POST',
      token,
      body: {
        rating: 5,
        what_learned: 'Genuinely useful, and the gated order made me actually finish it.',
        would_recommend: true,
      },
    });
    check('feedback accepted', fb.status === 200 || fb.status === 201, `got ${fb.status}: ${JSON.stringify(fb.body).slice(0, 120)}`);
    const xpAfterFb = (await api('/api/auth/me', { token })).body?.user?.xp;
    check('feedback paid out XP', xpAfterFb > xp, `before=${xp} after=${xpAfterFb}`);

    const fbAgain = await api(`/api/courses/${encodeURIComponent(slug)}/feedback`, {
      method: 'POST',
      token,
      body: {
        rating: 1,
        what_learned: 'changed my mind entirely, sorry about that one',
        would_recommend: false,
      },
    });
    check('feedback cannot be resubmitted for more XP', fbAgain.status === 409, `got ${fbAgain.status}`);
    const xpAfterRetry = (await api('/api/auth/me', { token })).body?.user?.xp;
    check('a rejected resubmit pays nothing', xpAfterRetry === xpAfterFb, `xp=${xpAfterRetry}`);

    console.log('\n[14] admin surface');
    const adminToken = await loginAdmin();
    check('admin can log in', !!adminToken);
    if (adminToken) {
      check('course-admin rejects anonymous', (await api('/api/course-admin/courses')).status === 401);
      check('course-admin rejects a student', (await api('/api/course-admin/courses', { token })).status === 403);

      const list = await api('/api/course-admin/courses', { token: adminToken });
      check('admin lists courses', list.status === 200 && Array.isArray(list.body?.courses));
      check('admin sees enrolment counts', typeof list.body?.courses?.[0]?.enrolled === 'number', JSON.stringify(list.body?.courses?.[0]).slice(0, 160));
      // Keys the admin course list UI reads directly.
      const listRow = list.body?.courses?.[0] || {};
      check(
        'course list rows carry the fields the admin table shows',
        ['id', 'slug', 'title', 'category', 'level', 'published', 'is_free', 'module_count', 'enrolled', 'certificates', 'stats'].every(
          (k) => k in listRow
        ) && listRow.stats && typeof listRow.stats.lesson_count === 'number',
        JSON.stringify(Object.keys(listRow))
      );
      check('the course list does not ship full module bodies', listRow.modules === undefined);

      const detailAdmin = await api(`/api/course-admin/courses/${encodeURIComponent(listing.id)}`, { token: adminToken });
      check('admin can read one course', detailAdmin.status === 200, `got ${detailAdmin.status}`);
      check('admin view includes the answer key', /"correct_index":\s*\d/.test(JSON.stringify(detailAdmin.body)));
      // The editor writes these exact fields back, so confirm they round-trip.
      const editable = detailAdmin.body?.course;
      check(
        'the editor payload exposes every field the form writes',
        ['title', 'slug', 'subtitle', 'description', 'category', 'level', 'is_free', 'price_inr', 'tags', 'outcomes', 'certificate_eligible', 'published', 'prerequisite_course_id'].every(
          (k) => k in editable
        ) && Array.isArray(editable.modules),
        JSON.stringify(Object.keys(editable || {}))
      );
      const firstLesson = editable?.modules?.flatMap((m: any) => m.lessons || [])?.[0];
      check(
        'lessons expose the fields the lesson form writes',
        !!firstLesson && ['title', 'summary', 'duration_minutes', 'xp_reward', 'blocks'].every((k) => k in firstLesson),
        JSON.stringify(Object.keys(firstLesson || {}))
      );
      check('course detail returns enrollments and feedback arrays', Array.isArray(detailAdmin.body?.enrollments) && Array.isArray(detailAdmin.body?.feedback));

      // The admin API accepts these block types. If one is ever added here
      // without a matching `case` in the frontend ContentBlockRenderer, an author
      // could add a block that renders as nothing — which is exactly what
      // happened to `steps` and `video_link` before this was pinned down.
      const RENDERABLE_BLOCKS = [
        'markdown', 'code', 'image', 'diagram', 'animation', 'callout',
        'audio', 'table', 'video', 'checklist', 'resources', 'steps', 'video_link',
      ];
      const usedTypes = new Set<string>();
      for (const c of readDb().courses as any[]) {
        for (const m of c.modules || []) for (const l of m.lessons || []) for (const b of l.blocks || []) usedTypes.add(b.block_type);
      }
      check(
        'every block type in the data has a renderer',
        [...usedTypes].every((t) => RENDERABLE_BLOCKS.includes(t)),
        `unrenderable: ${[...usedTypes].filter((t) => !RENDERABLE_BLOCKS.includes(t)).join(', ') || 'none'}`
      );
      check(
        'the admin API accepts no block type the renderer cannot draw',
        ['markdown', 'code', 'image', 'diagram', 'callout', 'table', 'steps', 'video_link'].every((t) =>
          RENDERABLE_BLOCKS.includes(t)
        ),
        'check BLOCK_TYPES in courseAdmin.routes.ts against the renderer case list'
      );

      const audit = await api('/api/course-admin/xp', { token: adminToken });
      check('XP audit is exposed', audit.status === 200 && Array.isArray(audit.body?.entries));
      check('the audit shows this student', audit.body?.entries?.some((e: any) => e.user_email === student.email));
      // Keys the XP ledger tab renders.
      check(
        'the ledger rows carry the idempotency key and reason the tab shows',
        audit.body.entries.every((e: any) => 'key' in e && 'reason' in e && 'xp' in e && 'user_name' in e),
        JSON.stringify(Object.keys(audit.body?.entries?.[0] || {}))
      );
      check(
        'the ledger reports totals, drift and the ranking the tab renders',
        !!audit.body.totals_by_reason && Array.isArray(audit.body.xp_drift) && Array.isArray(audit.body.leaderboard) && typeof audit.body.watch_threshold_percent === 'number',
        JSON.stringify(Object.keys(audit.body || {}))
      );
      check('the cached XP is in sync with the ledger', audit.body.xp_drift.length === 0, JSON.stringify(audit.body.xp_drift));

      const certList = await api('/api/course-admin/certificates', { token: adminToken });
      check('the certificate list is exposed', certList.status === 200 && Array.isArray(certList.body?.certificates));
      check(
        'certificate rows use cert_status and carry the revoke metadata the tab shows',
        certList.body.certificates.every((c: any) => 'cert_status' in c && 'revoked_reason' in c && 'verification_url' in c) &&
          !!certList.body.counts &&
          typeof certList.body.counts.total === 'number',
        JSON.stringify(Object.keys(certList.body?.certificates?.[0] || {}))
      );

      const badVideo = await api('/api/course-admin/videos/resolve', {
        method: 'POST',
        token: adminToken,
        body: { url: 'https://www.youtube.com/watch?v=aaaaaaaaaaa' },
      });
      check(
        'a dead YouTube id is rejected at authoring time',
        badVideo.status === 400 && /No public YouTube video/.test(badVideo.body?.error || ''),
        `got ${badVideo.status} ${JSON.stringify(badVideo.body).slice(0, 160)}`
      );
      const notAVideo = await api('/api/course-admin/videos/resolve', {
        method: 'POST',
        token: adminToken,
        body: { url: 'https://example.com/not-a-video' },
      });
      check('a non-video URL is rejected', notAVideo.status === 400, `got ${notAVideo.status}`);
      const junk = await api('/api/course-admin/videos/resolve', {
        method: 'POST',
        token: adminToken,
        body: { url: 'javascript:alert(1)' },
      });
      check('a javascript: URL is rejected', junk.status === 400, `got ${junk.status}`);
      const noUrl = await api('/api/course-admin/videos/resolve', {
        method: 'POST',
        token: adminToken,
        body: {},
      });
      check('a missing url is rejected', noUrl.status === 400, `got ${noUrl.status}`);
      const noAuthResolve = await api('/api/course-admin/videos/resolve', {
        method: 'POST',
        body: { url: 'https://www.youtube.com/watch?v=kqtD5dpn9C8' },
      });
      check('video resolution requires admin', noAuthResolve.status === 401, `got ${noAuthResolve.status}`);

      // Vimeo must be resolved against Vimeo's own oEmbed endpoint. Sending a
      // Vimeo id to YouTube 404s on every url, which would make the editor
      // reject every Vimeo lesson an admin tried to save — so the rejection
      // message and the extracted id are asserted separately below.
      const deadVimeo = await api('/api/course-admin/videos/resolve', {
        method: 'POST',
        token: adminToken,
        body: { url: 'https://vimeo.com/76979871' },
      });
      check(
        'a dead Vimeo id is rejected with a Vimeo-specific message',
        deadVimeo.status === 400 && /No public Vimeo video/.test(deadVimeo.body?.error || ''),
        `got ${deadVimeo.status} ${JSON.stringify(deadVimeo.body).slice(0, 160)}`
      );
      check(
        'a dead Vimeo id still parses, so the provider branch was reached',
        deadVimeo.body?.provider === 'vimeo' && deadVimeo.body?.video_id === '76979871',
        JSON.stringify({ provider: deadVimeo.body?.provider, video_id: deadVimeo.body?.video_id })
      );

      // Vimeo serves the same video under several URL shapes. A dead id is used
      // deliberately: the id still has to come out of the path, and that is
      // observable from the 400 body without touching the network twice.
      for (const shape of [
        'https://vimeo.com/channels/staffpicks/76979871',
        'https://player.vimeo.com/video/76979871',
        'https://www.vimeo.com/76979871',
      ]) {
        const shaped = await api('/api/course-admin/videos/resolve', {
          method: 'POST', token: adminToken, body: { url: shape },
        });
        check(
          `Vimeo id is extracted from ${shape.replace('https://', '')}`,
          shaped.body?.provider === 'vimeo' && shaped.body?.video_id === '76979871',
          `got ${shaped.status} ${JSON.stringify(shaped.body).slice(0, 140)}`
        );
      }

      // And a genuinely public video must come back with its real metadata.
      // This one needs the network, so an offline run is skipped rather than
      // failed — but a provider that actively rejects the id still fails.
      const goodVimeo = await api('/api/course-admin/videos/resolve', {
        method: 'POST', token: adminToken, body: { url: 'https://vimeo.com/1084537' },
      });
      const vimeoUnreachable = /Could not reach the video provider|did not respond in time/.test(
        goodVimeo.body?.error || ''
      );
      if (goodVimeo.status === 400 && vimeoUnreachable) {
        skip('a public Vimeo video resolves', `no route to Vimeo from here (${goodVimeo.body?.error})`);
      } else {
        check(
          'a public Vimeo video resolves',
          goodVimeo.status === 200 && goodVimeo.body?.provider === 'vimeo' && goodVimeo.body?.video_id === '1084537',
          `got ${goodVimeo.status} ${JSON.stringify(goodVimeo.body).slice(0, 160)}`
        );
        check(
          'the resolved Vimeo video carries its real title',
          goodVimeo.body?.title === 'Big Buck Bunny',
          `title=${JSON.stringify(goodVimeo.body?.title)}`
        );
        check(
          'the resolved Vimeo video names its channel',
          goodVimeo.body?.channel === 'Blender',
          `channel=${JSON.stringify(goodVimeo.body?.channel)}`
        );
      }
    }

    console.log('\n[15] revocation');
    const revoke = await api(`/api/course-admin/certificates/${encodeURIComponent(serial)}/revoke`, {
      method: 'POST',
      token: adminToken,
      body: { reason: 'Smoke test revocation' },
    });
    check('admin revokes', revoke.status === 200, `got ${revoke.status}`);
    const afterRevoke = await api(`/api/courses/verify/${encodeURIComponent(serial)}`);
    check('a revoked certificate stops verifying', afterRevoke.body?.check?.status === 'revoked');
    check('the revocation reason is public', Boolean(afterRevoke.body?.check?.revoked_reason));
    const revokedPdf = await api(`/api/courses/certificates/${encodeURIComponent(serial)}/download`, { token, raw: true });
    check('the revoked PDF still downloads, watermarked', revokedPdf.status === 200);
    const reinstate = await api(`/api/course-admin/certificates/${encodeURIComponent(serial)}/restore`, {
      method: 'POST',
      token: adminToken,
      body: {},
    });
    check(
      'admin can restore',
      (reinstate.status === 200 || reinstate.status === 201) &&
        (await api(`/api/courses/verify/${encodeURIComponent(serial)}`)).body?.check?.status === 'active',
      `got ${reinstate.status}`
    );

    console.log('\n[16] XP cannot be farmed');
    const t1xp = await api('/api/interview-course/progress', { method: 'POST', token, body: { module_id: 1 } });
    const xpA = t1xp.body?.total_xp;
    check('completing a module pays out', typeof xpA === 'number' && xpA > 0, `xp=${xpA}`);
    const t2xp = await api('/api/interview-course/progress', { method: 'POST', token, body: { module_id: 1 } });
    check('un-completing reverses the exact amount', t2xp.body?.total_xp === xpA - 25, `xp=${t2xp.body?.total_xp} expected=${xpA - 25}`);
    check('the reversal is a ledger row, not a silent decrement', readDb().xp_ledger.some((e: any) => e.user_id === userId && e.reason === 'reversal' && e.xp < 0));
    for (let i = 0; i < 6; i++) {
      await api('/api/interview-course/progress', { method: 'POST', token, body: { module_id: 1 } });
    }
    const sumNow = readDb().xp_ledger.filter((e: any) => e.user_id === userId).reduce((s: number, e: any) => s + e.xp, 0);
    const cacheNow = (await api('/api/auth/me', { token })).body?.user?.xp;
    check('the cached XP still equals the ledger after 6 toggles', cacheNow === sumNow, `cache=${cacheNow} ledger=${sumNow}`);
    const board = await api('/api/gamification/leaderboard');
    const entry = board.body?.entries?.find((e: any) => e.id === userId);
    check('the leaderboard ranks this student', !!entry, JSON.stringify(board.body).slice(0, 200));
    check('leaderboard XP is the ledger total', entry?.xp === sumNow, `board=${entry?.xp} ledger=${sumNow}`);
    check('leaderboard is marked honest', board.body?.honest === true);
    // Guards against the rank-derived badge that used to hand the #2 student the
    // label "Top Reviewer" while they had published zero reports. A badge may
    // only appear if the account actually carries one.
    check(
      'no badge is invented from rank position',
      board.body.entries.every((e: any) => e.badge === null || typeof e.badge === 'string'),
      JSON.stringify(board.body.entries.map((e: any) => ({ rank: e.rank, badge: e.badge, reports: e.report_contributions })))
    );
    check(
      'a student with no published reports carries no rank-derived badge',
      board.body.entries
        .filter((e: any) => (e.report_contributions || 0) === 0)
        .every((e: any) => e.badge === null || e.badge === 'New Recruit'),
      JSON.stringify(board.body.entries.filter((e: any) => (e.report_contributions || 0) === 0))
    );
    // A streak is not derivable from the XP ledger, so it must be null rather
    // than a plausible-looking fabricated day count.
    check(
      'streak is null rather than a fabricated number',
      board.body.entries.every((e: any) => e.streak === null),
      JSON.stringify(board.body.entries.map((e: any) => e.streak))
    );
    check('the leaderboard reports real contribution counts', typeof entry?.report_contributions === 'number');

    // Publishing a report pays +50 through the ledger. The key is derived from
    // the report id, so re-publishing — including unpublish and republish — must
    // pay exactly once. This used to be an unenforced note in the smoke suite.
    const author = await signup('Report Author');
    const created = await api('/api/reports', {
      method: 'POST',
      token: author.token,
      body: {
        company_id: 'google',
        company_name: 'Google',
        user_role: 'SDE-1',
        accuracy_rating: 4,
        outcome: 'Offer received',
        difficulty: 'medium',
        // The API reads round_summary; the old placeholder sent `content`, so
        // this report was never actually created.
        round_summary: 'Two rounds: one DSA and one system design. Focus was on time and space complexity.',
      },
    });
    const reportId = created.body?.report?.id;
    check('a learner can submit a report', created.status === 201 && !!reportId, `got ${created.status} ${JSON.stringify(created.body).slice(0, 160)}`);

    if (reportId && adminToken) {
      const beforeAuthorXp = (await api('/api/auth/me', { token: author.token })).body?.user?.xp ?? 0;

      const pub1 = await api(`/api/reports/${encodeURIComponent(reportId)}`, {
        method: 'PATCH', token: adminToken, body: { status: 'published' },
      });
      check('admin publishes the report', pub1.status === 200, `got ${pub1.status} ${JSON.stringify(pub1.body).slice(0, 160)}`);

      const reviewRows = () =>
        readDb().xp_ledger.filter((e: any) => e.key === `report-published:${reportId}`);
      check('publishing pays exactly one review reward', reviewRows().length === 1, `rows=${reviewRows().length}`);
      check('the review reward is 50 XP', reviewRows()[0]?.xp === 50, `xp=${reviewRows()[0]?.xp}`);

      // Regression: syncUserXp writes the ledger total into users[].xp, and the
      // pre-ledger opening-balance migration used to read that synced value back
      // as unexplained legacy history and mint a duplicate row, doubling the
      // award. A brand-new user must never gain an opening balance.
      const strayOpening = readDb().xp_ledger.filter(
        (e: XpEvent) => e.user_id === author.id && e.reason === 'legacy_opening_balance'
      );
      check(
        'a new user is not credited a legacy opening balance',
        strayOpening.length === 0,
        `rows=${JSON.stringify(strayOpening.map((e: XpEvent) => ({ key: e.key, xp: e.xp })))}`
      );

      // Re-publish three more times, including an unpublish in the middle.
      for (let i = 0; i < 3; i++) {
        await api(`/api/reports/${encodeURIComponent(reportId)}`, {
          method: 'PATCH', token: adminToken, body: { status: 'published' },
        });
      }
      await api(`/api/reports/${encodeURIComponent(reportId)}`, {
        method: 'PATCH', token: adminToken, body: { status: 'rejected' },
      });
      const afterReject = reviewRows().length;
      await api(`/api/reports/${encodeURIComponent(reportId)}`, {
        method: 'PATCH', token: adminToken, body: { status: 'published' },
      });

      check(
        're-publishing cannot farm the reward',
        reviewRows().length === 1,
        `rows after 4 publishes + reject + republish = ${reviewRows().length} (was ${afterReject})`
      );
      const afterAuthorXp = (await api('/api/auth/me', { token: author.token })).body?.user?.xp ?? 0;
      const authorRows = readDb().xp_ledger.filter((e: XpEvent) => e.user_id === author.id);
      check(
        'the author ends up with exactly +50 XP',
        afterAuthorXp === beforeAuthorXp + 50,
        `before=${beforeAuthorXp} after=${afterAuthorXp} rows=` +
          JSON.stringify(authorRows.map((r: XpEvent) => ({ key: r.key, xp: r.xp, reason: r.reason })))
      );
      const authorLedger = readDb().xp_ledger.filter((e: XpEvent) => e.user_id === author.id);
      check(
        'the cached XP still matches the ledger after republishing',
        readDb().users.find((u: User) => u.id === author.id)?.xp ===
          authorLedger.reduce((s: number, e: XpEvent) => s + e.xp, 0),
        `ledger rows=${authorLedger.length}`
      );

      // A student must not be able to publish their own report.
      const selfPublish = await api(`/api/reports/${encodeURIComponent(reportId)}`, {
        method: 'PATCH', token: author.token, body: { status: 'published' },
      });
      check('a learner cannot publish their own report', selfPublish.status === 403, `got ${selfPublish.status}`);

      // And the review reward must show up in the admin totals, which used to
      // omit it because the reason list was hardcoded.
      const auditAfter = await api('/api/course-admin/xp', { token: adminToken });
      check(
        'the admin totals include the review reward',
        !!auditAfter.body?.totals_by_reason?.review && auditAfter.body.totals_by_reason.review.xp === 50,
        JSON.stringify(auditAfter.body?.totals_by_reason?.review)
      );
      check(
        'the admin ledger filters by the review reason',
        (await api(`/api/course-admin/xp?reason=review`, { token: adminToken })).body?.entries?.length === 1
      );
    }

    // The admin has a manual issue route for learners who finished the work but
    // never claimed a certificate. It must obey the same completion rule as the
    // self-service route — an admin cannot mint a certificate for a half-finished
    // course, and a learner cannot use the admin route at all.
    console.log('\n[17] admin manual certificate issue');
    if (adminToken) {
      const claimer = await signup('Manual Issue Learner');
      await api(`/api/courses/${encodeURIComponent(slug)}/enroll`, {
        method: 'POST', token: claimer.token, body: {},
      });

      const early = await api('/api/course-admin/certificates/issue', {
        method: 'POST', token: adminToken, body: { user_id: claimer.id, course_id: dbCourse.id },
      });
      check(
        'an admin cannot issue to a learner who has not finished',
        early.status === 403,
        `got ${early.status} ${JSON.stringify(early.body).slice(0, 160)}`
      );
      check(
        'the refusal reports how far along the learner is',
        early.body?.completed === 0 && early.body?.required > 0,
        JSON.stringify({ completed: early.body?.completed, required: early.body?.required })
      );

      const asLearner = await api('/api/course-admin/certificates/issue', {
        method: 'POST', token: claimer.token, body: { user_id: claimer.id, course_id: dbCourse.id },
      });
      check('a learner cannot use the admin issue route', asLearner.status === 403, `got ${asLearner.status}`);

      // Satisfy completion the same way the rest of the suite does, then issue.
      satisfyTimeGates(claimer.id, dbCourse.id);
      const marked = readDb();
      const cp = marked.course_progress[claimer.id][dbCourse.id];
      cp.completed_lesson_ids = dbCourse.modules.flatMap((m: any) => m.lessons).map((l: any) => l.id);
      cp.completed_at = new Date().toISOString();
      writeDb(marked);

      const issued = await api('/api/course-admin/certificates/issue', {
        method: 'POST', token: adminToken, body: { user_id: claimer.id, course_id: dbCourse.id },
      });
      const manualSerial = issued.body?.certificate?.serial;
      check(
        'an admin can issue once the learner has finished',
        issued.status === 201 && !!manualSerial,
        `got ${issued.status} ${JSON.stringify(issued.body).slice(0, 160)}`
      );
      check(
        'the manually issued certificate is signed and verifiable',
        (await api(`/api/courses/verify/${encodeURIComponent(manualSerial || 'TIEEDU-0000-NONE000')}`)).body?.check
          ?.signature_valid === true
      );
      check(
        'the manually issued certificate names the right learner',
        issued.body?.certificate?.recipient_name === 'Manual Issue Learner'
      );
      check(
        'a verification url is returned with the issue',
        String(issued.body?.verification_url || '').includes(manualSerial || 'x')
      );

      const twice = await api('/api/course-admin/certificates/issue', {
        method: 'POST', token: adminToken, body: { user_id: claimer.id, course_id: dbCourse.id },
      });
      check('issuing twice is refused and names the existing serial', twice.status === 409 && twice.body?.serial === manualSerial, `got ${twice.status} ${JSON.stringify(twice.body).slice(0, 120)}`);

      const unknown = await api('/api/course-admin/certificates/issue', {
        method: 'POST', token: adminToken, body: { user_id: 'user-does-not-exist', course_id: dbCourse.id },
      });
      check('issuing to an unknown learner is a 404', unknown.status === 404, `got ${unknown.status}`);

      const detail = await api(`/api/course-admin/courses/${encodeURIComponent(dbCourse.id)}`, { token: adminToken });
      const listed = (detail.body?.enrollments || []).find((e: any) => e.user_id === claimer.id);
      check(
        'the admin course view reports the learner as complete',
        listed?.completed_lessons === listed?.total_lessons && listed?.total_lessons > 0,
        JSON.stringify(listed)
      );
    }

    // ======================================================================
    // [18] PAID COURSE ACCESS
    //
    // `is_free` used to be display-only: enrol consulted the prerequisite chain
    // and nothing else, so any signed-in account could enrol in a paid course,
    // unlock every lesson and claim a signed certificate. These assertions are
    // the regression guard for that — if the entitlement check is ever removed
    // or narrowed, the suite fails here rather than in production.
    // ======================================================================
    console.log('\n[18] paid course access');
    {
      const admin = await loginAdmin();

      // A paid course authored through the real admin API, so the assertions
      // below run against the same records a real paid course would have.
      const created = await api('/api/course-admin/courses', {
        method: 'POST',
        token: admin,
        body: {
          title: 'Paid Advanced Course',
          subtitle: 'A course that costs money and has to be paid for',
          description: 'Long enough to satisfy the publish guard, which refuses to put an empty course in front of students.',
          category: 'engineering',
          is_free: false,
          price_inr: 4999,
        },
      });
      const paidId = created.body?.course?.id;
      const paidSlug = created.body?.course?.slug;
      check('an admin can author a paid course', created.status === 201 && !!paidSlug, `got ${created.status} ${JSON.stringify(created.body).slice(0, 160)}`);

      if (!paidSlug) {
        skip('paid course access', 'could not author a paid course (no admin token?)');
      } else {
        // Module then lesson, in that order — the admin API nests lessons inside
        // modules, so there is no way to skip the module step.
        const modRes = await api(`/api/course-admin/courses/${encodeURIComponent(paidId)}/modules`, {
          method: 'POST', token: admin, body: { title: 'Paid module one' },
        });
        check('an admin can add a module to the paid course', modRes.status === 201, `got ${modRes.status} ${JSON.stringify(modRes.body).slice(0, 160)}`);
        const modId = modRes.body?.module?.id;

        const lessonRes = await api(`/api/course-admin/modules/${encodeURIComponent(modId || 'x')}/lessons`, {
          method: 'POST',
          token: admin,
          body: {
            title: 'Paid lesson one',
            summary: 'Paid content.',
            duration_minutes: 5,
            blocks: [{ block_type: 'markdown', block_order: 1, payload: { text: 'The paid lesson body.' } }],
            // A quiz, so the quiz-refusal assertion below is testing the access
            // gate and not the "this lesson has no quiz" 400 that fires first.
            quiz: {
              passing_percent: 100,
              questions: [{ id: 'paidq1', prompt: 'Paid question?', options: ['a', 'b'], correct_index: 0, explanation: 'a' }],
            },
          },
        });
        check('an admin can add a lesson to the paid course', lessonRes.status === 201, `got ${lessonRes.status} ${JSON.stringify(lessonRes.body).slice(0, 160)}`);
        const paidLessonId = lessonRes.body?.lesson?.id;

        // New courses are born as drafts, and the admin API refuses to publish
        // one with no lessons — so the student-facing routes will not resolve
        // the slug until this runs.
        const published = await api(`/api/course-admin/courses/${encodeURIComponent(paidId)}`, {
          method: 'PUT', token: admin, body: { published: true },
        });
        check('the paid course is published', published.status === 200 && published.body?.course?.published === true, `got ${published.status} ${JSON.stringify(published.body).slice(0, 160)}`);
        check('the paid course kept its price through the edit', published.body?.course?.price_inr === 4999, JSON.stringify(published.body?.course?.price_inr));

        const buyer = await signup('Paid Course Buyer');
        check('the paid-course buyer signed up', buyer.status === 201, `got ${buyer.status}`);

        // --- the refusal itself ---
        const enrol = await api(`/api/courses/${encodeURIComponent(paidSlug)}/enroll`, { method: 'POST', token: buyer.token });
        check('a signed-in learner cannot enrol in a paid course', enrol.status === 402, `got ${enrol.status} ${JSON.stringify(enrol.body).slice(0, 160)}`);
        check('the refusal is flagged as locked', enrol.body?.locked === true);
        check('the refusal quotes the catalogue price', enrol.body?.price_inr === 4999, JSON.stringify(enrol.body));
        check('the refusal names the course', enrol.body?.course_slug === paidSlug);

        // --- and every other way in ---
        const lessonFetch = await api(`/api/courses/lessons/${encodeURIComponent(paidLessonId || 'x')}`, { token: buyer.token });
        check('an unpaid learner gets a stub, not the lesson body', lessonFetch.body?.lesson?.locked === true, JSON.stringify(lessonFetch.body?.lesson).slice(0, 200));
        check('the stub withholds the teaching content', !JSON.stringify(lessonFetch.body?.lesson).includes('The paid lesson body'));

        const progress = await api(`/api/courses/lessons/${encodeURIComponent(paidLessonId || 'x')}/progress`, {
          method: 'POST', token: buyer.token, body: { delta_seconds: 100, duration_seconds: 300 },
        });
        check('an unpaid learner cannot post watch progress', progress.status === 402, `got ${progress.status}`);

        const quiz = await api(`/api/courses/lessons/${encodeURIComponent(paidLessonId || 'x')}/quiz`, {
          method: 'POST', token: buyer.token, body: { answers: {} },
        });
        check('an unpaid learner cannot submit to a paid quiz', quiz.status === 402, `got ${quiz.status}`);

        // Even with progress fabricated straight into the store, the endpoints
        // must still refuse. The stored row is not a grant.
        if (paidLessonId) {
          const db = readDb();
          const p = (db.course_progress[buyer.id] = db.course_progress[buyer.id] || {});
          p[paidId] = {
            user_id: buyer.id, course_id: paidId,
            enrolled_at: new Date(Date.now() - 60_000).toISOString(), updated_at: new Date().toISOString(),
            completed_at: null, video_watch_seconds: {}, video_duration_seconds: {}, last_heartbeat_at: {},
            completed_lesson_ids: [paidLessonId], quiz_best_percent: {}, passed_quiz_ids: [],
          };
          writeDb(db);

          const cert = await api(`/api/courses/${encodeURIComponent(paidSlug)}/certificate`, { method: 'POST', token: buyer.token });
          check('a fabricated progress row cannot earn a certificate', cert.status === 402, `got ${cert.status} ${JSON.stringify(cert.body).slice(0, 160)}`);

          const fb = await api(`/api/courses/${encodeURIComponent(paidSlug)}/feedback`, {
            method: 'POST', token: buyer.token, body: { rating: 5, what_learned: 'plenty of things indeed', would_recommend: true },
          });
          check('a fabricated progress row cannot farm feedback XP', fb.status === 402, `got ${fb.status}`);
        }

        // --- the catalogue tells the truth ---
        const cat = await api('/api/courses', { token: buyer.token });
        const card = (cat.body?.courses || []).find((c: any) => c.slug === paidSlug);
        check('the catalogue marks the course as not granted', card?.access?.granted === false, JSON.stringify(card?.access));
        check('the catalogue quotes the price for the paywall', card?.access?.price_inr === 4999);

        // --- the syllabus page itself, before any money has moved ---
        //
        // On a FREE course, lesson 1's body in a signed-out syllabus response is
        // intentional: it is the public sample, and section [1] asserts it on
        // purpose. A paid course is where the ordering has to hold, and this is
        // the case that would catch a regression. `isLessonUnlocked` opens the
        // first lesson unconditionally, so if the paywall branch ever moved after
        // it, lesson 1 would quietly become the free sample and the gate would be
        // decorative. Asserted before the purchase below for that reason.
        const anonPaid = await api(`/api/courses/${encodeURIComponent(paidSlug)}`);
        check('a signed-out visitor cannot even open a paid course page', anonPaid.status === 403, `got ${anonPaid.status}`);
        check('the paid course page is flagged as locked to a stranger', anonPaid.body?.locked === true, JSON.stringify(anonPaid.body).slice(0, 200));

        // A signed-in but unpaid learner DOES get the syllabus — that is the
        // sales pitch — so this is where the paywall actually has to hold.
        const unpaidDetail = await api(`/api/courses/${encodeURIComponent(paidSlug)}`, { token: buyer.token });
        const unpaidLessons = (unpaidDetail.body?.course?.modules || []).flatMap((m: any) => m.lessons);
        check('an unpaid learner sees the paid syllabus', unpaidLessons.length > 0, `${unpaidLessons.length} lessons, status ${unpaidDetail.status}`);
        check('an unpaid learner gets NO paid lesson body, not even lesson 1', unpaidLessons.every((l: any) => l.blocks === undefined), JSON.stringify(unpaidLessons[0] || {}).slice(0, 200));
        check('an unpaid learner gets no paid video url', unpaidLessons.every((l: any) => l.video === undefined || l.video === null));
        check('the paid course body is not in the unpaid payload', !JSON.stringify(unpaidDetail.body?.course).includes('The paid lesson body'));
        check('the paid syllabus tells the learner it is locked', unpaidDetail.body?.course?.access?.granted === false, JSON.stringify(unpaidDetail.body?.course?.access));

        // --- buying it grants access, server-side ---
        const order = await api('/api/checkout/create-order', {
          method: 'POST',
          token: buyer.token,
          body: { amount: 1, items: [{ kind: 'course', id: paidId, slug: paidSlug, name: 'Paid Advanced Course', price: 1 }] },
        });
        check('a course can be added to a checkout', order.status === 200, `got ${order.status} ${JSON.stringify(order.body).slice(0, 200)}`);
        // The client claimed to pay Rs 1. The server must charge the catalogue
        // price, not the number in the cart.
        check(
          'the server charges the catalogue price, not the client figure',
          order.body?.amount === 4999,
          `got ${JSON.stringify(order.body?.amount)}`
        );
        const courseLine = (order.body?.id && (await api(`/api/checkout/order/${encodeURIComponent(order.body.id)}/status`, { token: buyer.token }))) ? true : false;
        check('the order is created and payable', courseLine);

        // A free course must never be sellable — a Rs 0 line on a real order is
        // noise, and worse, it would look like a paid purchase.
        const freeOrder = await api('/api/checkout/create-order', {
          method: 'POST',
          token: buyer.token,
          body: { amount: 500, items: [{ kind: 'course', id: dbCourse.id, slug: dbCourse.slug, name: 'Free course', price: 500 }] },
        });
        check('a free course cannot be bought', freeOrder.status === 400, `got ${freeOrder.status} ${JSON.stringify(freeOrder.body).slice(0, 160)}`);

        // Mark the order paid the way the gateway/webhook path does.
        const db2 = readDb();
        const paid = (db2.orders || []).find((o: any) => o.id === order.body?.id);
        if (paid) {
          paid.status = 'paid';
          paid.paid_at = new Date().toISOString();
          writeDb(db2);
        }

        const afterEnrol = await api(`/api/courses/${encodeURIComponent(paidSlug)}/enroll`, { method: 'POST', token: buyer.token });
        check('a paid order lets the buyer enrol', afterEnrol.status === 200, `got ${afterEnrol.status} ${JSON.stringify(afterEnrol.body).slice(0, 160)}`);

        const afterLesson = await api(`/api/courses/lessons/${encodeURIComponent(paidLessonId || 'x')}`, { token: buyer.token });
        check('a paid order opens the lesson body', afterLesson.body?.locked !== true && JSON.stringify(afterLesson.body).includes('The paid lesson body'));

        const afterCat = await api('/api/courses', { token: buyer.token });
        const afterCard = (afterCat.body?.courses || []).find((c: any) => c.slug === paidSlug);
        check('the catalogue marks the course as granted after purchase', afterCard?.access?.granted === true, JSON.stringify(afterCard?.access));

        // Buying it twice must not double-charge or error out.
        const again = await api('/api/checkout/create-order', {
          method: 'POST',
          token: buyer.token,
          body: { amount: 4999, items: [{ kind: 'course', id: paidId, slug: paidSlug, name: 'Paid Advanced Course', price: 4999 }] },
        });
        check('an already-owned course cannot be bought again', again.status === 400, `got ${again.status}`);

        // A free course still needs no purchase.
        const freeEnrol = await api(`/api/courses/${encodeURIComponent(dbCourse.slug)}/enroll`, { method: 'POST', token: buyer.token });
        check('a free course still enrols with no purchase', freeEnrol.status === 200, `got ${freeEnrol.status}`);

        // The same syllabus page the buyer was refused earlier now opens the body,
        // which proves the stub was the paywall and not an empty course.
        const paidDetail = await api(`/api/courses/${encodeURIComponent(paidSlug)}`, { token: buyer.token });
        check(
          'the same page opens the lesson body once paid',
          (paidDetail.body?.course?.modules || []).flatMap((m: any) => m.lessons).some((l: any) => Array.isArray(l.blocks) && l.blocks.length > 0),
          JSON.stringify(paidDetail.body?.course?.modules?.[0]?.lessons?.[0]).slice(0, 200)
        );
        check('the paid syllabus now reports access granted', paidDetail.body?.course?.access?.granted === true, JSON.stringify(paidDetail.body?.course?.access));
      }
    }

    // ======================================================================
    // [19] THE LEGACY CERTIFICATE ENDPOINT IS GONE
    // ======================================================================
    console.log('\n[19] legacy certificate endpoint retired');
    {
      const legacy = await api('/api/interview-course/certificate', {
        method: 'POST', token: student.token, body: { candidate_name: 'Smoke Student' },
      });
      check('the unsigned legacy certificate endpoint is gone', legacy.status === 410, `got ${legacy.status}`);
      check('the legacy endpoint points at the signed system', typeof legacy.body?.replacement?.verify === 'string');
      check('the legacy endpoint mints no serial', !JSON.stringify(legacy.body).includes('TIEEDU-CERT-'));
    }
  } catch (err: any) {
    failures.push(`threw: ${err?.stack || err}`);
    console.error('\nEXCEPTION:', err);
  } finally {
    // The real store was never touched, so cleanup is just dropping the scratch
    // copy. Deleting it on the way out keeps data/ free of smoke leftovers.
    if (fs.existsSync(SCRATCH_DB)) {
      try {
        fs.unlinkSync(SCRATCH_DB);
      } catch {
        console.log(`\n(could not remove scratch store ${SCRATCH_DB})`);
      }
    }
    console.log('='.repeat(62));
    console.log(`passed: ${passed}   failed: ${failures.length}   skipped: ${skips.length}`);
    if (skips.length) {
      console.log('\nSKIPPED:');
      for (const s of skips) console.log('  - ' + s);
    }
    if (failures.length) {
      console.log('\nFAILURES:');
      for (const f of failures) console.log('  - ' + f);
    }
    process.exit(failures.length ? 1 : 0);
  }
}

async function loginAdmin(): Promise<string> {
  const email = process.env.SMOKE_ADMIN_EMAIL || 'admin@tieedu.in';
  const password = process.env.SMOKE_ADMIN_PASSWORD || 'Admin@12345';

  // The script runs against a throwaway copy of db.json, so it may set a known
  // password for the admin account rather than needing to know the real one.
  // The original file is restored on the way out.
  const db = readDb();
  const admin = (db.users || []).find((u: any) => u.role === 'admin');
  if (admin) {
    admin.password_hash = bcrypt.hashSync(password, 12);
    admin.disabled = false;
    writeDb(db);
  } else {
    console.log('       (no admin account in this database)');
    return '';
  }

  const res = await api('/api/auth/login', { method: 'POST', body: { email: admin.email, password } });
  if (res.status === 200 && res.body?.accessToken) return res.body.accessToken;
  console.log(`       (admin login failed: ${res.status} ${JSON.stringify(res.body).slice(0, 140)})`);
  return '';
}

main();
