/**
 * Phase 1 — MOBILE_APP_UI_PLAN.md §1.4. Route transition geometry.
 *
 * The component that plays these numbers cannot be checked by looking at it: a
 * push that travels 14px instead of 24px, or that animates on a shallow
 * `?m=` change, looks plausible in every screenshot and is wrong on a device. So
 * the keyframes live in `src/lib/routeTransition.ts` as pure data and the numbers
 * are asserted here, against the plan's own wording.
 */
import {
  ROUTE_PUSH_DIM,
  ROUTE_PUSH_PX,
  ROUTE_RISE_PX,
  ROUTE_TRANSITION_MS,
  routeTransitionKind,
  routeTransitionSpec,
} from '../src/lib/routeTransition';

let pass = 0;
let fail = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    pass += 1;
  } catch (err: any) {
    fail += 1;
    console.error(`FAIL  ${name}\n      ${err?.message}`);
  }
}
function eq(actual: unknown, expected: unknown, note = '') {
  if (actual !== expected) {
    throw new Error(
      `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}${note ? ` — ${note}` : ''}`
    );
  }
}
function ok(value: unknown, note: string) {
  if (!value) throw new Error(`expected truthy${note ? ` — ${note}` : ''}`);
}
/**
 * A keyframe must not carry a transform the caller did not ask for.
 *
 * `frame` is `any` rather than `Record<string, unknown>` because a `Record`
 * demands a string index signature, and framer-motion's `Target` is a mapped
 * type without one — the same friction that made `RouteOffset` a `Target` in
 * the first place. The helper is the only place the assertions lose type
 * checking, and it does nothing but read two properties.
 */
function noTranslate(frame: any, note: string) {
  ok(frame.x === undefined && frame.y === undefined, `${note} must not translate`);
}

// ---------------------------------------------------------------------------
// The plan's numbers
// ---------------------------------------------------------------------------

check('the durations and distances are the plan\'s', () => {
  // "180ms opacity + 8px rise" and a push "from the right ~24px".
  eq(ROUTE_TRANSITION_MS, 180, 'transition duration');
  eq(ROUTE_RISE_PX, 8, 'rise distance');
  eq(ROUTE_PUSH_PX, 24, 'push distance');
});

// ---------------------------------------------------------------------------
// rise — lateral moves between top-level tabs
// ---------------------------------------------------------------------------

check('a forward tab change rises from below', () => {
  const s = routeTransitionSpec({ kind: 'rise', direction: 'forward' });
  eq(s.initial.opacity, 0);
  eq(s.initial.y, 8, 'forward rises up, so it starts below the resting position');
  eq(s.animate.opacity, 1);
  eq(s.animate.y, 0);
  eq(s.duration, 180);
});

check('a back navigation reverses the rise', () => {
  // "the reverse on back" — the page comes down from above instead of up from
  // below, so the motion agrees with the direction the user is travelling.
  const s = routeTransitionSpec({ kind: 'rise', direction: 'back' });
  eq(s.initial.y, -8, 'back reverses the travel direction');
  eq(s.animate.y, 0);
});

check('a rise travels vertically only', () => {
  for (const direction of ['forward', 'back'] as const) {
    const s = routeTransitionSpec({ kind: 'rise', direction });
    ok(s.initial.x === undefined, `rise ${direction} must not travel horizontally`);
    ok(s.animate.x === undefined, `rise ${direction} must settle with no x offset`);
    ok(s.initial.y !== undefined, `rise ${direction} must actually rise`);
  }
});

// ---------------------------------------------------------------------------
// push — the detail stack
// ---------------------------------------------------------------------------

check('drilling in pushes the new screen in from the right', () => {
  // iOS navigation-controller feel: the incoming screen is the one that travels.
  const s = routeTransitionSpec({ kind: 'push', direction: 'forward' });
  eq(s.initial.x, 24, 'enters from the right');
  eq(s.initial.opacity, 0);
  eq(s.animate.x, 0);
  eq(s.animate.opacity, 1);
});

check('the outgoing screen shifts left and dims as the new one arrives', () => {
  const s = routeTransitionSpec({ kind: 'push', direction: 'forward' });
  eq(s.exit.x, -24, 'the old screen is pushed left, not the new one pulled right');
  eq(s.exit.opacity, ROUTE_PUSH_DIM, 'and it dims');
  const dim = s.exit.opacity as number;
  ok(
    dim > 0,
    'the outgoing screen must not fade to 0 — it is only visible in the sliver beside the incoming screen, and fading it out shows whatever is behind both'
  );
});

check('backing out reverses the push', () => {
  const s = routeTransitionSpec({ kind: 'push', direction: 'back' });
  eq(s.initial.x, -24, 'returning from the right-hand edge');
  eq(s.exit.x, 24, 'and the screen being left goes the other way');
});

check('the push is symmetric between the two directions', () => {
  const f = routeTransitionSpec({ kind: 'push', direction: 'forward' });
  const b = routeTransitionSpec({ kind: 'push', direction: 'back' });
  eq(b.initial.x, -(f.initial.x as number), 'entry mirrors');
  eq(b.exit.x, -(f.exit.x as number), 'exit mirrors');
  eq(b.duration, f.duration);
});

// ---------------------------------------------------------------------------
// reduced motion — "cross-fade only"
// ---------------------------------------------------------------------------

check('reduced motion is a cross-fade and nothing else', () => {
  for (const kind of ['rise', 'push'] as const) {
    for (const direction of ['forward', 'back'] as const) {
      const s = routeTransitionSpec({ kind, direction, reducedMotion: true });
      noTranslate(s.initial, `${kind} ${direction} initial`);
      noTranslate(s.animate, `${kind} ${direction} animate`);
      noTranslate(s.exit, `${kind} ${direction} exit`);
      eq(s.initial.opacity, 0, `${kind} ${direction} fades in`);
      eq(s.animate.opacity, 1);
      eq(s.exit.opacity, 0, `${kind} ${direction} fades out`);
    }
  }
});

check('reduced motion is a fade, not a faster animation', () => {
  // A 1ms slide is still a slide. Multiplying the duration by zero would leave a
  // screen travelling across the viewport for anyone who asked the OS for less
  // movement, which is the opposite of what the setting is for.
  const normal = routeTransitionSpec({ kind: 'push', direction: 'forward' });
  const reduced = routeTransitionSpec({ kind: 'push', direction: 'forward', reducedMotion: true });
  eq(reduced.duration, normal.duration, 'the duration is unchanged; only the travel is removed');
});

// ---------------------------------------------------------------------------
// Which animation a given navigation gets
// ---------------------------------------------------------------------------

check('only navigations touching the detail stack get the push', () => {
  // Tab to tab is a lateral move; anything into or out of a drill-down is a push.
  eq(routeTransitionKind('/', '/compare'), 'rise', '/ -> /compare is a tab change');
  eq(routeTransitionKind('/compare', '/study-plan'), 'rise', 'tab to tab');
  eq(routeTransitionKind('/', '/company/amazon'), 'push', 'into a vault');
  eq(routeTransitionKind('/company/amazon', '/'), 'push', 'back out of a vault');
  eq(routeTransitionKind('/courses/python', '/courses/python/lesson-2'), 'push', 'deeper');
  eq(routeTransitionKind('/', '/interview-course'), 'push', 'a detail at its own href');
});

check('the kind follows depth, not which link was clicked', () => {
  // Same pair of paths, reached two different ways, must animate identically —
  // otherwise the nav stack feels like a set of unrelated pages.
  eq(
    routeTransitionKind('/compare', '/company/amazon'),
    routeTransitionKind('/', '/company/amazon')
  );
});

check('a detail prefix is enough to earn the push even with no nav item', () => {
  // `/verify/[serial]` has no NavItem of its own, so a resolver that depended on
  // one would quietly fall back to `rise` for certificates.
  eq(routeTransitionKind('/verify/ABC-123', '/my-courses'), 'push');
  eq(routeTransitionKind('/', '/verify/ABC-123'), 'push');
});

console.log(`\nroute-transition: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
