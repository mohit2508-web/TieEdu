// Module 1 — HTML Structure & CSS Fundamentals
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, code } from '../nineBlocks';
import { lesson, M1, COURSE_ID } from './helpers';

export const module1: CourseModule = {
  id: M1,
  course_id: COURSE_ID,
  title: 'Module 1 — HTML Structure & CSS Fundamentals',
  summary: 'Semantic markup and the box model — the two ideas every frontend job interview assumes.',
  sort_order: 1,
  lessons: [
    lesson(
      M1,
      'wd-1-1',
      1,
      'Semantic HTML: structure that means something',
      'Write markup that browsers, screen readers and search engines can actually understand.',
      15,
      nineBlocks({
        objectives: [
          'Explain why semantic tags matter for accessibility and SEO',
          'Build a page skeleton with header, nav, main, section, article, aside and footer',
          'Choose the correct heading level and form control type',
          'Know when a div is appropriate and when a semantic element is required',
        ],
        hook: `A recruiter's screen reader opens your portfolio site. Every region is announced as "group" because the page is sixty divs. The same site rebuilt with header, nav, main and section announces landmarks the tool can jump between. Nothing about the visual design changed — only the meaning. That difference is why "just use divs" is a career-limiting habit.`,
        concept: `HTML describes meaning and structure; CSS describes appearance; JavaScript describes behaviour. Mixing those jobs produces pages that are fragile and inaccessible.

**Semantic elements and what they announce:**

| Element | Meaning | Landmark? |
| --- | --- | --- |
| header | Introductory content or nav for a section | Yes (banner when top-level) |
| nav | Major navigation links | Yes |
| main | Dominant content of the document | Yes |
| section | Thematic grouping of content | No |
| article | Self-contained composition (post, card) | No |
| aside | Tangentially related content | Yes (complementary) |
| footer | Closing content for a section or page | Yes (contentinfo when bottom) |

**Headings form an outline.** Do not skip levels (h1 then h3). One h1 per page typically names the page. Screen readers build a heading tree users navigate; skipped levels break that tree.

**Forms:** always use the right input type. type=email, type=tel, type=number, type=date give mobile keyboards, native validation, and autofill hints. A type=text input for an email address costs real usability.

**Images need alt text.** Decorative images get alt="" (empty string, not omitted); informative images get a description. Screen readers skip empty alt; missing alt often gets the file name read aloud.`,
        extras: [
          tip(
            'One h1, then descend',
            "h1 names the page; h2 are major sections; h3 subsections. Never use a heading for visual size — that is CSS's job.",
          ),
          warn(
            'onclick on a non-button',
            'A div with onclick is invisible to keyboard users and screen readers. Use <button> for actions and <a> for navigation; style them to look like whatever you want.',
          ),
        ],
        worked: {
          title: 'Rebuild a div soup as semantic landmarks',
          problem: `Convert this markup to semantic HTML without changing the visual order: <div class="top"><div class="menu">...</div></div><div class="content"><div class="post">...</div></div><div class="bottom">...</div>`,
          steps: [
            {
              title: 'Identify roles',
              desc: 'top = page header + primary nav; content = main with an article; bottom = footer with secondary info.',
              code_snippet: 'header > nav\nmain > article\nfooter',
            },
            {
              title: 'Rewrite with landmarks',
              desc: 'Replace each structural div with the matching semantic element. Keep classes for styling hooks if needed.',
              code_snippet: '<header><nav>...</nav></header>\n<main><article>...</article></main>\n<footer>...</footer>',
            },
            {
              title: 'Fix headings and links inside',
              desc: 'Site title becomes h1 inside header (or main, depending on layout). Post title becomes h2 inside article. Nav links stay <a href>.',
            },
          ],
          solution:
            'Same pixels, different meaning. The accessibility tree now exposes banner, navigation, main, article and contentinfo landmarks; the outline has a coherent heading tree; crawlers attribute the content correctly.',
        },
        practice: {
          title: 'Markup this',
          prompt: `1. A blog post card with title, author, date, body and "Read more" link.
2. A contact form with name, email, phone and message fields — correct types and labels.
3. A page with a sidebar of related links (semantic element for the sidebar?).`,
          hint: '1: article + h2/h3 + time datetime + p + a. 2: label for each control; input type text/email/tel; textarea for message. 3: aside.',
        },
        mistakes: [
          {
            mistake: 'Using heading tags purely for font size',
            fix: 'Headings define outline order, not appearance. Style with CSS; choose the level that matches document structure.',
          },
          {
            mistake: 'Omitting alt on images',
            fix: 'Missing alt often reads the file name aloud. Informative images get a description; decorative ones get alt="".',
          },
          {
            mistake: 'Click handlers on non-interactive elements',
            fix: 'div/span with onclick exclude keyboard users. Use button or a with proper roles when you must.',
          },
        ],
        exam: {
          question: 'Name three benefits of semantic HTML over div-only markup.',
          answer:
            '1) Screen readers announce landmarks and headings, enabling navigation. 2) Search engines understand content structure better. 3) The code is readable and maintainable — the element name documents its purpose.',
          source: 'Frontend interview staple',
        },
        summary: [
          'HTML = meaning; CSS = appearance; JS = behaviour.',
          'Landmarks: header, nav, main, aside, footer — screen reader jump points.',
          'One h1; never skip heading levels.',
          'Correct input types; labels for every control; alt on every img.',
        ],
      }),
      [
        [
          'Which element is a screen-reader landmark?',
          ['<div class="top">', '<header>', '<span>', '<b>'],
          1,
          'header (banner when top-level), nav, main, aside and footer are landmarks.',
        ],
        [
          'A decorative image should have:',
          ['No alt attribute', 'alt=""', 'alt="image"', 'alt="decorative"'],
          1,
          'Empty alt tells assistive tech to skip it; omitting alt may cause the file name to be read.',
        ],
        [
          'The correct element for a primary action button is:',
          ['<div onclick>', '<span>', '<button>', '<a href="#">'],
          2,
          'button is focusable, keyboard-activatable and announced as a button by default.',
        ],
      ]
    ),
    lesson(
      M1,
      'wd-1-2',
      2,
      'CSS box model, selectors and cascade',
      'Predict exactly how much space an element occupies, and control which rules win.',
      16,
      nineBlocks({
        objectives: [
          'Compute total element width from content, padding, border and margin',
          'Use box-sizing: border-box and explain why frameworks default to it',
          'Write class, attribute and pseudo-class selectors with correct specificity',
          'Trace the cascade: origin, specificity and source order',
        ],
        hook: `A two-column layout keeps overflowing by 16 pixels. The content is exactly 50% wide, so it should fit. It does not, because each column also has 8px padding and a 1px border that the browser adds outside the declared 50%. box-sizing: border-box makes the declared width include padding and border — one line that prevents an entire family of layout bugs.`,
        concept: `**The box model:** every element is content + padding + border + margin.

| Part | Inside the border? | Affects layout? |
| --- | --- | --- |
| content | — | Yes (defines intrinsic size) |
| padding | Inside border, outside content | Yes, adds to visual size |
| border | Edge of the box | Yes, adds to visual size |
| margin | Outside the border | Yes, collapses between siblings (vertical) |

Default box-sizing is content-box: width applies to content only. border-box: width includes content + padding + border. Frameworks set * { box-sizing: border-box } because it makes "width: 50%" mean what a human expects.

**Specificity** ranks selectors as (inline, id, class/attribute/pseudo-class, type/pseudo-element). Higher tuple wins. !important overrides the cascade entirely — avoid it; fix specificity or cascade order instead.

**Cascade order when specificity ties:** later rule wins. Import order and stylesheet order matter.`,
        extras: [
          table('Specificity cheat-sheet', ['Selector', 'Score'], [
            ['inline style', '1,0,0,0'],
            ['#id', '0,1,0,0'],
            ['.class / [attr] / :hover', '0,0,1,0'],
            ['element / ::before', '0,0,0,1'],
            ['* (universal)', '0,0,0,0'],
          ]),
          tip(
            'Prefer classes over ids for styling',
            'Ids win specificity wars and cannot be reused. Style with classes; reserve ids for JS hooks and form labels.',
          ),
        ],
        worked: {
          title: 'Fix the overflowing two-column layout',
          problem: `.col { width: 50%; padding: 8px; border: 1px solid #ccc; } — two .col siblings overflow their container.`,
          steps: [
            {
              title: 'Compute the default total width',
              desc: 'content 50% + padding 16px + border 2px per column. Two columns exceed 100% by 36px.',
              code_snippet: '50% + 16px + 2px  >  50%',
            },
            {
              title: 'Switch to border-box',
              desc: 'Declared width now includes padding and border, so two 50% columns fit exactly.',
              code_snippet: '.col { box-sizing: border-box; width: 50%; padding: 8px; border: 1px solid #ccc; }',
            },
            {
              title: 'Or use a modern layout instead',
              desc: 'display: grid; grid-template-columns: 1fr 1fr handles gaps and sizing without manual width math.',
              code_snippet: '.row { display: grid; grid-template-columns: 1fr 1fr; }',
            },
          ],
          solution:
            'box-sizing: border-box on both columns fixes the overflow. Prefer grid or flex for multi-column layouts so you rarely compute widths by hand.',
        },
        practice: {
          title: 'Answer these',
          prompt: `1. An element has width: 200px, padding: 10px, border: 2px. Total outer width with content-box? With border-box?
2. Which wins: .btn.primary or #submit?
3. Why do vertical margins collapse but horizontal ones do not?`,
          hint: '1: content-box 224px; border-box 200px. 2: #submit (id beats class). 3: Adjacent in-flow block siblings share one margin = max of the two; horizontal margins never collapse because boxes are side by side.',
        },
        mistakes: [
          {
            mistake: 'Fighting the cascade with !important everywhere',
            fix: 'One !important arms race leads to ten. Restructure selectors or reorder sheets instead.',
          },
          {
            mistake: 'Mixing content-box and border-box in one project',
            fix: 'Set * { box-sizing: border-box } at the top of the stylesheet and keep it consistent.',
          },
          {
            mistake: 'Using ids for reusable component styles',
            fix: 'Ids have high specificity and cannot repeat. Classes are the correct styling hook.',
          },
        ],
        exam: {
          question: 'What does box-sizing: border-box change?',
          answer:
            'The declared width/height includes content, padding and border, instead of applying to content alone. Prevents layouts from overflowing when padding and border are added to a percentage width.',
          source: 'Every CSS screening question',
        },
        summary: [
          'Box model: content, padding, border, margin — know which parts add size.',
          'border-box makes width include padding+border; frameworks default to it.',
          'Specificity tuple: inline > id > class > type; ties broken by source order.',
          'Style with classes; avoid !important.',
        ],
      }),
      [
        [
          'box-sizing: border-box means the declared width includes:',
          ['Content only', 'Content + padding + border', 'Content + margin', 'Padding only'],
          1,
          'border-box folds padding and border into the declared width/height.',
        ],
        [
          'Higher specificity wins between:',
          ['.card #title', '#title .card', '.card .title', 'div title'],
          1,
          'Both #title .card and .card #title score (0,1,1,0) — equal specificity; source order breaks ties. In interview framing, remember: any id component beats pure class selectors like .card .title.',
        ],
        [
          'Vertical margins between adjacent block siblings:',
          ['Add together', 'Collapse to the larger', 'Are ignored', 'Only collapse with padding'],
          1,
          'Margin collapsing: adjacent vertical margins merge to the max value.',
        ],
      ]
    ),
  ],
};
