// Module 3 — Responsive Layouts & Forms
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, code } from '../nineBlocks';
import { lesson, M3, COURSE_ID } from './helpers';

export const module3: CourseModule = {
  id: M3,
  course_id: COURSE_ID,
  title: 'Module 3 — Responsive Layouts & Forms',
  summary: 'Flexbox, grid and media queries for mobile-first pages; accessible forms that actually validate.',
  sort_order: 3,
  lessons: [
    lesson(
      M3,
      'wd-3-1',
      1,
      'Flexbox, Grid and media queries',
      'Build layouts that collapse cleanly from desktop to phone without float hacks.',
      18,
      nineBlocks({
        objectives: [
          'Use flexbox for one-dimensional rows or columns with gap, alignment and wrapping',
          'Use grid for two-dimensional layouts with fr units and template areas',
          'Apply mobile-first media queries with a min-width breakpoint strategy',
          'Know when flex, grid or plain block flow is the right tool',
        ],
        hook: `Before flexbox, every layout tutorial began with "clear: both" and negative margins. A navigation bar that used to take forty lines of float CSS is now display: flex; justify-content: space-between; gap: 1rem. Grid handles the page skeleton in three more lines. This lesson is the toolkit that makes those two paragraphs true for you.`,
        concept: `**Flexbox** — one axis (row or column):

| Property | Values you will use |
| --- | --- |
| display | flex |
| flex-direction | row (default) / column |
| justify-content | flex-start / center / space-between / space-around (main axis) |
| align-items | stretch / center / flex-start (cross axis) |
| gap | 1rem — replaces margin hacks between items |
| flex-wrap | wrap — items flow to new lines when needed |

**Grid** — two axes:

| Property | Values you will use |
| --- | --- |
| display | grid |
| grid-template-columns | 1fr 2fr / repeat(3, 1fr) / minmax(200px, 1fr) |
| gap | row-gap / column-gap or gap |
| grid-template-areas | named regions for complex layouts |

fr is a fraction of free space. minmax(200px, 1fr) ensures a floor while still filling.

**Mobile-first media queries:** write the base CSS for small screens, then add min-width queries for larger ones. This keeps the default payload small and avoids the "desktop styles then try to undo them on mobile" trap.

    .card { width: 100%; }
    @media (min-width: 640px) { .card { width: 50%; } }
    @media (min-width: 1024px) { .card { width: 25%; } }

`,
        extras: [
          tip(
            'Flex for toolbars and rows; grid for page skeletons',
            'Navigation bars, button groups, card footers: flex. Overall page layout, image galleries, dashboards: grid. Both together is normal — grid for the shell, flex inside each cell.',
          ),
          warn(
            'Do not set fixed pixel widths for columns',
            'Fixed widths break on small screens. Prefer fr, percentage, or minmax so the layout adapts without a media query for every possible width.',
          ),
        ],
        worked: {
          title: 'A responsive card grid, mobile-first',
          problem: `Cards should be full width on phones, two-up on tablets, three-up on desktop, with consistent gaps.`,
          steps: [
            {
              title: 'Base: single column',
              desc: 'Grid with one column is the mobile default; gap handles spacing between cards.',
              code_snippet: '.grid { display: grid; gap: 1rem; grid-template-columns: 1fr; }',
            },
            {
              title: 'Tablet: two columns',
              desc: 'A min-width query overrides the template for wider viewports.',
              code_snippet: '@media (min-width: 640px) { .grid { grid-template-columns: 1fr 1fr; } }',
            },
            {
              title: 'Desktop: three columns with minmax',
              desc: 'repeat(3, minmax(0, 1fr)) avoids overflow from long content inside flexible tracks.',
              code_snippet: '@media (min-width: 1024px) { .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }',
            },
          ],
          solution:
            'Three breakpoints, one grid container, zero float clearing. Adding a fourth card needs no layout change — grid reflows automatically.',
        },
        practice: {
          title: 'Build these',
          prompt: `1. A navbar: logo left, links right on desktop; stacked on mobile.
2. A two-column article + sidebar that becomes one column below 768px.
3. A footer with three equal columns using grid.`,
          hint: '1: flex row with justify-content space-between; flex-direction column on mobile. 2: grid-template-columns: 2fr 1fr with min-width query. 3: grid-template-columns: repeat(3, 1fr).',
        },
        mistakes: [
          {
            mistake: 'Desktop-first with max-width queries',
            fix: 'Mobile-first min-width is simpler: one base style, progressive enhancement. Undoing desktop styles on small screens gets messy fast.',
          },
          {
            mistake: 'Using float for layout',
            fix: 'Floats are for wrapping text around images. Flex and grid exist for layout; use them.',
          },
          {
            mistake: 'Fixed pixel widths that break on narrow screens',
            fix: 'Percentage, fr and minmax keep layouts fluid. Fixed widths are for intentional design constraints (e.g. a max-width reading column).',
          },
        ],
        exam: {
          question: 'When would you choose CSS Grid over Flexbox?',
          answer:
            'When you need to control both rows and columns simultaneously — page shells, galleries, dashboards with defined regions. Flex is ideal for one-dimensional distribution (nav bars, button rows, stacked panels).',
          source: 'Frontend layout interview',
        },
        summary: [
          'Flex = one axis; grid = two axes; use both in one page happily.',
          'gap replaces margin hacks; fr for fractional widths; minmax for floors.',
          'Mobile-first: base styles for small screens, min-width queries upward.',
          'Avoid fixed pixel widths and float-based layouts.',
        ],
      }),
      [
        [
          'Mobile-first CSS means:',
          ['Write desktop then use max-width to shrink', 'Base styles for small screens, min-width queries upward', 'Use viewport meta only', 'Hide content on mobile'],
          1,
          'Start small, enhance upward — simpler cascade, smaller base payload.',
        ],
        [
          'Best tool for a page shell with header, sidebar, main and footer regions:',
          ['Floats', 'CSS Grid with template areas', 'Inline-block', 'Table layout'],
          1,
          'Grid can name and place regions on both axes in one rule.',
        ],
        [
          'flex: 1 on a flex child means:',
          ['Fixed 1px basis', 'Grow to fill free space with basis 0%', 'Only works in grid', 'Disable flex'],
          1,
          'flex: 1 is shorthand for flex-grow: 1, flex-shrink: 1, flex-basis: 0% — equal share of free space.',
        ],
      ]
    ),
    lesson(
      M3,
      'wd-3-2',
      2,
      'Forms: validation, accessibility and submission',
      'Build forms that work with keyboards, screen readers, and real validation — not just a submit button.',
      16,
      nineBlocks({
        objectives: [
          'Associate every input with a label using for/id or wrapping',
          'Use required, pattern, type and custom JS validation together',
          'Show inline, accessible error messages tied to their fields',
          'Submit forms via fetch without a full page reload, handling success and failure',
        ],
        hook: `A signup form looks fine but loses half its mobile conversions. The email field uses type=text, the phone field uses type=text, error messages appear as red text with no aria-live, and the submit button is 20px from the screen edge. None of these are "bugs" in the crash sense; all of them are form design failures that a checklist prevents. This lesson is that checklist.`,
        concept: `**Every control needs a label.** Either <label for="email"> paired with input id="email", or wrap the input inside the label. Placeholders are not labels — they disappear on input and fail many accessibility audits.

**Native validation attributes:**

| Attribute | Effect |
| --- | --- |
| required | Must have a value before submit |
| type=email / tel / number / url | Correct keyboard + native format check |
| pattern | Regex the value must match (with title for the message) |
| minlength / maxlength | Length bounds for text |
| min / max | Numeric or date bounds |
| autocomplete | Autofill hints: name, email, off |

Native validation is free and accessible. Use it first; add JS only for rules it cannot express (e.g. cross-field password confirm).

**Accessible errors:** associate the message with the field (aria-describedby, or a visible <p id="err-email"> next to it). Set aria-invalid="true" while in error. Announce dynamic messages with aria-live="polite".

**Submit with fetch:** preventDefault, serialize with FormData, POST, then branch on response.ok. Disable the button while in flight to prevent double submits; re-enable on completion.`,
        extras: [
          code(
            `<form id="signup" novalidate>
  <label for="email">Email</label>
  <input id="email" name="email" type="email" required autocomplete="email" aria-describedby="email-err" />
  <p id="email-err" role="alert" hidden></p>
  <button type="submit">Sign up</button>
</form>`,
            'signup.html',
            'html'
          ),
          tip(
            'novalidate + your own messages, or rely on native',
            'If you keep native validation, do not set novalidate — let the browser show its bubbles. If you want custom styled messages, add novalidate and implement checks yourself, preserving the same accessibility wiring.',
          ),
        ],
        worked: {
          title: 'Accessible inline validation on submit',
          problem: `Validate an email field on submit; show an error below the input and set aria-invalid.`,
          steps: [
            {
              title: 'Listen to submit with preventDefault',
              desc: 'Stop the page reload; read the value with FormData or input.value.',
              code_snippet: "form.addEventListener('submit', (e) => { e.preventDefault(); ... });",
            },
            {
              title: 'Validate and paint the error',
              desc: 'Check with a simple pattern or validity API; unhide the error element, set its text, and mark the input aria-invalid.',
              code_snippet: "err.textContent = 'Enter a valid email'; err.hidden = false; input.setAttribute('aria-invalid', 'true');",
            },
            {
              title: 'Clear the error on input',
              desc: 'As soon as the user types, remove aria-invalid and hide the message so the form feels responsive, not punitive.',
            },
          ],
          solution:
            'Errors are tied to fields, announced (role=alert / aria-live), and cleared on input. The same wiring works whether you use native validation or custom JS.',
        },
        practice: {
          title: 'Build these',
          prompt: `1. A login form: email + password, both labelled, with autocomplete attributes.
2. A password + confirm-password pair with a cross-field JS check.
3. Submit a form via fetch to a mock endpoint; show a success toast or an error message.`,
          hint: '1: autocomplete=email / current-password. 2: compare on submit; aria-describedby the confirm error. 3: FormData + fetch POST; check response.ok; disable button while pending.',
        },
        mistakes: [
          {
            mistake: 'Using placeholder as the only label',
            fix: 'Placeholders vanish on input and are not reliably announced. Always use a real label.',
          },
          {
            mistake: 'Red text errors with no programmatic association',
            fix: 'aria-describedby and aria-invalid (or role=alert) let assistive tech connect the message to the field.',
          },
          {
            mistake: 'Forgetting to re-enable the submit button after a failed fetch',
            fix: 'A stuck disabled button looks broken. Use finally or explicit success/failure paths to re-enable.',
          },
        ],
        exam: {
          question: 'Why is a placeholder not a replacement for a label?',
          answer:
            'Placeholders disappear once the user types, have low contrast by default, and are not consistently announced as the field name. Labels remain visible and are programmatically associated via for/id.',
          source: 'Accessibility interview question',
        },
        summary: [
          'Label every input; placeholder is not a label.',
          'Native attributes (required, type, pattern) give free accessible validation.',
          'Errors: aria-describedby + aria-invalid; clear on input.',
          'fetch + FormData for AJAX submit; guard against double-submit.',
        ],
      }),
      [
        [
          'The correct way to associate a label with an input:',
          ['title attribute on input', 'label for="x" matching input id="x"', 'placeholder text', 'alt on input'],
          1,
          'for/id association is the accessible, clickable-label pattern.',
        ],
        [
          'aria-invalid="true" on an input means:',
          ['The input is disabled', 'Its current value fails validation', 'The form is hidden', 'The label is missing'],
          1,
          'It programmatically marks the control as invalid for assistive tech.',
        ],
        [
          'To submit a form without a page reload you:',
          ['Use target="_blank"', 'preventDefault and fetch/POST with FormData', 'Remove the action', 'Use onsubmit="return true"'],
          1,
          'Cancel the default submit, then send the data with fetch (or XHR).',
        ],
      ]
    ),
  ],
};
