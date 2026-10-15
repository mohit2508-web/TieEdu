// Module 2 — Prompting that Works
import type { CourseModule } from '../db';
import { nineBlocks, tip, warn, code } from '../nineBlocks';
import { lesson, M2, COURSE_ID } from './helpers';

export const module2: CourseModule = {
  id: M2,
  course_id: COURSE_ID,
  title: 'Module 2 — Prompt Engineering',
  summary:
    'Structure, role, constraints and few-shot examples — repeatable patterns instead of magic words.',
  sort_order: 2,
  lessons: [
    lesson(
      M2,
      'ai-2-1',
      1,
      'Structure: Role, Task, Constraints, Format',
      'A four-part prompt skeleton that turns vague requests into reliable outputs.',
      11,
      nineBlocks({
        objectives: [
          'Assemble prompts with role, task, constraints and output format',
          'Use few-shot examples to pin style and schema',
          'Iterate with targeted revisions instead of restarting',
        ],
        hook: 'Two people ask for "a good email". One gets a generic paragraph; the other gets a subject line, three bullets, and a CTA — because the second prompt specified the job. Prompting is brief-writing, not spell-casting.',
        concept: `**The four-part skeleton:**
1. **Role** — who the model should act as ("You are a placement mentor for final-year CSE students.").
2. **Task** — the single concrete objective.
3. **Constraints** — length, tone, audience, what to avoid, what is out of scope.
4. **Format** — markdown sections, JSON schema, bullet count, subject line + body, etc.

**Few-shot examples:** show 1–3 input→output pairs. Examples beat adjectives ("be concise") because they demonstrate the exact style and structure.

**Delimiters:** wrap provided material in clear fences (### or XML-like tags) so the model does not confuse source text with instructions.

**Iteration:** if the output is 80% right, do not rewrite from scratch — say what to keep and what to change ("Keep the structure; make the tone less formal and cut the second paragraph").`,
        extras: [
          code(
            'Role: You are a senior frontend interviewer.\nTask: Generate 5 interview questions on JavaScript event loop.\nConstraints: Intermediate level; one sentence each; no trick questions.\nFormat: Numbered list only.',
            'prompt-skeleton.txt',
            'text'
          ),
          tip(
            'One task per prompt',
            'Split multi-part requests or the middle items degrade first.',
          ),
          warn(
            'Over-prompting',
            'A 2000-word prompt with contradictory constraints confuses more than a tight 150-word brief.',
          ),
        ],
        worked: {
          title: 'Rewrite a vague request',
          problem: 'Original: "Write something about internships." Produce a production-quality prompt.',
          steps: [
            { title: 'Role', desc: 'Role: career coach for 2nd-year students.' },
            { title: 'Task', desc: 'Task: 200-word LinkedIn-style post on finding a first internship.' },
            { title: 'Constraints', desc: 'Constraints: practical tips only; no cliches; Indian college context ok.' },
            { title: 'Format', desc: 'Format: hook sentence, 4 bullets, one question to end.' },
          ],
          solution:
            'Role: You are a career coach for second-year engineering students in India.\nTask: Write a 200-word LinkedIn post about landing a first internship.\nConstraints: Practical tips only; no "networking is key" clichés; friendly peer tone.\nFormat: One hook sentence, exactly 4 bullets, end with a question.',
        },
        practice: {
          title: 'Skeleton for a code review',
          prompt: 'Write a four-part prompt that reviews a pull request diff for correctness and naming.',
          hint: 'Role (reviewer seniority), task, constraints (what not to bikeshed), format (severity-tagged comments).',
        },
        mistakes: [
          {
            mistake: 'Stacking contradictory roles',
            fix: 'Pick one primary role; add secondary perspective only if clearly ordered.',
          },
          {
            mistake: 'Describing format in prose only',
            fix: 'Show the format with an example or an explicit schema.',
          },
        ],
        exam: {
          question: 'Name the four parts of a reliable prompt skeleton.',
          answer: 'Role, task, constraints, output format.',
          source: 'Standard GenAI screening question.',
        },
        summary: [
          'Role + task + constraints + format beats a single vague sentence.',
          'Few-shot examples pin style better than adjectives.',
          'Iterate surgically; wrap source text in delimiters.',
        ],
      }),
      [
        [
          'The four-part skeleton is:',
          ['Role, Task, Constraints, Format', 'Topic, Length, Tone, Emoji', 'Ask, Answer, Cite, Stop', 'Input, Prompt, Output, Log'],
          0,
          'The working production pattern.',
        ],
        [
          'Few-shot examples are used to:',
          ['Save tokens only', 'Demonstrate exact style and schema', 'Increase temperature', 'Avoid RAG'],
          1,
          'Show, do not just tell.',
        ],
        [
          'Best iteration strategy:',
          ['Start over every time', 'Keep what works; change one thing', 'Add 500 more words', 'Raise temperature'],
          1,
          'Targeted revision.',
        ],
      ]
    ),
    lesson(
      M2,
      'ai-2-2',
      2,
      'Chains, Roles and Self-Check',
      'Multi-step workflows, reflection loops and when to use tools instead of longer prompts.',
      10,
      nineBlocks({
        objectives: [
          'Break a complex goal into ordered sub-prompts (chaining)',
          'Add a self-check or critic step to improve quality',
          'Decide when to use tools/RAG instead of stuffing the prompt',
        ],
        hook: 'Ask one prompt to "research, outline, write and fact-check" and quality collapses in the middle. Separate the steps and each one becomes reliable — the same reason factories use assembly lines.',
        concept: `**Chaining:** step 1 produces structured intermediate output that step 2 consumes. Example: extract facts → outline → draft → critique → revise. Each step has its own format and success criteria.

**Critic / reflection:** after a draft, run a second pass: "List any unsupported claims and vague sentences; then rewrite." Critic models or even the same model with a different prompt often catch real issues.

**Self-consistency (lightweight):** sample a few answers at moderate temperature and take the majority or merge — useful for classification and math-ish tasks.

**Tools over prompt stuffing:** arithmetic, current facts, file contents, database queries and code execution belong to tools. A 5k-word prompt that tries to hard-code a calculator is worse than one tool call.

**Router pattern:** first call classifies the request (support vs sales vs bug) with a tiny structured output; then a specialized prompt handles it.`,
        extras: [
          tip(
            'Chain with explicit handoffs',
            'Each step should emit something the next step can parse — JSON fields beat free prose between steps.',
          ),
          warn(
            'Do not chain when one shot is enough',
            'A single well-formed prompt is cheaper and faster; chain only when quality actually fails in a single pass.',
          ),
        ],
        worked: {
          title: 'Chain a job-description rewrite',
          problem: 'Turn a messy internal JD into a polished public posting.',
          steps: [
            { title: 'Extract', desc: 'Step 1: Extract must-have skills, nice-to-haves, role level, location policy as JSON.' },
            { title: 'Draft', desc: 'Step 2: Draft the posting from the JSON only (prevents invented benefits).' },
            { title: 'Critic', desc: 'Step 3: Critic pass - flag jargon, bias-y phrasing, missing EEO-style clarity.' },
            { title: 'Revise', desc: 'Step 4: Revise using the critic list.' },
          ],
          solution: 'Four short prompts with JSON handoffs — each step measurable.',
        },
        practice: {
          title: 'Design a research chain',
          prompt: 'Outline a 3-step chain for summarizing a research paper for a manager with 2 minutes of attention.',
          hint: 'Extract claims → compress to 5 bullets → rewrite for non-ML audience.',
        },
        mistakes: [
          {
            mistake: 'Chaining without intermediate schemas',
            fix: 'Define the JSON or bullet contract between steps or errors compound.',
          },
          {
            mistake: 'Using a long prompt as a substitute for retrieval',
            fix: 'Dynamic data belongs in RAG or tools, not frozen prompt text.',
          },
        ],
        exam: {
          question: 'When should you prefer a tool call over a longer prompt?',
          answer: 'For live data, exact arithmetic, private documents and code execution — anything that must be correct and current.',
          source: 'Applied GenAI design interview.',
        },
        summary: [
          'Chain complex goals; hand off structured intermediates.',
          'Add a critic pass for drafts that must be reliable.',
          'Tools beat prompt-stuffing for facts, math and code.',
        ],
      }),
      [
        [
          'Chaining means:',
          ['One long prompt', 'Ordered sub-prompts with structured handoffs', 'Using multiple models only', 'Raising top-p'],
          1,
          'Assembly-line prompting.',
        ],
        [
          'A critic step is mainly for:',
          ['More creativity', 'Catching unsupported or vague content', 'Saving cost', 'Shortening context'],
          1,
          'Second-pass quality control.',
        ],
        [
          'Live stock prices should come from:',
          ['The model memory', 'A tool or RAG', 'Higher temperature', 'Few-shot only'],
          1,
          'Models do not know today’s market.',
        ],
      ]
    ),
  ],
};
