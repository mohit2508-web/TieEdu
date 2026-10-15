// Module 2 — JavaScript Fundamentals & DOM
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, code } from '../nineBlocks';
import { lesson, M2, COURSE_ID } from './helpers';

export const module2: CourseModule = {
  id: M2,
  course_id: COURSE_ID,
  title: 'Module 2 — JavaScript Fundamentals & the DOM',
  summary: 'Variables, functions, events and querying the page — the runtime half of frontend.',
  sort_order: 2,
  lessons: [
    lesson(
      M2,
      'wd-2-1',
      1,
      'Variables, functions and control flow in modern JS',
      'let/const, arrow functions, array methods and the async model that frameworks build on.',
      18,
      nineBlocks({
        objectives: [
          'Choose between const, let and avoid var for variable declaration',
          'Write and compose arrow functions and pure array methods (map, filter, reduce)',
          'Explain the event loop at a practical level: call stack, microtasks, macrotasks',
          'Use fetch with async/await and handle errors without silent failures',
        ],
        hook: `A dashboard fetches three APIs in sequence, each waiting for the previous one, taking 900 ms total. The APIs are independent; they should take 300 ms. The fix is one line of modern JS: Promise.all. Understanding that the browser can do independent I/O concurrently — and that await only pauses your function — separates junior from mid-level frontend code.`,
        concept: `**Declarations:** const by default; let when reassignment is needed; never var (function-scoped, hoisted, confusing).

**Functions:** prefer arrow functions for callbacks (lexical this, concise). Named function declarations still suit hoisted utility functions.

**Array methods replace loops for transforms:**

| Method | Use |
| --- | --- |
| map | Transform each element, return new array |
| filter | Keep elements matching a predicate |
| reduce | Collapse array to a single value |
| find / some / every | Search / membership checks |
| forEach | Side effects only; returns undefined |

**The event loop (practical model):** JavaScript runs single-threaded. Synchronous code occupies the call stack. Resolved promises queue as microtasks (run first); setTimeout callbacks queue as macrotasks (run after microtasks drain). await yields to the event loop, letting the page stay responsive.

**fetch + async/await:** fetch does not reject on HTTP 4xx/5xx — you must check response.ok. Wrap in try/catch for network errors; check status for HTTP errors.`,
        extras: [
          code(
            `async function loadDashboard() {
  try {
    const [userRes, statsRes] = await Promise.all([
      fetch('/api/user'),
      fetch('/api/stats'),
    ]);
    if (!userRes.ok || !statsRes.ok) {
      throw new Error('HTTP ' + userRes.status + '/' + statsRes.status);
    }
    const [user, stats] = await Promise.all([userRes.json(), statsRes.json()]);
    return { user, stats };
  } catch (err) {
    console.error('Dashboard load failed', err);
    return null;
  }
}`,
            'dashboard.js',
            'javascript'
          ),
          tip(
            'const first, let when rebinding',
            'Most variables never need reassignment. const documents intent and catches accidental reassignment at development time.',
          ),
          warn(
            'fetch does not throw on 404',
            'A 404 response is a successful network fetch of an error page. Always check response.ok before calling .json() and treating the body as data.',
          ),
        ],
        worked: {
          title: 'Parallelise independent requests',
          problem: `Rewrite sequential fetches so total latency is the max of the three, not the sum.`,
          steps: [
            {
              title: 'See the sequential mistake',
              desc: 'await a, then await b, then await c stacks latencies: 300+300+300 = 900ms.',
              code_snippet: 'const a = await fetch(A); // 300ms\nconst b = await fetch(B); // +300ms\nconst c = await fetch(C); // +300ms',
            },
            {
              title: 'Start all three, then await',
              desc: 'Promise.all takes an array of promises and resolves when all settle. Start all three fetches before awaiting.',
              code_snippet: 'const [a, b, c] = await Promise.all([fetch(A), fetch(B), fetch(C)]);',
            },
            {
              title: 'Handle partial failure if needed',
              desc: 'Promise.all rejects on the first failure. For independent best-effort loads, use Promise.allSettled and inspect each result status.',
              code_snippet: 'const results = await Promise.allSettled([fetch(A), fetch(B)]);',
            },
          ],
          solution:
            'Promise.all for all-or-nothing parallelism; Promise.allSettled when partial results are acceptable. The key insight: create the promises first (they start running), then await them together.',
        },
        practice: {
          title: 'Write these',
          prompt: `1. Filter an array of products to in-stock items over 1000, then map to their names.
2. Reduce an array of orders to total revenue.
3. Fetch a URL, handle both network errors and non-ok HTTP status.`,
          hint: "1: products.filter(p => p.stock > 0 && p.price > 1000).map(p => p.name). 2: orders.reduce((sum, o) => sum + o.amount, 0). 3: try/catch around fetch; if (!res.ok) throw.",
        },
        mistakes: [
          {
            mistake: 'Using await inside a forEach',
            fix: 'forEach ignores the returned promise; iterations still run concurrently without waiting. Use for...of with await, or map + Promise.all.',
          },
          {
            mistake: 'Forgetting that fetch resolves on 404/500',
            fix: 'Check response.ok. A 500 with an HTML error body will make .json() throw a confusing parse error.',
          },
          {
            mistake: 'var in modern code',
            fix: 'var is function-scoped and hoisted; let/const are block-scoped and TDZ-protected. Use const/let only.',
          },
        ],
        exam: {
          question: 'Why does `const [a,b] = await Promise.all([fetch(x), fetch(y)])` finish faster than two sequential awaits?',
          answer:
            'Both fetches are initiated before either await runs, so the network requests proceed concurrently. Each await only pauses its own function; the browser continues both transfers in parallel. Latency becomes max(t1, t2), not t1+t2.',
          source: 'Mid-level frontend interview',
        },
        summary: [
          'const default; let for reassignment; no var.',
          'map/filter/replace transform loops; reduce collapses to a value.',
          'Promise.all for parallel all-or-nothing; allSettled for partial.',
          'fetch resolves on HTTP errors — check response.ok.',
        ],
      }),
      [
        [
          'const vs let: choose const when:',
          ['The value may change', 'The binding never reassigns', 'Inside a loop index', 'For function declarations only'],
          1,
          'const prevents reassignment; the object/array contents can still mutate.',
        ],
        [
          'fetch("/missing") with a 404 response:',
          ['Throws immediately', 'Resolves; you must check response.ok', 'Returns null', 'Redirects'],
          1,
          'HTTP error statuses still resolve the fetch promise; check .ok before parsing.',
        ],
        [
          'Promise.all rejects when:',
          ['Any promise rejects', 'All promises reject', 'The array is empty', 'Any promise resolves'],
          0,
          'One rejection fails the whole Promise.all; use allSettled for tolerance.',
        ],
      ]
    ),
    lesson(
      M2,
      'wd-2-2',
      2,
      'DOM manipulation and events',
      'Query elements, react to user actions, and update the page without a framework.',
      16,
      nineBlocks({
        objectives: [
          'Query and update elements with querySelector, textContent and classList',
          'Attach event listeners, understand bubbling, and use event delegation',
          'Create and remove elements safely without innerHTML for user data',
          'Prevent default behaviour for forms and links when needed',
        ],
        hook: `A todo list attaches a click listener to every delete button when the list renders. After adding 100 items, removing one re-binds listeners for the other 99. Event delegation solves it: one listener on the parent, checking event.target.closest. It is the pattern every DOM-heavy codebase uses, and it is one concept to learn.`,
        concept: `**Querying:** document.querySelector for the first match; querySelectorAll for a NodeList (convert with spread or Array.from for array methods).

**Updating:** textContent for text (safe from HTML injection); classList.add/remove/toggle for classes; setAttribute for attributes; style properties for inline styles (prefer classes for anything non-trivial).

**Events and bubbling:** a click on a child bubbles up through ancestors. You can listen on an ancestor and use event.target to find the original element.

**Delegation:** put one listener on a stable parent; on each event, check event.target.closest('selector') for the element you care about. Works for elements added later without re-binding.

**Creating nodes:** createElement + append is safe for user data. Avoid innerHTML with interpolated user content — it is an XSS vector. If you must set HTML from trusted strings, at least understand the risk.

**preventDefault:** form submit reloads the page by default; link navigation follows href. Call event.preventDefault() when you want to handle the action in JS.`,
        extras: [
          code(
            `// Delegation: one listener for all delete buttons, present and future
list.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-action="delete"]');
  if (!btn) return;
  const id = btn.dataset.id;
  document.querySelector('[data-id="' + id + '"]').remove();
});`,
            'delegation.js',
            'javascript'
          ),
          warn(
            'Never innerHTML user content',
            'Pasting user-supplied strings into innerHTML executes any HTML/JS they contain. Use textContent or createElement.',
          ),
        ],
        worked: {
          title: 'Delegated delete for a dynamic list',
          problem: `A list re-renders on every change. Attach delete handling without re-binding listeners each render.`,
          steps: [
            {
              title: 'Listen once on the stable parent',
              desc: 'The ul (or container) exists for the page lifetime. Attach the click listener once at init.',
              code_snippet: "container.addEventListener('click', onClick);",
            },
            {
              title: 'Find the button inside the target',
              desc: "Clicks may land on the button's icon child. closest walks up to the element with your selector.",
              code_snippet: "const btn = event.target.closest('button[data-delete]');",
            },
            {
              title: 'Act and let render rebuild the list',
              desc: 'Remove the item from your data array, re-render the list. No listener re-binding required.',
            },
          ],
          solution:
            'One listener survives infinite re-renders. This is why frameworks can re-render wholesale without leaking listeners — delegation is the native equivalent.',
        },
        practice: {
          title: 'Build these',
          prompt: `1. A counter with + and - buttons that update a display via delegation.
2. A form that prevents default and appends the typed name to a list (no page reload).
3. Toggle a "dark" class on body when a button is clicked.`,
          hint: "1: click on parent; closest('[data-step]'). 2: submit listener + preventDefault; textContent for the name. 3: document.body.classList.toggle('dark').",
        },
        mistakes: [
          {
            mistake: 'Re-attaching listeners after every render',
            fix: 'Use event delegation on a stable ancestor. Or remove old listeners before adding new ones (leak-prone and error-prone).',
          },
          {
            mistake: 'innerHTML with user or API data',
            fix: 'XSS risk. Use textContent or build nodes with createElement.',
          },
          {
            mistake: 'Forgetting that events bubble',
            fix: 'A listener on a child may fire for intended grandchild clicks — or a listener on document may catch everything. Know the path; stopPropagation sparingly.',
          },
        ],
        exam: {
          question: 'What is event delegation and why is it useful?',
          answer:
            'Attaching one listener to a common ancestor and using event.target / closest to handle events from descendant elements (including ones not yet in the DOM). Saves listeners, survives re-renders, and is the standard pattern for dynamic lists.',
          source: 'Frontend DOM interview standard',
        },
        summary: [
          'querySelector(All) to find; textContent/classList to update.',
          'Events bubble; delegation listens on a stable parent + closest().',
          'createElement/textContent for user data; never innerHTML it.',
          'preventDefault stops form submit reloads and default link navigation.',
        ],
      }),
      [
        [
          'Event delegation relies on:',
          ['Capture phase only', 'Event bubbling to a stable ancestor', 'setTimeout', 'Shadow DOM'],
          1,
          'The event bubbles up; closest() on the target finds the actionable element.',
        ],
        [
          'Safely setting user-supplied text uses:',
          ['innerHTML', 'textContent', 'document.write', 'eval'],
          1,
          'textContent sets plain text and does not parse HTML, avoiding XSS.',
        ],
        [
          'Form submit reloads the page unless you:',
          ['Return false only', 'Call event.preventDefault()', 'Use onclick', 'Disable the form'],
          1,
          'preventDefault cancels the browser default action (navigation/reload).',
        ],
      ]
    ),
  ],
};
