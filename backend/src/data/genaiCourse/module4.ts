// Module 4 — GenAI for Study & Work (Applied Workflows)
import type { CourseModule } from '../db';
import { nineBlocks, tip, warn, info } from '../nineBlocks';
import { lesson, M4, COURSE_ID } from './helpers';

export const module4: CourseModule = {
  id: M4,
  course_id: COURSE_ID,
  title: 'Module 4 — GenAI for Study & Work',
  summary:
    'Research, writing, coding and placement workflows you can run tomorrow — with verification built in.',
  sort_order: 4,
  lessons: [
    lesson(
      M4,
      'ai-4-1',
      1,
      'Research, Writing and Coding Workflows',
      'Repeatable playbooks for literature review, editing and AI-assisted programming.',
      11,
      nineBlocks({
        objectives: [
          'Run a grounded research workflow that avoids fabricated citations',
          'Use edit-then-prompt revision loops for essays and reports',
          'Apply safe AI-assisted coding: plan, generate, test, review',
        ],
        hook: 'The difference between students who get value from GenAI and those who get burned is verification. Same tools, opposite outcomes — the workflow is the product.',
        concept: `**Research playbook:**
1. Ask for an outline and key questions first (not the final text).
2. Gather sources yourself (library, Google Scholar, docs) or use a product with citations.
3. Paste sources and ask for synthesis strictly from them, with quote-level citations.
4. Ask for a "gaps and caveats" section; verify every number and citation manually.

**Writing playbook:** outline → draft in sections → critique pass (structure, tone, redundancy) → final edit yourself. You own the voice; the model owns the heavy first pass. Never submit raw generation — admission/HR tools and readers detect the flatness quickly.

**Coding playbook:**
1. Describe the contract: inputs, outputs, edge cases, language and constraints.
2. Ask for a plan first for non-trivial changes; then code.
3. Run tests — generated code that "looks right" is untested code.
4. Paste errors back verbatim; iterate with the failing test visible.
5. Review for security: injection, secrets, unsafe deserialization, missing authz.

**What not to outsource:** final fact-checks, understanding your own thesis, anything requiring accountability for the output.`,
        extras: [
          tip(
            'Small verifiable chunks beat one giant ask',
            'Generate one function or one paragraph at a time with tests/outline as the check.',
          ),
          warn(
            'Plagiarism and policy',
            'Follow your institution\'s rules; treat model text as a draft you must fully understand and re-verify.',
          ),
        ],
        worked: {
          title: 'Grounded literature summary',
          problem: 'Summarize 5 real papers on a topic without fake citations.',
          steps: [
            { title: 'Collect sources', desc: 'Collect PDFs/abstracts yourself; note title, authors, year, key result per paper.' },
            { title: 'Paste with delimiters', desc: 'Paste into one prompt with clear delimiters per paper.' },
            { title: 'Synthesize strictly', desc: 'Task: compare methods and results strictly from these texts; cite [Paper 1] etc.' },
            { title: 'Verify', desc: 'Ask for open questions; manually verify each cited claim against the source.' },
          ],
          solution: 'Your sources + strict grounding + manual verification = defensible summary.',
        },
        practice: {
          title: 'Design a coding session',
          prompt: 'Write the four prompts you would use to build and debug a small Express rate-limiter with tests.',
          hint: 'Contract → plan → code+tests → fix from failing test output.',
        },
        mistakes: [
          {
            mistake: 'Asking for final citations before choosing sources',
            fix: 'Choose sources first; then synthesize only from them.',
          },
          {
            mistake: 'Shipping generated code without tests',
            fix: 'Ask for tests in the same turn and actually run them.',
          },
        ],
        exam: {
          question: 'Give two rules for safe AI-assisted coding.',
          answer: 'Run tests on every change; review for security issues (injection, secrets, authz) before merging.',
          source: 'Applied GenAI course outcome.',
        },
        summary: [
          'Research: sources first, synthesis second, verify always.',
          'Writing: you own the voice; model drafts and critiques.',
          'Code: contract → plan → generate → test → security review.',
        ],
      }),
      [
        [
          'For literature review, the safe order is:',
          ['Model invents citations, you accept', 'You choose sources; model synthesizes from them', 'Paste nothing; ask general knowledge', 'Raise temperature'],
          1,
          'Grounding prevents fake references.',
        ],
        [
          'Generated code should always be:',
          ['Pushed directly', 'Tested and security-reviewed', 'Logged out', 'Saved as canonical docs'],
          1,
          'Tests plus review.',
        ],
        [
          'Best editing workflow:',
          ['Accept first draft', 'Draft → critique pass → your final edit', 'Only spellcheck', 'Paraphrase randomly'],
          1,
            'Structured revision loop.',
        ],
      ]
    ),
    lesson(
      M4,
      'ai-4-2',
      2,
      'Career & Interview Use of GenAI',
      'Resume tailoring, mock interviews and the ethics/assessment landscape — what helps and what gets flagged.',
      10,
      nineBlocks({
        objectives: [
          'Tailor a resume to a JD without fabricating experience',
          'Run a structured mock interview loop with the model',
          'Explain how recruiters detect and view AI-generated application material',
        ],
        hook: 'One generic resume gets ignored; one tailored, truthful resume gets callbacks. GenAI is great at the tailoring — and catastrophic at inventing projects you cannot defend in the interview.',
        concept: `**Resume tailoring (safe):**
1. Paste JD; extract required skills and keywords.
2. Map them to your real projects; reorder bullets to surface matches.
3. Rewrite bullets with action verbs and metrics you can defend ("cut API latency 30%" only if true).
4. Never add skills, titles or dates you do not have — the interview is the truth test.

**Mock interview:** give the role, level and topic; ask the model to ask one question at a time, wait for your answer, then critique (structure via STAR, correctness, missing points) and continue. Do rounds: behavioral, technical fundamentals, problem-solving.

**Case / OA practice:** ask for problems of increasing difficulty; request hints only after a real attempt; ask for a post-mortem review of your solution.

**Assessment reality:** many companies use AI-detection heuristics and, more importantly, live interviews. Formulas written by AI that you cannot explain are a net negative. Use AI to learn and rehearse, not to fabricate.

**Ethics:** disclose where policy requires it; respect tool rules in exams; your portfolio should contain work you can narrate end-to-end.`,
        extras: [
          tip(
            'STAR beats vague stories',
            'When the model critiques your behavioral answer, ask specifically about Situation, Task, Action, Result clarity.',
          ),
          info(
            'Interviewers probe the delta',
            'Expect follow-ups exactly where your resume emphasizes a skill — prepare to go one level deeper.',
          ),
        ],
        worked: {
          title: 'Tailor a resume bullet',
          problem: 'JD emphasizes "REST APIs, testing, SQL". Resume currently: "Worked on backend services."',
          steps: [
            { title: 'Confirm truth', desc: 'Confirm what is true: you built 3 REST endpoints and wrote integration tests; MySQL queries.' },
            { title: 'Rewrite the bullet', desc: 'Rewrite: "Built 3 REST endpoints (Express + MySQL) with integration tests; reduced p95 latency 25% by adding indexes on hot query paths."' },
            { title: 'Check against JD', desc: 'Ask model to check against JD keywords; drop anything untrue.' },
            { title: 'Prepare to defend', desc: 'Practice explaining each term aloud for the interview.' },
          ],
          solution: 'Specific, verifiable, keyword-aligned — and you can defend every claim.',
        },
        practice: {
          title: 'Run a mock round',
          prompt: 'Write the opening prompt for a 30-minute mock interview for a fresher SDE-1 role in backend.',
          hint: 'Include format: one question at a time, then feedback at the end.',
        },
        mistakes: [
          {
            mistake: 'Inventing internship experience',
            fix: 'Tailoring reorders and sharpens truth; it does not create it.',
          },
          {
            mistake: 'Memorizing model-written answers verbatim',
            fix: 'Sound robotic and fail follow-ups; internalize the outline, speak in your words.',
          },
        ],
        exam: {
          question: 'What is an unsafe use of GenAI in job applications?',
          answer: 'Fabricating skills, projects or experience, or submitting generated work you cannot explain when probed.',
          source: 'Career-module scenario question.',
        },
        summary: [
          'Tailor truthfully: JD keywords mapped to real evidence.',
          'Mock interviews with structured critique build real readiness.',
          'Fabrication fails at the interview — AI is for preparation, not invention.',
        ],
      }),
      [
        [
          'Safe resume use of GenAI is to:',
          ['Add fake skills', 'Reorder and sharpen real experience', 'Change dates', 'Write a new degree'],
          1,
          'Tailoring, not fabrication.',
        ],
        [
          'Best mock interview format:',
          ['Model gives a speech', 'One question at a time with critique', 'Answer key only', 'Unstructured chat'],
          1,
          'Interactive rounds with feedback.',
        ],
        [
          'If a recruiter forbids AI in an assessment, you should:',
          ['Use it secretly', 'Follow the rule', 'Paraphrase AI text', 'Skip the role'],
          1,
          'Policy compliance is non-negotiable.',
        ],
      ]
    ),
  ],
};
