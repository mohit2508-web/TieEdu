// Module 4 — APIs, Performance & Developer Tools
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, code } from '../nineBlocks';
import { lesson, M4, COURSE_ID } from './helpers';

export const module4: CourseModule = {
  id: M4,
  course_id: COURSE_ID,
  title: 'Module 4 — APIs, Performance & Dev Tools',
  summary: 'Consume REST APIs, measure real performance, and debug with the browser like a professional.',
  sort_order: 4,
  lessons: [
    lesson(
      M4,
      'wd-4-1',
      1,
      'Consuming REST APIs from the browser',
      'GET, POST, headers, auth and error handling — the contract every frontend job assumes.',
      16,
      nineBlocks({
        objectives: [
          'Call a REST API with fetch: method, headers, body and credentials',
          'Handle JSON responses and non-2xx status codes explicitly',
          'Send authenticated requests with a bearer token or cookie session',
          'Design a small loading / error / data UI state machine around a request',
        ],
        hook: `An intern's page shows "undefined" whenever the API is slow, and silently drops errors when the token expires. The API is fine; the client treats every response as success. REST has a simple contract: request in, status code out, JSON body. Honour that contract and half of production frontend bugs disappear.`,
        concept: `**Anatomy of a fetch request:**

| Part | Purpose |
| --- | --- |
| URL | Resource location |
| method | GET (read), POST (create), PUT/PATCH (update), DELETE |
| headers | Content-Type, Authorization, Accept |
| body | Payload for POST/PUT (JSON.stringify); GET must not have one |
| credentials | 'include' to send cookies cross-origin; 'same-origin' default |

**Response handling checklist:**
1. Check response.ok — network success is not application success.
2. Branch on status: 401 means re-auth, 403 forbidden, 404 missing, 422 validation, 500 server.
3. Parse JSON once; handle empty bodies on 204.

**Auth patterns:**
- Cookie session: fetch(url, { credentials: 'include' }); server sets HttpOnly cookie.
- Bearer token: fetch(url, { headers: { Authorization: 'Bearer ' + token } }).

**UI state machine:** every request-driven view has at least three states — loading, error, data. Render each distinctly; never leave a spinner stuck forever. Add a timeout or abort with AbortController for hung requests.`,
        extras: [
          code(
            `async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'include',
    ...options,
  });
  if (res.status === 401) throw new AuthError();
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message || res.statusText);
  }
  return res.status === 204 ? null : res.json();
}`,
            'apiClient.js',
            'javascript'
          ),
          tip(
            'One API client, many call sites',
            'Centralise fetch: status handling, auth headers and JSON parsing live in one place. Feature code calls api() and only cares about data or a typed error.',
          ),
        ],
        worked: {
          title: 'Three-state data view with AbortController',
          problem: `A list view should show spinner, error retry, or data — and cancel stale requests when the filter changes.`,
          steps: [
            {
              title: 'Model the states',
              desc: 'state = { status: "idle" | "loading" | "error" | "data", data, error }. Render switch on status.',
              code_snippet: 'loading -> spinner\nerror -> message + retry\ndata -> list',
            },
            {
              title: 'Abort the previous request',
              desc: 'Keep an AbortController per fetch; abort it before starting a new one so slow responses do not overwrite newer results.',
              code_snippet: "controller?.abort();\ncontroller = new AbortController();\nfetch(url, { signal: controller.signal });",
            },
            {
              title: 'Handle abort as silence, not error',
              desc: 'catch (err) { if (err.name === "AbortError") return; setError(err); } — aborted requests should not paint an error UI.',
            },
          ],
          solution:
            'Explicit state machine + AbortController. The user sees a spinner while loading, a retry button on failure, and never a stale result from an older filter.',
        },
        practice: {
          title: 'Implement these',
          prompt: `1. GET a list endpoint; render items; show error + retry on failure.
2. POST a form as JSON with a bearer token header.
3. Add a 10-second timeout using AbortController.`,
          hint: '1: three-state switch; check response.ok. 2: method POST, headers Authorization + Content-Type, body JSON.stringify(data). 3: setTimeout(() => controller.abort(), 10000).',
        },
        mistakes: [
          {
            mistake: 'Assuming res.json() always works',
            fix: '204 No Content and some error bodies are not JSON. Guard with a catch or check content-type.',
          },
          {
            mistake: 'Ignoring 401/expiry and leaving a broken UI',
            fix: 'Central client should detect 401 and route to re-auth (redirect or silent refresh) instead of rendering empty data.',
          },
          {
            mistake: 'Letting a slow response overwrite a newer one',
            fix: 'Abort the previous request when a new one starts, or track a request id and discard stale results.',
          },
        ],
        exam: {
          question: 'What does response.ok cover?',
          answer:
            'true when status is in 200–299. A resolved fetch with status 404 or 500 still has ok=false — you must check it before treating the body as valid data.',
          source: 'Frontend API interview',
        },
        summary: [
          'fetch resolves on HTTP errors — always check response.ok.',
          'Centralise fetch in one client: headers, auth, JSON, error types.',
          'Model loading / error / data explicitly; never leave spinners stuck.',
          'AbortController cancels stale or timed-out requests.',
        ],
      }),
      [
        [
          'response.ok is true for status:',
          ['200 only', '200–299', 'Any resolved fetch', '200 and 404'],
          1,
          'ok covers the whole 2xx success range.',
        ],
        [
          'To send JSON with fetch you:',
          ['Pass an object as body directly', "stringify the body and set Content-Type: application/json", 'Use method GET', 'Set Accept only'],
          1,
          'Body must be a string; the header tells the server how to parse it.',
        ],
        [
          'AbortController is used to:',
          ['Retry automatically', 'Cancel an in-flight fetch', 'Compress the response', 'Cache the result'],
          1,
          'abort() rejects the fetch promise with AbortError; useful for stale filters and timeouts.',
        ],
      ]
    ),
    lesson(
      M4,
      'wd-4-2',
      2,
      'Performance budgets and the DevTools workflow',
      'Measure before you optimise; use the Performance and Network panels like a professional.',
      15,
      nineBlocks({
        objectives: [
          'Interpret Core Web Vitals: LCP, INP (or FID) and CLS',
          'Use the Network panel to find the slowest request and understand waterfall order',
          'Use the Performance panel to find long tasks and layout thrash',
          'Apply three practical optimisations: image sizing, code splitting awareness, and caching headers',
        ],
        hook: `A site "feels slow" but the DOMContentLoaded event fires in 400 ms. The Performance panel shows a 1.2-second long task on the main thread after load — a chart re-render blocking every click. Feeling slow and loading slow are different problems with different tools. This lesson teaches you to tell them apart in five minutes.`,
        concept: `**Core Web Vitals (what Google ranks and users feel):**

| Metric | What it measures | Good |
| --- | --- | --- |
| LCP (Largest Contentful Paint) | When the main content paints | <= 2.5s |
| INP (Interaction to Next Paint) | Latency of interactions across the visit | <= 200ms |
| CLS (Cumulative Layout Shift) | Unexpected layout movement | <= 0.1 |

**Network panel essentials:**
- Waterfall: DNS, TCP, TLS, request, response — see where time goes.
- Status codes and size at a glance; filter by type.
- Disable cache to measure cold loads; leave it on for repeat-view realism.

**Performance panel essentials:**
- Record a session, look for long tasks (>50ms) blocking the main thread.
- Purple (layout) and green (recording) in the flame chart reveal forced synchronous layout ("layout thrash") from reading offsetHeight in a loop after writing styles.

**Three practical optimisations:**
1. Images: correct dimensions, modern formats, lazy-load below the fold.
2. Scripts: defer non-critical JS; split large bundles so first paint is not blocked.
3. Caching: immutable assets get long max-age + hashed filenames; HTML stays no-cache or short.`,
        extras: [
          table('Quick wins by symptom', ['Symptom', 'First place to look'], [
            ['Slow first paint (LCP)', 'Hero image size / LCP element; render-blocking CSS/JS'],
            ['Clicks feel janky (INP)', 'Long tasks in Performance panel; heavy event handlers'],
            ['Content jumps (CLS)', 'Images/slots without reserved dimensions; late-loading ads/fonts'],
            ['Slow repeat visits', 'Cache headers on static assets'],
          ]),
          tip(
            'Measure on a throttled 3G/Moto G profile',
            'Desktop broadband hides problems real users hit. Throttle CPU and network in DevTools before concluding "it is fast".',
          ),
        ],
        worked: {
          title: 'Diagnose a janky list re-render',
          problem: `Clicking "Sort" freezes the UI for ~600 ms on a 5,000-row table. Find and fix the cause.`,
          steps: [
            {
              title: 'Record with the Performance panel',
              desc: 'Reproduce the click while recording. Look for a long task spanning the sort handler.',
              code_snippet: 'Long task ~600ms in click handler',
            },
            {
              title: 'Identify layout thrash or unbatched work',
              desc: 'Reading offsetWidth inside a loop after writing style forces synchronous layout each iteration. Or sorting + re-creating 5,000 DOM nodes per click.',
            },
            {
              title: 'Fix: batch DOM writes, or virtualise',
              desc: 'Sort in JS once, then one re-render. For very large lists, only render visible rows (virtualisation).',
              code_snippet: 'sort once -> single innerHTML/textContent update\nor windowed list rendering',
            },
          ],
          solution:
            'The bottleneck was main-thread work, not the network. One sort pass + one DOM update, or virtualisation for huge lists, drops the handler to single-digit milliseconds.',
        },
        practice: {
          title: 'Do these in DevTools',
          prompt: `1. Open Network, reload with cache disabled, identify the largest and slowest request.
2. Record Performance while scrolling a long page; find any long task.
3. Check a hero image: are width/height (or aspect-ratio) set to prevent CLS?`,
          hint: '1: sort the waterfall by time or size columns. 2: look for yellow/red bars in the main thread track. 3: missing dimensions are a common CLS cause.',
        },
        mistakes: [
          {
            mistake: 'Optimising without measuring',
            fix: 'A guess optimisation may do nothing or regress performance. Capture a baseline in Network/Performance first, then compare after.',
          },
          {
            mistake: 'Compressing images forever while ignoring a 2 MB JS bundle',
            fix: 'The largest bytes on the critical path win. Check the waterfall: if JS dominates LCP, split or defer the bundle.',
          },
          {
            mistake: 'Leaving browser cache disabled and calling the site slow',
            fix: 'Real users get cached assets on repeat visits. Measure both cold and warm loads.',
          },
        ],
        exam: {
          question: 'What does CLS measure and what usually causes high CLS?',
          answer:
            'Cumulative Layout Shift scores unexpected movement of visible content. Common causes: images or embeds without reserved dimensions, late-loading fonts swapping metrics, and ads or banners injected above existing content.',
          source: 'Frontend performance interview',
        },
        summary: [
          'LCP <= 2.5s, INP <= 200ms, CLS <= 0.1 are the Core Web Vitals.',
          'Network waterfall for load time; Performance panel for main-thread jank.',
          'Layout thrash: reads after writes in a loop force sync layout.',
          'Measure first (throttled), then optimise the actual bottleneck.',
        ],
      }),
      [
        [
          'CLS stands for:',
          ['Current Load Speed', 'Cumulative Layout Shift', 'Cache Layer State', 'Content Layout Size'],
          1,
          'CLS measures unexpected layout movement during the visit.',
        ],
          [
          'A long task on the main thread typically causes:',
          ['Higher CLS only', 'Interaction latency (poor INP)', 'Slower DNS', 'Larger images'],
          1,
          'Blocking the main thread delays processing of clicks and input — INP suffers.',
        ],
        [
          'To measure a cold load fairly you should:',
          ['Leave cache on', 'Disable cache in the Network panel', 'Use Incognito only', 'Delete the service worker'],
          1,
          'Network > Disable cache (with DevTools open) simulates a first-time visitor.',
        ],
      ]
    ),
  ],
};
