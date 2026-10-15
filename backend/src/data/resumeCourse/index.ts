// ============================================================================
// RESUME + LINKEDIN BUILDING — pilot micro-course (Bucket E / priority 1).
//
// Why this one first: it is the fastest first-certificate hook in the plan.
// A learner with no prior course can finish it in an evening and walk away with
// a verifiable TieEdu certificate, which is what makes the free tier feel worth
// starting. It is deliberately short — four modules, each closing one loop —
// rather than padded, because the micro-course's whole job is to be finishable.
//
// Every lesson follows the 9-block standard via nineBlocks() in ../nineBlocks,
// so the shape is guaranteed and a learner always sees the same nine steps.
// ============================================================================

import type { Course, CourseLesson, CourseModule, ExamQuestion } from '../db';
import { nineBlocks, md, tip, table, type BlockSpec } from '../nineBlocks';

/** One lesson: 9 blocks + an optional quick quiz. */
const lesson = (
  moduleId: string,
  id: string,
  sort: number,
  title: string,
  summaryText: string,
  duration: number,
  blocks: BlockSpec[],
  questions?: [string, string[], number, string][]
): CourseLesson => ({
  id,
  module_id: moduleId,
  title,
  summary: summaryText,
  sort_order: sort,
  duration_minutes: duration,
  xp_reward: 30,
  video: null,
  blocks: blocks.map((spec, i) => ({
    id: `${id}-b${String(i + 1).padStart(2, '0')}`,
    block_type: spec.block_type,
    block_order: i + 1,
    payload: spec.payload,
  })),
  quiz: questions
    ? {
        id: `quiz-${id}`,
        passing_percent: 70,
        questions: questions.map(([prompt, options, correct_index, explanation], i) => ({
          id: `${id}-q${i + 1}`,
          prompt,
          options,
          correct_index,
          explanation,
        })),
      }
    : null,
});

const M1 = 'rl-m1';
const M2 = 'rl-m2';
const M3 = 'rl-m3';
const M4 = 'rl-m4';

const modules: CourseModule[] = [
  {
    id: M1,
    course_id: 'crs-resume-linkedin',
    title: 'Module 1 — What a resume is actually for',
    summary: 'The one-page, six-second rule. What recruiters and ATS actually read, and the four sections every resume needs.',
    sort_order: 1,
    lessons: [
      lesson(
        M1,
        'rl-1-1',
        1,
        'The six-second resume',
        'Why a recruiter spends six seconds on your resume first, and how to pass that skim.',
        12,
        nineBlocks({
          objectives: [
            'Explain what a recruiter looks for in the first six seconds of a resume',
            'Name the four sections every resume needs',
            'Restructure a resume so the skim test finds what matters',
          ],
          hook: `A recruiter at a campus drive has 200 resumes for 40 seats and one afternoon. They do not read them. They skim them — top third, a few keywords, a decision. Research on eye-tracking puts the first pass at around six seconds, and in those six seconds they are looking for four things: who you are, what you want, what you have done, and whether you are worth a call.

Your resume is not a document you write for yourself. It is a document written for a skim.`,
          concept: `## The skim has a shape

When a recruiter picks up your resume, their eyes follow a predictable path — not because they are lazy, but because they are fast. They start at the top-left of the page, take in the name and the role you are targeting, then drop to the first bullet of your most recent experience, then scan down the left edge for dates and employers, then check education at the bottom.

That path is why the order of your sections matters more than the polish of your typeface. A resume that hides your degree on page two, or buries your internship under a wall of coursework, is a resume that loses the skim.

## The four sections

Every resume that works has the same four bones, in roughly this order:

1. **Header** — name, phone, email, LinkedIn, city. Not "contact me if interested".
2. **Target line** — the role you want. "SDE Intern" or "Data Analyst Intern". This is what tells the recruiter which pile you belong in.
3. **Experience** — internships, projects, open source, research. This is the bulk, and it is where the decision is made.
4. **Education** — degree, college, CGPA if strong, graduation year.

Skills, certifications and achievements hang off those four. They are supporting cast, not the play.`,
          extras: [
            table(
              'What the skim is looking for',
              ['Where the eye lands', 'What it is checking', 'How long you have'],
              [
                ['Header', 'Name, contact, LinkedIn', '1 second'],
                ['Target line', 'Which role this resume is for', '1 second'],
                ['First experience bullet', 'Have they done anything real?', '2 seconds'],
                ['Left-edge scan', 'Dates, employers, progression', '1 second'],
                ['Education', 'Degree, college, year', '1 second'],
              ]
            ),
            tip(
              'The one-page rule is not a suggestion',
              'A fresher with a one-page resume is telling the recruiter "I know what matters". A fresher with two pages is telling them "I could not cut anything". Neither is a good first impression.'
            ),
          ],
          worked: {
            title: 'Restructuring a resume that fails the skim',
            problem: `A second-year student's resume, as written:

- Name, "B.Tech CSE Student", phone, email
- "Skills: C, C++, Java, Python, HTML, CSS, JS, React, Node, MongoDB, MySQL, Git, Linux, MS Office"
- "Education: B.Tech CSE, ABC College of Engineering, 2023-2027"
- "Projects: College website (React), Student result portal (PHP), Snake game (Python)"
- "Certifications: Java (Coursera), Python (Udemy), Web Dev (Udemy)"
- "Strengths: Hard working, team player, quick learner, positive attitude"

The problem: nothing tells the recruiter what role this student wants, the skills list is a word cloud, the projects have no outcomes, and the whole bottom half is filler every applicant also has.`,
            steps: [
              {
                title: 'Add the target line',
                desc: 'Under the name, put the role. "SDE Intern — Summer 2026". This alone moves the resume out of the "generic" pile.',
              },
              {
                title: 'Cut the skills list to what you can defend',
                desc: 'Six skills you can talk about beat sixteen you cannot. Group them: Languages, Web, Tools. Drop MS Office — everyone has it.',
              },
              {
                title: 'Give every project an outcome',
                desc: 'Not "Built a college website" but "Built the college department site in React used by 300+ students; cut page load from 4s to 1s by lazy-loading the course list".',
              },
              {
                title: 'Delete the filler section',
                desc: 'No "hard working", no "team player", no "positive attitude". Every resume claims these. Prove them in a bullet instead.',
              },
              {
                title: 'Move education down, keep it clean',
                desc: 'Degree, college, CGPA (if above 7.5), expected graduation. Nothing more. No school, no 12th marks, no "hobbies".',
              },
            ],
            solution: `The rebuilt resume, top to bottom:

**RAHUL SHARMA** | +91 98xxx xxxxx | rahul@email.com | linkedin.com/in/rahulsharma | github.com/rahuls

**Target: SDE Intern — Summer 2026**

**Projects**
- College department site (React) — used by 300+ students; lazy-loading cut load time 4s → 1s
- Student result portal (PHP, MySQL) — automated result publication for 1,200 students, replacing a manual Excel process
- Snake game (Python, Pygame) — 400+ GitHub stars after a college Discord post

**Skills** — Languages: C++, Python, JavaScript · Web: React, Node, HTML/CSS · Tools: Git, Linux, MySQL

**Education** — B.Tech CSE, ABC College of Engineering, CGPA 8.2, graduating 2027

Same student. Same facts. One of these gets a call.`,
          },
          practice: {
            title: 'Run the skim test on your own resume',
            prompt: `Print your resume (or open it full-screen). Set a timer for six seconds. Look at it, then look away and write down, from memory: the role you are targeting, your strongest experience bullet, your degree and college, and your graduation year.

If you cannot recall all four, a recruiter cannot either. Fix whatever you missed — usually the target line or the first bullet — and run the test again.`,
            hint: 'The most common failure is the missing target line. If a stranger cannot tell what job you want from the top third of the page, you have not finished.',
          },
          mistakes: [
            {
              mistake: 'Listing every technology you have ever touched',
              fix: 'A skills list is a promise. Six skills you can defend in an interview beat sixteen you cannot — the interviewer will pick one at random.',
            },
            {
              mistake: 'Putting your school and 12th marks on a fresher resume',
              fix: 'After your first year of college, school marks are noise. Degree, college, CGPA, year. That is all an interviewer needs.',
            },
            {
              mistake: 'Writing "hard working, team player, quick learner"',
              fix: 'Every resume claims these. Delete the section and prove one of them inside a real bullet instead.',
            },
          ],
          exam: {
            question: 'In a campus drive with 200 resumes for 40 seats, roughly how long does a recruiter spend on the first pass of each resume, and what are they looking for?',
            answer: 'Around six seconds. They are looking for four things: who you are, what role you want, what you have actually done, and whether you are worth a phone call. The skim is a filter, not a read.',
            source: 'Common HR screening practice, campus drives',
          },
          summary: [
            'A resume is written for a recruiter\'s six-second skim, not for you.',
            'The skim path: header → target line → first experience bullet → left-edge scan → education.',
            'Four bones every resume needs: header, target line, experience, education.',
            'One page for a fresher. Cutting is the skill.',
            'Delete filler attributes; prove them inside real bullets instead.',
          ],
        }),
        [
          [
            'What are the four sections every resume needs?',
            ['Summary, skills, hobbies, education', 'Header, target line, experience, education', 'Photo, declaration, skills, education', 'Objective, hobbies, achievements, education'],
            1,
            'Header, target line, experience, education. The others are optional dressing; these four are the bones.',
          ],
          [
            'Why should a fresher keep the resume to one page?',
            [
              'Because two pages gets rejected by ATS software',
              'Because a one-page resume signals you know what matters',
              'Because there is a legal limit',
              'Because recruiters refuse to read two pages',
            ],
            1,
            'It is a signal of judgement, not a hard rule. A one-page resume says you could cut what did not matter.',
          ],
          [
            'Which of these belongs in the target line?',
            ['"Hard working B.Tech student seeking opportunities"', '"SDE Intern — Summer 2026"', '"To use my skills for the growth of the organization"', '"Looking for a challenging role in a reputed company"'],
            1,
            'A specific role with a timeframe. The others are generic and tell the recruiter nothing about which pile you belong in.',
          ],
        ]
      ),
      lesson(
        M1,
        'rl-1-2',
        2,
        'ATS: writing for the machine first',
        'How applicant tracking systems parse your resume, and the four mistakes that get you filtered out before a human sees you.',
        12,
        nineBlocks({
          objectives: [
            'Explain what an ATS does to your resume before a human reads it',
            'Restructure a resume so an ATS parses every section correctly',
            'Avoid the four formatting mistakes that fail ATS parsing',
          ],
          hook: `You apply online. Your resume goes into an applicant tracking system — Workday, Taleo, Greenhouse, Lever — and for most large companies, that system is the first reader. It does not care how good your typography is. It cares whether it can pull out your name, your email, your work history, and your skills into fixed fields.

If it cannot, your resume is either dropped into a "low match" bucket or shown to a recruiter as an unparseable mess. Either way, you never get the six-second skim.`,
          concept: `## What the ATS actually does

An ATS parses your resume into structured fields: name, contact, employers, dates, titles, education, skills. It then scores the resume against the job description by keyword overlap. A human recruiter later looks at the shortlist, often sorted by that score.

This is why two people with identical experience can get different results — one resume parses cleanly and scores well, the other parses into garbage and scores badly.

## The four parsing killers

1. **Tables and text boxes.** Many parsers read left-to-right, top-to-bottom, ignoring visual layout. A two-column resume with your skills in a side column often ends up interleaved with your experience text.
2. **Headers and footers.** Contact details in the header are frequently invisible to the parser. Put them in the body.
3. **Images and icons.** A phone icon instead of the word "Phone", or a photo header, can break field detection.
4. **Creative section names.** "My Journey" instead of "Experience" means the parser does not know it is work history.

The fix for all four is the same: plain single-column layout, standard section names, text (not icons) for contact details.`,
          extras: [
            table(
              'ATS-safe vs ATS-risky',
              ['Element', 'ATS-safe', 'ATS-risky'],
              [
                ['Layout', 'Single column, top to bottom', 'Two columns, sidebars, text boxes'],
                ['Contact', 'In the body, labelled "Phone:" / "Email:"', 'In the header or footer'],
                ['Section names', 'Experience, Education, Skills', 'My Journey, Where I Have Been'],
                ['Dates', 'Jun 2024 – Aug 2024', 'Summer \'24'],
                ['Skills', 'Plain list: C++, Python, Git', 'Icons or progress bars'],
              ]
            ),
            tip(
              'Save as PDF, but keep a .docx copy',
              'PDF preserves your layout for the human. Some older ATS parsers mangle PDF text layers. Having both ready lets you submit whichever the portal asks for.',
            ),
          ],
          worked: {
            title: 'Fixing a resume an ATS could not parse',
            problem: `A student applies through a company portal. The resume looks great in Word: two columns, skills as coloured icons in a sidebar, contact details in the header, a photo top-right, and a section titled "My Learning Journey".

Two weeks later, no response. The student applies again with a friend's referral and gets a call. The friend, who works there, checks: the original application was marked "unable to parse" and never reached a recruiter.

What broke, and how to fix it, section by section.`,
            steps: [
              {
                title: 'Kill the two-column layout',
                desc: 'Move everything into one column. The sidebar skills move under a "Skills" heading after Experience.',
              },
              {
                title: 'Move contact details into the body',
                desc: 'First line of the document: Name, then Phone, Email, LinkedIn, GitHub — each labelled in plain text.',
              },
              {
                title: 'Replace icons with words',
                desc: 'No phone glyph, no LinkedIn logo. The words "Phone" and "LinkedIn" are what the parser matches.',
              },
              {
                title: 'Rename sections to standard names',
                desc: '"My Learning Journey" becomes "Projects". "Where I Have Been" becomes "Experience". The parser matches on the word.',
              },
              {
                title: 'Write dates in a full, consistent format',
                desc: 'Jun 2024 – Aug 2024, not Summer \'24. The parser needs a month and a year to compute duration.',
              },
            ],
            solution: `The parseable version, same content:

RAHUL SHARMA
Phone: +91 98xxx xxxxx
Email: rahul@email.com
LinkedIn: linkedin.com/in/rahulsharma
GitHub: github.com/rahuls

**Experience**
Software Engineering Intern, XYZ Pvt Ltd — Jun 2024 – Aug 2024
- Automated a manual reporting step, cutting 4 hours of weekly work to 15 minutes

**Projects**
College department site (React) — used by 300+ students

**Skills**
C++, Python, JavaScript, React, Node, MySQL, Git, Linux

**Education**
B.Tech CSE, ABC College of Engineering, CGPA 8.2, graduating 2027

Same facts. Now a machine can read them, and a human still can.`,
          },
          practice: {
            title: 'Parse your own resume',
            prompt: `Copy the entire text of your resume (Ctrl+A, Ctrl+C, paste into a plain text editor like Notepad). Read what you pasted.

If your contact details are missing, your skills are out of order, your dates are garbled, or two sections have merged into one paragraph — that is exactly what the ATS sees. Fix the source document, paste again, and stop when the plain text reads cleanly top to bottom.`,
            hint: 'The paste test is the fastest ATS check you can run. If it looks wrong in Notepad, it looks wrong to the parser.',
          },
          mistakes: [
            {
              mistake: 'Using a two-column template with a skills sidebar',
              fix: 'Most parsers read linearly. A sidebar either vanishes or interleaves with your experience. Single column, always.',
            },
            {
              mistake: 'Putting your phone and email in the document header',
              fix: 'Headers are frequently skipped. Put contact details as the first lines of the body, labelled in plain text.',
            },
            {
              mistake: 'Inventing a creative section title',
              fix: '"My Journey" means nothing to a parser. Use "Experience", "Projects", "Education", "Skills" — the words it matches on.',
            },
          ],
          exam: {
            question: 'A resume is submitted through an online portal and marked "unable to parse". What is the most likely cause, and what is the single most effective fix?',
            answer: 'Most likely a layout the parser cannot read linearly — a two-column template, text boxes, or contact details in the header. The single most effective fix is a plain single-column layout with contact details in the body and standard section names.',
            source: 'ATS parsing behaviour, Workday / Greenhouse / Taleo',
          },
          summary: [
            'For most large companies, an ATS reads your resume before a person does.',
            'It parses you into fixed fields and scores keyword overlap with the job description.',
            'Four parsing killers: two columns, header/footer contact, icons, creative section names.',
            'Fix is always the same: single column, plain text contact, standard headings.',
            'Run the paste test: Ctrl+A into Notepad. If it reads cleanly, so does the parser.',
          ],
        }),
        [
          [
            'Where should your contact details go for maximum ATS compatibility?',
            ['In the document header', 'In the body, as the first labelled lines', 'In the footer', 'On a separate contact page'],
            1,
            'Headers and footers are frequently invisible to parsers. The body, labelled in plain text, is always read.',
          ],
          [
            'Which section name would an ATS most likely fail to classify as work history?',
            ['Experience', 'Work History', 'My Learning Journey', 'Employment'],
            2,
            'Parsers match on standard headings. "My Learning Journey" matches nothing.',
          ],
          [
            'What does an ATS primarily score your resume on?',
            [
              'How visually appealing it is',
              'Keyword overlap with the job description',
              'The length of your summary',
              'The number of certifications listed',
            ],
            1,
            'Keyword overlap with the job description. Which is why tailoring the skills and experience wording per application matters.',
          ],
        ]
      ),
    ],
  },
  {
    id: M2,
    course_id: 'crs-resume-linkedin',
    title: 'Module 2 — Experience bullets that survive a skim',
    summary: 'Turning projects and internships into outcome-led bullets. The formula, the numbers, and the verbs that work.',
    sort_order: 2,
    lessons: [
      lesson(
        M2,
        'rl-2-1',
        1,
        'From duties to outcomes',
        'The single rewrite that changes how a bullet reads: stop describing what you did, start describing what changed.',
        12,
        nineBlocks({
          objectives: [
            'Rewrite a duty-style bullet into an outcome-style bullet',
            'Apply the action → task → result structure to any experience',
            'Find a real number for a bullet that seems to have none',
          ],
          hook: `Here are two bullets from the same internship:

- "Responsible for the backend of the company dashboard."
- "Rebuilt the dashboard's data layer, cutting the API's p95 response time from 1.8s to 240ms for 40 daily users."

Same work. Same person. The first bullet tells a recruiter nothing they can repeat to their manager. The second one is a sentence they can quote in a hiring meeting.

The difference is not vocabulary. It is that the second bullet ends in a result.`,
          concept: `## The shape of a bullet that works

Every good bullet has three parts, and most weak bullets are missing the third:

1. **Action** — a strong verb. Built, cut, automated, migrated, designed.
2. **Task** — what you did it to. The system, the process, the codebase.
3. **Result** — what changed. Faster, cheaper, used by more people, fewer errors, less time.

"Responsible for X" fails on all three. "Responsible" is not an action — it is a job description. And there is no result.

## Finding the number you think you do not have

Most students say "my project had no measurable outcome". It almost always does. Ask three questions:

- **Time:** how long did this take before, and how long after?
- **Scale:** how many people used it, how many records, how many requests?
- **Change:** what was broken or slow or manual, and what is it now?

If the answer is genuinely "nothing changed" — you built a to-do app and nobody used it — then the honest number is the scope: "a to-do app for 3 courses, 12 endpoints, 800 lines of tested code". Specific beats vague even when there is no impact number.`,
          extras: [
            table(
              'Duty vs outcome',
              ['Duty-style', 'Outcome-style'],
              [
                ['"Worked on the login module"', '"Added password reset, cutting support tickets about locked accounts by ~30%"'],
                ['"Made reports"', '"Automated the weekly sales report, saving 3 hours of manual Excel work each week"'],
                ['"Responsible for testing"', '"Wrote 60 unit tests that caught 4 regressions before release"'],
                ['"Built a website"', '"Built the department site in React, used by 300+ students, load time cut 4s → 1s"'],
              ]
            ),
            tip(
              'If you truly have no number, use scope, not adjectives',
              '"A REST API with 12 endpoints and 800 lines of tests" is stronger than "a robust, scalable backend". Adjectives are claims; numbers are evidence.',
            ),
          ],
          worked: {
            title: 'Rewriting three real bullets',
            problem: `A student's project section, as originally written:

- "Made a college result portal using PHP and MySQL."
- "Worked on a movie recommendation system using Python."
- "Did an internship at a startup where I helped with their website."

Every one of these is a duty, not an outcome. None of them survives a skim. Rewrite each one.`,
            steps: [
              {
                title: 'Portal: find the scale and the change',
                desc: 'What did the portal replace? If results used to be published as a PDF on a noticeboard, and now students log in and see them — that is the outcome. How many students? 1,200. That is your number.',
              },
              {
                title: 'Recommendation system: what does it actually do, and how well?',
                desc: 'If it has an accuracy number, use it. If not, use the scope: dataset size, the algorithm, how many movies. "Cosine-similarity recommender over 5,000 MovieLens ratings" is specific.',
              },
              {
                title: 'Internship: what did you touch, and what was the effect?',
                desc: '"Helped with their website" is invisible. What did you change? A bug, a page, a deploy process? If you only fixed small things, say so honestly with scope: "fixed 15 UI bugs across 4 pages over 6 weeks".',
              },
              {
                title: 'Rebuild all three with action → task → result',
                desc: 'Strong verb, the thing, the change. Read each one aloud. If it does not end in something that changed, rewrite the ending.',
              },
            ],
            solution: `The rewritten section:

- **Student result portal (PHP, MySQL)** — Built a login-based result portal serving 1,200 students, replacing a manual noticeboard process; result publication time cut from 2 days to same-day.
- **Movie recommender (Python, scikit-learn)** — Implemented a cosine-similarity recommender over 5,000 MovieLens ratings, evaluating 3 similarity metrics to pick the best; 78% top-3 hit rate on held-out ratings.
- **Web intern, ABC Startup (6 weeks)** — Fixed 15 UI bugs across 4 customer-facing pages and added a contact form that cut support emails by roughly a third.

Same person. Now a recruiter has three sentences they can repeat to a hiring manager.`,
          },
          practice: {
            title: 'Rewrite your three weakest bullets',
            prompt: `List every experience, project and internship bullet on your current resume. Find the three weakest — the ones that start with "Responsible for", "Worked on", "Helped with", or "Assisted in".

Rewrite each using action → task → result. For each, force yourself to write down one number, even if it is a scope number (how many users, how many endpoints, how many lines of tests). If you cannot find a number, the bullet is still too vague.`,
            hint: 'Start the bullet with a past-tense action verb: built, cut, automated, migrated, designed, shipped, fixed.',
          },
          mistakes: [
            {
              mistake: 'Starting every bullet with "Responsible for"',
              fix: 'Responsible for is a job description, not an achievement. Start with a past-tense action verb: built, cut, automated, migrated.',
            },
            {
              mistake: 'Hiding behind "we" so your own contribution is invisible',
              fix: '"We built" tells the recruiter nothing about you. Say what you specifically did inside the team work.',
            },
            {
              mistake: 'Inflating a small fix into a transformation',
              fix: 'Recruiters smell inflation. "Cut load time from 4s to 1s" is great if true. If you only fixed a typo, say "fixed", and let the volume of fixes speak.',
            },
          ],
          exam: {
            question: 'Rewrite this bullet as an outcome-led bullet: "Responsible for the backend of the company dashboard."',
            answer: 'Any version with action → task → result. Example: "Rebuilt the dashboard\'s data layer, cutting the API\'s p95 response time from 1.8s to 240ms for 40 daily users." The key is ending in what changed.',
            source: 'Standard resume-writing practice',
          },
          summary: [
            'Every good bullet: action → task → result. Most weak bullets miss the result.',
            'Find your number: time saved, scale reached, errors cut. No number? Use scope.',
            '"Responsible for" is a job description. Replace it with a past-tense verb.',
            'Use "I", not "we", for your own contribution inside team work.',
            'Specific beats vague even when there is no impact number.',
          ],
        }),
        [
          [
            'What are the three parts of a strong resume bullet?',
            ['Action, task, result', 'Action, adjective, result', 'Duty, task, responsibility', 'Task, tool, adjective'],
            0,
            'Action → task → result. The result is the part most students omit, and the part recruiters quote in hiring meetings.',
          ],
          [
            'Which is the strongest rewrite of "Worked on the login module"?',
            [
              '"Responsible for various aspects of authentication"',
              '"Added password reset, cutting locked-account support tickets by ~30%"',
              '"Worked collaboratively on login"',
              '"Involved in authentication development"',
            ],
            1,
            'It has a verb, a specific task, and a number. The others are all duty-style.',
          ],
          [
            'You built a project nobody used. What is the honest way to write the bullet?',
            [
              'Invent a user number to sound bigger',
              'Use scope: endpoints, lines of tested code, dataset size',
              'Leave the project off the resume',
              'Write "a robust and scalable application"',
            ],
            1,
            'Scope is honest and specific. Inflated numbers get caught in interviews; adjectives convince nobody.',
          ],
        ]
      ),
      lesson(
        M2,
        'rl-2-2',
        2,
        'Action verbs and the words that get you filtered',
        'Which verbs carry weight, which ones are filler, and how to match the job description without keyword-stuffing.',
        11,
        nineBlocks({
          objectives: [
            'Choose action verbs that match the level of the work you did',
            'Identify and replace filler phrases that carry no information',
            'Tailor resume wording to a job description without keyword-stuffing',
          ],
          hook: `There is a version of resume advice that says "start every bullet with a power verb" and then hands you a list of fifty: spearheaded, orchestrated, leveraged, synergized. Most of those words make your resume worse, not better.

"Spearheaded the migration of the user table" for an intern who ran a script once is a claim that collapses in the interview. "Ran the migration script for the user table, verified row counts, and rolled back a bad batch" is a claim you can defend.

The right verb is the one that is true at your level.`,
          concept: `## Verbs that carry information

A good action verb tells the recruiter the *kind* of work you did. The useful families:

- **Built / shipped** — you produced something that exists now.
- **Cut / reduced / automated** — you made something faster, cheaper or smaller.
- **Migrated / upgraded** — you moved something from state A to state B.
- **Fixed / debugged** — you found and resolved a real fault.
- **Designed / architected** — you made the structural decisions (use carefully as a fresher).
- **Tested / validated** — you proved something works.

## Words that are filler

"Helped", "assisted", "participated", "involved in", "responsible for" — these are all attempts to avoid saying what you actually did. Replace each with the specific thing.

"Various", "several", "many" — if you can count it, count it.

"Robust", "scalable", "efficient", "user-friendly" — adjectives are claims. A number is evidence.

## Matching the job description, honestly

Read the job description. Note the three or four skills or technologies it repeats. If you genuinely have them, make sure they appear in your resume in your own words — in a project bullet, not just a skills list.

If you do not have them, do not fake them. A resume that matches on paper and fails the first technical question is worse than one that was honest and got a call for a different role.`,
          extras: [
            table(
              'Filler → specific',
              ['Filler', 'Specific'],
              [
                ['"Helped with the backend"', '"Built 4 REST endpoints for the order service"'],
                ['"Various testing tasks"', '"Wrote 60 unit tests; caught 4 regressions pre-release"'],
                ['"Involved in a migration"', '"Migrated 12k user rows from MySQL to Postgres, verified counts"'],
                ['"Made the app more efficient"', '"Cut bundle size 1.2MB → 380KB by code-splitting the router"'],
              ]
            ),
            tip(
              'One true verb beats five impressive ones',
              '"Built", "cut", "fixed", "migrated" are the four that do the most work for a fresher. You do not need "spearheaded" or "orchestrated" until you have actually led something.',
            ),
          ],
          worked: {
            title: 'Tailoring one resume to two different job descriptions',
            problem: `Rahul has one solid project: a college department site in React, used by 300+ students, with a Node backend and MySQL.

He is applying to two roles:

1. **Frontend Engineer intern** — the JD repeats: React, TypeScript, CSS, performance, accessibility.
2. **Backend Engineer intern** — the JD repeats: Node, REST, databases, caching, testing.

He has one set of experience. How does he write two resumes that are both honest?`,
            steps: [
              {
                title: 'Write the common core once',
                desc: 'The facts never change: React site, 300+ students, Node backend, MySQL, load-time cut. Draft the bullets once.',
              },
              {
                title: 'Frontend version: lead with the frontend facts',
                desc: 'First bullet emphasises React, the load-time win, component structure. Backend appears second, briefly. Skills list puts React/JS first.',
              },
              {
                title: 'Backend version: lead with the backend facts',
                desc: 'First bullet emphasises the Node API, the database schema, the query that was slow. Frontend appears second, briefly. Skills list puts Node/MySQL first.',
              },
              {
                title: 'Cut what the JD does not care about',
                desc: 'Neither version mentions the Snake game or the Coursera certificates. They are real, but they are not what these two roles are hiring for.',
              },
            ],
            solution: `Frontend version, first two bullets:

- Rebuilt the department site in React, cutting page load from 4s to 1s via route-level code-splitting and lazy-loaded course data
- Designed a 14-component library reused across 6 pages, with keyboard-navigable menus meeting WCAG AA

Backend version, first two bullets:

- Designed and built the Node/Express API (18 REST endpoints) behind the department site, with MySQL schema normalised to 3NF
- Profiled and fixed the slowest query (result lookup, 900ms → 40ms) by adding a composite index and connection pooling

Same project. Same truth. Each resume answers the question the JD is actually asking.`,
          },
          practice: {
            title: 'Tailor for one real job posting',
            prompt: `Find one real internship or fresher job posting you could plausibly apply for. Copy the JD text.

Underline the three skills or technologies it mentions most. Now go through your resume and, for each one, write down where (if anywhere) you have evidence of it. Anything you have not actually done, strike off your skills list. Anything you have done but buried, move it up.`,
            hint: 'The goal is not to match every keyword. It is to make sure the three that matter are impossible to miss.',
          },
          mistakes: [
            {
              mistake: 'Using "spearheaded" or "orchestrated" as an intern',
              fix: 'These imply leadership you may not have had. "Built", "cut", "fixed", "migrated" are true at every level and carry more information.',
            },
            {
              mistake: 'Stuffing the skills list with every word from the JD',
              fix: 'Keyword-stuffing gets you past the first filter and destroyed in the interview. List only what you can defend.',
            },
            {
              mistake: 'Sending the identical resume to every application',
              fix: 'A resume tailored to the three skills that matter in a JD consistently outperforms a generic one. Same facts, different emphasis.',
            },
          ],
          exam: {
            question: 'A job description asks for "React, TypeScript, testing". You know React well, have used TypeScript a little, and have never written a test. How should your resume handle this?',
            answer: 'List React with evidence in a project bullet. Mention TypeScript only if you can defend it in an interview — a half-truth is a trap. Do not list testing at all; instead, if you have any testing-adjacent experience (manual QA, verifying outputs), describe that honestly. Never fake a skill the interview will probe.',
            source: 'Interview screening reality',
          },
          summary: [
            'The right verb is true at your level: built, cut, fixed, migrated.',
            'Filler words: helped, assisted, various, robust, scalable. Replace with specifics.',
            'Adjectives are claims; numbers are evidence.',
            'Tailor emphasis per JD using the same honest facts — never invent skills.',
            'A resume that matches on paper and fails the interview is worse than an honest one.',
          ],
        }),
        [
          [
            'Which verb family is most honest and informative for a fresher?',
            ['Spearheaded, orchestrated, leveraged', 'Built, cut, fixed, migrated', 'Helped, assisted, participated', 'Managed, directed, oversaw'],
            1,
            'These are true at intern level and carry real information about the kind of work.',
          ],
          [
            'What is keyword-stuffing, and why does it backfire?',
            [
              'Listing too many skills — it makes the resume too long',
              'Adding JD keywords you do not have — it passes the ATS then fails the interview',
              'Using the same verb repeatedly — it reads as lazy',
              'Putting skills in the header — it clutters the top',
            ],
            1,
            'It is adding skills you cannot defend to match the JD. It gets you past the first filter and destroyed in the technical round.',
          ],
          [
            'You are applying to a backend role with the same project as a frontend role. What changes?',
            [
              'Nothing — send the same resume',
              'The facts stay identical; the emphasis, order and skills list shift to backend',
              'You delete the frontend work entirely',
              'You add backend skills you have not used',
            ],
            1,
            'Same honest facts, different emphasis. The backend version leads with the API and database work.',
          ],
        ]
      ),
    ],
  },
  {
    id: M3,
    course_id: 'crs-resume-linkedin',
    title: 'Module 3 — Projects and education, done properly',
    summary: 'How to present projects so they read as experience, and how to handle education, CGPA and certifications without filler.',
    sort_order: 3,
    lessons: [
      lesson(
        M3,
        'rl-3-1',
        1,
        'Projects as experience',
        'For a fresher, projects are the experience section. How to choose, structure and present them so they carry the resume.',
        12,
        nineBlocks({
          objectives: [
            'Select the two or three projects that best represent your ability',
            'Structure a project entry with the four elements recruiters look for',
            'Present a project you did as a group without hiding your own contribution',
          ],
          hook: `If you are a fresher, your Projects section is doing the work that an experienced hire's Employment section does. A recruiter reading your resume for an internship is really asking one question: has this person built anything that worked?

Three projects, each with a clear stack, a clear outcome and a clear personal contribution, beat ten GitHub repos nobody has cloned. The section is not a mirror of your GitHub. It is an argument that you can build.`,
          concept: `## Choose two or three, not ten

The projects on your resume should be the ones you could talk about for ten minutes each without notes. That means cutting. A project you abandoned in a weekend, a tutorial you followed, a "ToDo app" clone — these can live on GitHub. They do not belong on the page.

A good resume project has:
- A **real user** or a **real dataset** — not "for practice".
- A **stack you can name** — languages, frameworks, database.
- A **number** — users, records, load time, accuracy, uptime.
- A **thing that was hard** — the problem you hit and solved.

## The four elements of a project entry

1. **Name and one-line what-it-is.** "Student result portal — login-based result publication for 1,200 students."
2. **Stack.** PHP, MySQL, Apache. Or React, Node, MongoDB. Name what you actually used.
3. **Your contribution, specific.** What did you personally build? The schema? The auth? The front end?
4. **The outcome.** A number, a change, a scale. This is the part most students skip.

## Group projects

If it was a team project, do not write "we built" and leave your own part invisible. Write the team scope in one clause, then your part in the verb: "Built the authentication and session layer (JWT, 3 roles) for a 4-member team project serving 200 users."`,
          extras: [
            table(
              'Weak vs strong project entry',
              ['Weak', 'Strong'],
              [
                ['"ToDo App — React"', '"TaskFlow (React, Node, MongoDB) — team of 3; built the drag-and-drop board and offline sync used by 80 hostelmates"'],
                ['"College website project"', '"Dept site (React, Node) — 300+ students; route-level code-splitting cut load 4s → 1s"'],
                ['"Movie recommendation system"', '"Recommender (Python, scikit-learn) — cosine similarity over 5k MovieLens ratings; 78% top-3 hit rate"'],
              ]
            ),
            tip(
              'One project with a number beats three without',
              'A single entry that names a stack, a scale and a result is worth more than three tutorial clones listed side by side.',
            ),
          ],
          worked: {
            title: 'Turning a tutorial clone into a resume project',
            problem: `A student has these on their GitHub:

1. A Netflix clone (React, TMDB API) — followed a 4-hour YouTube tutorial.
2. A portfolio site (HTML, CSS, JS).
3. A weather app (React, OpenWeather API).
4. A calculator (Python, Tkinter).

They feel none of these are "real" enough for a resume. They are right — as written, none of them is. But two of them can be rebuilt into something real in a weekend each.`,
            steps: [
              {
                title: 'Drop the calculator and the plain portfolio',
                desc: 'The calculator is a tutorial exercise. The portfolio is a website, not a project — its own entry can be a line in the header if needed.',
              },
              {
                title: 'Rebuild the Netflix clone into a real product',
                desc: 'Keep the front end. Add accounts, a watchlist that persists, and a "continue watching" row computed from real watch state. Deploy it. Give it a URL.',
              },
              {
                title: 'Give the weather app a reason to exist',
                desc: 'Add something the tutorial did not have: 7-day hourly data, a saved-cities list, offline caching of the last fetch. Now it is a product, not a clone.',
              },
              {
                title: 'Write each with the four elements',
                desc: 'Name + what-it-is, stack, your specific contribution, outcome. For the rebuilt clone, the outcome can be "deployed, used by N friends" — honest and specific.',
              },
            ],
            solution: `Two projects, rebuilt:

- **CineStream (React, Node, MongoDB, TMDB API)** — Movie browsing app with accounts, persistent watchlist and continue-watching; built the auth layer and the watch-state aggregation endpoint; deployed on Render, used by 25 friends.
- **WeatherLens (React, OpenWeather API)** — Multi-city weather with hourly 7-day forecasts and offline caching of last fetch; rebuilt the data layer to batch 5 city requests into 1, cutting API calls by 80%.

Same skills. Now each entry reads as something a person built and shipped, not something a person followed.`,
          },
          practice: {
            title: 'Pick and upgrade one project this week',
            prompt: `Look at your GitHub. Choose the one project that is closest to being resume-worthy but currently undersells itself. This week, add ONE thing that gives it a real user or a real number: deploy it, add persistence, add a feature a real user would want, or run it against a real dataset.

Then rewrite its resume entry with the four elements: name + what-it-is, stack, your specific contribution, outcome.`,
            hint: 'Deploying is often the highest-leverage single change. A live URL is proof it runs; a GitHub repo is only proof it compiles.',
          },
          mistakes: [
            {
              mistake: 'Listing every repo on GitHub',
              fix: 'The resume is an argument, not an archive. Two or three projects you can defend for ten minutes each beat ten tutorial clones.',
            },
            {
              mistake: 'Writing "we built" for a group project with no personal contribution named',
              fix: 'Name the team size, then use the verb for YOUR part: "Built the auth layer for a 4-member team project..."',
            },
            {
              mistake: 'Following a tutorial and calling it a project',
              fix: 'A tutorial clone is a learning exercise. Add one feature the tutorial did not have, deploy it, and it becomes a project.',
            },
          ],
          exam: {
            question: 'What are the four elements of a strong project entry on a fresher resume?',
            answer: 'Name + one-line what-it-is, the stack you actually used, your specific contribution, and the outcome (a number: users, scale, load time, accuracy). Most students omit the outcome.',
            source: 'Standard fresher resume practice',
          },
          summary: [
            'For a fresher, Projects is the experience section — it carries the resume.',
            'Choose two or three you can defend for ten minutes, not ten clones.',
            'Four elements: name + what-it-is, stack, your contribution, outcome.',
            'Group projects: name the team, then verb YOUR part.',
            'Deploying is often the highest-leverage upgrade: a live URL beats a repo.',
          ],
        }),
        [
          [
            'For a fresher, which section carries the most weight?',
            ['Education', 'Projects', 'Certifications', 'Hobbies'],
            1,
            'Projects. They are the closest thing a fresher has to employment history, and they are where the hiring decision is usually made.',
          ],
          [
            'You did a group project. How should the bullet read?',
            [
              '"We built a hostel management system"',
              '"Built the booking module (Node, MySQL) for a 4-member team project used by 150 hostel residents"',
              '"Team project — my contribution was significant"',
              '"Worked with 3 others on a management system"',
            ],
            1,
            'It names the team context but leads with YOUR specific contribution and the stack.',
          ],
          [
            'Your project has no users yet. What is the honest outcome to write?',
            [
              'Invent a user count',
              'Deploy it and use the real number, or use scope (endpoints, lines of tested code, dataset size)',
              'Leave the outcome blank',
              'Write "a production-ready application"',
            ],
            1,
            'Deploy first if you can — then the number is real. If not, scope is honest and still specific.',
          ],
        ]
      ),
      lesson(
        M3,
        'rl-3-2',
        2,
        'Education, CGPA and certifications without the filler',
        'What to include, what to cut, and how to handle a CGPA you are not thrilled about.',
        10,
        nineBlocks({
          objectives: [
            'Decide what belongs in the Education section and what to cut',
            'Handle a low or middling CGPA without hiding or apologising for it',
            'Select certifications that add signal and cut the ones that do not',
          ],
          hook: `There is a specific anxiety every fresher has about the Education section: "my CGPA is 7.1, is that going to get me filtered out?"

The honest answer is: at many companies, yes, a 7.0 is a cutoff for the first filter — and there is nothing you can write on the resume to change that. But at many others, including most startups and product companies, 7.1 is fine and what matters is what you built. The resume's job is to make sure that when a human looks, the CGPA is not the most interesting thing on the page.`,
          concept: `## What belongs in Education

Degree, college, expected graduation year, and CGPA if it helps. That is the whole section for a fresher.

- **Degree and branch:** B.Tech CSE, B.E. ECE, B.Sc. IT — exact name as your university writes it.
- **College:** the full name. Not an abbreviation a recruiter outside your state will not recognise.
- **Graduation year:** expected, e.g. "Graduating 2027". Internship season is driven by this number.
- **CGPA:** include it if 7.5 or above. Below that, it is optional — see the strategy below.

## What to cut

School name and 12th marks. After year one of college, nobody is hiring you for your 12th percentage. "Hobbies", "Extra-curricular" as their own sections. A "Declaration" paragraph ("I hereby declare that the above information is true...") — this is a form-field convention, not a resume section.

## Certifications: almost always too many

Three certifications from Coursera/Udemy that everyone also has are not differentiators. They are the resume equivalent of a skills word cloud. The exception is a certification that is genuinely hard or genuinely required — a cloud certification the JD asks for, a competitive-programming rating, a national-level exam rank. Those go on. The rest can go in a single line or off the page entirely.`,
          extras: [
            table(
              'CGPA strategies',
              ['Your CGPA', 'What to do'],
              [
                ['8.5+', 'Show it. It is a genuine signal.'],
                ['7.5 – 8.5', 'Show it. Comfortably above every reasonable cutoff.'],
                ['7.0 – 7.5', 'Optional. If the rest of the resume is strong, show it; if not, lead with projects and omit.'],
                ['Below 7.0', 'Usually omit. Compensate with strong projects, internships, or a competitive rating. Some companies will filter on it regardless — nothing on the resume changes that.'],
              ]
            ),
            tip(
              'One certification line beats five bullets',
              'If you must list certifications, one line: "AWS Cloud Practitioner (2025), HackerRank Gold (2024)". Not a five-row table.',
            ),
          ],
          worked: {
            title: 'Rebuilding the bottom third of a resume',
            problem: `A student's resume bottom half, as written:

**Education**
- SSC (10th): 92% — ABC School, 2021
- HSC (12th): 88% — ABC Junior College, 2023
- B.Tech CSE — ABC College of Engineering, 2023-2027, CGPA 7.1

**Certifications**
- Python for Everybody — Coursera
- Web Development Bootcamp — Udemy
- Java Programming — Udemy
- Introduction to AI — Coursera
- Git & GitHub — Udemy

**Extra-curricular**
- Member of college coding club
- Participated in hackathon
- Good communication skills

**Declaration**
- I hereby declare that all the above information is true to the best of my knowledge.

Five certifications, two school sections, a hobbies line, and a declaration. None of it helps. Rebuild it.`,
            steps: [
              {
                title: 'Cut school entirely',
                desc: '10th and 12th marks come off. They are three lines of noise a recruiter skips to reach your CGPA.',
              },
              {
                title: 'Handle the 7.1 honestly',
                desc: '7.1 is above many cutoffs but below some. Since the rest of the resume is thin, lead with projects and put Education near the bottom — and spend the saved space making the Projects section stronger.',
              },
              {
                title: 'Cut four of the five certifications',
                desc: 'Keep only the one with real signal. "Git & GitHub — Udemy" is not a signal; everyone has it. If AWS or a HackerRank rating exists, that stays.',
              },
              {
                title: 'Delete the declaration and the extra-curricular filler',
                desc: '"Good communication skills" is a claim with no evidence. A hackathon finish, if real, can be one line under Projects. The declaration goes.',
              },
            ],
            solution: `The rebuilt bottom third:

**Education**
B.Tech CSE, ABC College of Engineering — CGPA 7.1, graduating 2027

**Certifications**
AWS Cloud Practitioner (2025) · HackerRank Gold — Problem Solving (2024)

Four lines instead of sixteen. The space saved goes to a third project bullet. The CGPA is honest, unhidden, and not the loudest thing on the page — the Projects section is.`,
          },
          practice: {
            title: 'Cut your own bottom third',
            prompt: `Take your current resume. Delete, without mercy: school name, 10th and 12th marks, the declaration, any "hobbies" section, any "strengths" or "communication skills" line, and every certification that is a generic online course everyone has.

Count the lines you saved. That is space for one more outcome bullet in Projects, which is a better use of every one of those lines.`,
            hint: 'If a line does not help a recruiter decide to call you, it is taking space from something that does.',
          },
          mistakes: [
            {
              mistake: 'Listing 10th and 12th marks on a college resume',
              fix: 'After year one of college, they are noise. Degree, college, CGPA, year. Nothing else.',
            },
            {
              mistake: 'Listing five generic online certifications',
              fix: 'Keep only genuinely hard or JD-required ones. The rest dilute the signal of the ones that matter.',
            },
            {
              mistake: 'Writing a Declaration paragraph',
              fix: 'It is a form convention, not a resume section. Delete it. Your resume is already a set of claims you will defend in interview.',
            },
          ],
          exam: {
            question: 'Your CGPA is 7.1. What is the honest, strategic way to handle it on a fresher resume?',
            answer: 'It is a judgement call. 7.1 clears many cutoffs but not all. Do not hide it or round it up — that is caught immediately. Either show it and make the Projects section strong enough to outweigh it, or omit it and lead with projects and any real certifications. Never invent a number.',
            source: 'Campus placement screening practice',
          },
          summary: [
            'Education = degree, college, CGPA (if ≥7.5 or strategically useful), graduation year.',
            'Cut school marks, the declaration, hobbies and "communication skills".',
            'CGPA: never invent or round. Show it if it helps; omit if the rest is strong.',
            'Certifications: only genuinely hard or JD-required ones. One line, not five.',
            'Every line you cut is space for a stronger project bullet.',
          ],
        }),
        [
          [
            'What should a fresher\'s Education section contain?',
            ['School, 10th, 12th, degree, CGPA', 'Degree, college, CGPA (if helpful), graduation year', 'Degree, CGPA, hobbies, declaration', 'Everything you have ever scored'],
            1,
            'Degree, college, CGPA (if it helps), graduation year. School marks become noise after year one of college.',
          ],
          [
            'Your CGPA is 6.8. What is the correct approach?',
            [
              'Round it up to 7.0',
              'Omit it and lead with strong projects',
              'Hide it in a footnote',
              'Write "CGPA: 6.8 (out of 10, consistent performance)"',
            ],
            1,
            'Never round or inflate — it is caught in the first verification. Omit and compensate with projects, or show it honestly if the rest of the page is strong enough.',
          ],
          [
            'Which certification is most likely worth a line on a fresher resume?',
            ['Udemy Git & GitHub', 'Coursera Introduction to Python', 'AWS Cloud Practitioner, if the JD asks for cloud', 'Udemy MS Excel'],
            2,
            'A certification that is genuinely hard or explicitly requested by the JD. Generic online courses everyone has are not differentiators.',
          ],
        ]
      ),
    ],
  },
  {
    id: M4,
    course_id: 'crs-resume-linkedin',
    title: 'Module 4 — LinkedIn, and taking it live',
    summary: 'Building a LinkedIn profile that works with the resume, and the final checklist before you start applying.',
    sort_order: 4,
    lessons: [
      lesson(
        M4,
        'rl-4-1',
        1,
        'LinkedIn: the profile that gets found',
        'Headline, About, Experience and Skills on LinkedIn — how they differ from the resume, and how recruiters actually search.',
        12,
        nineBlocks({
          objectives: [
            'Write a LinkedIn headline that works as a search keyword and a pitch',
            'Write an About section that a recruiter reads past the first line',
            'Structure Experience and Skills so recruiter searches surface you',
          ],
          hook: `Recruiters do not only read resumes that arrive. They search. On LinkedIn, a recruiter searching for "react intern bangalore" is running a keyword search across headlines, about sections, experience and skills. If your profile does not contain those words in searchable places, you do not exist in that search — no matter how good your GitHub is.

Your LinkedIn is not a copy of your resume. It is a searchable version of it, with room for a voice the one-page resume does not have.`,
          concept: `## The headline is not your job title

The default LinkedIn headline is your current role at your current company — which for a student is "Student at ABC College". That is a headline that matches zero recruiter searches.

Write it as a keyword line: "CSE Undergrad | SDE Intern aspirant | React, Node, Python | DSA". Each pipe-separated chunk is a term someone might search. "Aspirant" is honest; it does not claim an internship you do not have.

## About: first two lines do the work

LinkedIn truncates the About section after about two lines in the feed. The first two lines must stand alone. Start with what you are and what you want, not with a philosophical opener.

Then: what you have built, what you are learning, what you are looking for. First person. Three short paragraphs, not a wall.

## Experience and Skills are search fields

Experience on LinkedIn is structured data a search runs over. Put your internships, significant projects and positions of responsibility here — even unpaid, even short. Each needs a description with the same outcome-led bullets as the resume.

Skills: the first three are what recruiters see without clicking. Put your three strongest there. LinkedIn lets you take skill assessments; a passed badge is a small but real signal.`,
          extras: [
            table(
              'Resume vs LinkedIn',
              ['Element', 'Resume', 'LinkedIn'],
              [
                ['Length', 'One page', 'As long as it is useful'],
                ['Voice', 'Formal, terse', 'First person, slightly warmer'],
                ['Headline', 'Target role', 'Keyword line a search can match'],
                ['Projects', 'Bullets', 'Experience entries + Featured links'],
                ['Numbers', 'Same discipline', 'Same discipline'],
              ]
            ),
            tip(
              'Featured: pin your best work',
              'LinkedIn\'s Featured section lets you pin links. Pin your best deployed project, your GitHub profile, and your best write-up. This is the section a curious recruiter clicks.',
            ),
          ],
          worked: {
            title: 'Rebuilding a default student profile',
            problem: `Rahul's LinkedIn, as it stands:

- Headline: "Student at ABC College of Engineering"
- About: "I am a hard working and motivated student looking for opportunities in a good company where I can utilize my skills."
- Experience: one entry, "Student" at his college, with no description.
- Skills: Java, Python, C++, HTML, CSS, MS Office (no order, no evidence)
- No Featured links. No projects. GitHub link in the contact info only.

A recruiter searching "react intern" will not find this profile. Fix it.`,
            steps: [
              {
                title: 'Rewrite the headline as a keyword line',
                desc: '"CSE Undergrad | SDE Intern (Summer 2026) | React, Node, Python | DSA". Every chunk is something a search can match.',
              },
              {
                title: 'Write an About that opens strong',
                desc: 'First two lines: what you are and what you want. Then two short paragraphs: what you have built, what you are looking for.',
              },
              {
                title: 'Turn projects into Experience entries',
                desc: 'LinkedIn lets you add a project as an experience entry with a company of "Personal Project". Use it. Same outcome bullets as the resume.',
              },
              {
                title: 'Order the skills and take the assessments',
                desc: 'First three skills = React, JavaScript, Node. Take the assessments you can pass. Remove MS Office.',
              },
              {
                title: 'Pin the best work in Featured',
                desc: 'Pin the deployed department site and the GitHub profile. Two links, both live.',
              },
            ],
            solution: `The rebuilt profile:

**Headline:** CSE Undergrad | SDE Intern — Summer 2026 | React, Node, Python | DSA

**About:** "Second-year CSE student building full-stack projects in React and Node, looking for a Summer 2026 SDE internship.

Recently rebuilt my college department site (used by 300+ students) and cut its load time from 4s to 1s with route-level code-splitting. Currently deepening DSA and system-design fundamentals.

Open to SDE and frontend internships, remote or Bangalore."

**Experience:**
- Dept Site Rebuild (Personal Project) — React, Node, MySQL. Cut load 4s → 1s, 300+ students.
- CineStream (Personal Project) — auth, watchlist, continue-watching. Deployed, 25 users.

**Skills:** React (top), JavaScript, Node.js, Python, C++, MySQL, Git

**Featured:** department site live URL · GitHub profile

Same person. Now a recruiter searching "react intern" has a reason to click.`,
          },
          practice: {
            title: 'Rebuild your own profile in 30 minutes',
            prompt: `Open your LinkedIn. Set a 30-minute timer and work through these in order:

1. Headline — write the keyword line. Target role, top three skills, one honest status word.
2. About — first two lines are what-you-are and what-you-want. Then two short paragraphs.
3. Experience — add your best project as a Personal Project entry with outcome bullets.
4. Skills — reorder so your three strongest are first. Take any assessment you can pass.
5. Featured — pin your best live project and your GitHub.

Screenshot the before. Compare after.`,
            hint: 'The headline change alone will change how often you appear in recruiter searches. Do that first if you do nothing else.',
          },
          mistakes: [
            {
              mistake: 'Leaving the default "Student at college" headline',
              fix: 'It matches zero recruiter searches. Write a keyword line: role, skills, honest status.',
            },
            {
              mistake: 'An About that starts with "I am a hard working and motivated student"',
              fix: 'Every profile says this. Open with what you are and what you want, then what you have built.',
            },
            {
              mistake: 'No projects on LinkedIn at all',
              fix: 'Add them as Personal Project experience entries. LinkedIn searches that field; your GitHub link alone is not enough.',
            },
          ],
          exam: {
            question: 'A recruiter searches LinkedIn for "react intern bangalore". Which profile is most likely to surface, and why?',
            answer: 'The one whose headline, About and Experience all contain those keywords in searchable text. "Student at college" matches nothing. A headline like "CSE Undergrad | React, Node | SDE Intern aspirant" with a Bangalore-located Experience entry matches all three terms.',
            source: 'LinkedIn recruiter search behaviour',
          },
          summary: [
            'LinkedIn is a searchable resume — recruiters run keyword searches over it.',
            'Headline is a keyword line, not your current job title. Default "Student at X" matches nothing.',
            'About: first two lines do the work — what you are, what you want. Then what you have built.',
            'Projects go in Experience as Personal Project entries with outcome bullets.',
            'Top three skills are what recruiters see first. Featured pins your best live work.',
          ],
        }),
        [
          [
            'What should the default LinkedIn headline "Student at college" become?',
            ['Exactly that — it is honest', 'A keyword line: role, top skills, honest status', 'Your full resume summary', 'Your CGPA and branch'],
            1,
            'The default matches zero recruiter searches. A keyword line is honest AND findable.',
          ],
          [
            'Where should your best projects live on LinkedIn?',
            ['Only in the Featured links', 'As Personal Project entries in Experience, plus Featured links', 'In a post you pin', 'Nowhere — LinkedIn is for jobs only'],
            1,
            'Experience is a structured search field. Featured is what a curious recruiter clicks. Use both.',
          ],
          [
            'How much of the About section does LinkedIn show before truncating in the feed?',
            ['The whole thing', 'About two lines', 'One sentence', 'It never truncates'],
            1,
            'About two lines. Those two lines must stand alone — start with what you are and what you want.',
          ],
        ]
      ),
      lesson(
        M4,
        'rl-4-2',
        2,
        'The pre-application checklist',
        'The final pass before you hit apply: what to verify, what to tailor, and how to track applications without losing your mind.',
        10,
        nineBlocks({
          objectives: [
            'Run a complete pre-application check on resume and profile',
            'Tailor an application to a specific job description in under 15 minutes',
            'Set up a simple tracking sheet that survives a full application season',
          ],
          hook: `The most common application failure is not a bad resume. It is a good resume, sent badly: wrong file name, a stale LinkedIn URL, a cover letter addressed to the wrong company, or a application for a role that closed three weeks ago.

The checklist in this lesson takes fifteen minutes. It has saved more offers than any single bullet rewrite.`,
          concept: `## The file and the naming

Name the file \`Rahul-Sharma-Resume-SDE.pdf\`. Not \`resume_final_v3.pdf\`. Not \`Resume (1).pdf\`. The recruiter downloads forty of these; a named file is findable in their folder a week later.

Always PDF unless the portal explicitly asks for .docx. PDF preserves layout. Check that the PDF's text is selectable (Ctrl+A should highlight text) — a scanned-image PDF is invisible to ATS.

## The links

Click every link in the resume and on LinkedIn, in an incognito window. The GitHub should not 404. The deployed project should not be down. A dead link on a resume is worse than no link — it is a broken promise in the first minute.

LinkedIn URL: claim a clean one. \`linkedin.com/in/rahul-sharma-cse\` not \`linkedin.com/in/rahul-sharma-8a3b2c9\`. You can set this once in settings.

## The tailoring pass (15 minutes)

1. Re-read the JD. Underline the three skills it repeats.
2. Make sure those three appear in your resume — in a bullet, not just the skills list.
3. If the role names a city or mode (remote/hybrid/onsite), and your resume or LinkedIn says nothing, add your city to the header. Recruiters filter on it.
4. If there is a named recruiter or a referral, use their name in the opening line of any note you send.

## Tracking

A spreadsheet. Columns: company, role, date applied, link, status (applied / screening / interview / offer / rejected / ghosted), next action, next action date. Update it the day you apply, and the day anything changes. At the end of a season, this sheet is the only thing that tells you which of your channels actually work.`,
          extras: [
            table(
              'Pre-application checklist',
              ['Check', 'Why it matters'],
              [
                ['File named "Name-Resume-Role.pdf"', 'Recruiters download dozens; findable later'],
                ['PDF text is selectable', 'Image PDFs are invisible to ATS'],
                ['Every link clicked in incognito', 'A dead GitHub link is a broken promise'],
                ['LinkedIn URL is clean', 'It goes on the resume; make it memorable'],
                ['Three JD skills present in bullets', 'Not just in the skills list'],
                ['City present if the role is location-specific', 'Recruiters filter on it'],
                ['Resume tailored, not generic', 'Tailored resumes get more callbacks'],
              ]
            ),
            tip(
              'Apply within the first 48 hours of a posting',
              'Many roles are reviewed on a rolling basis and closed once filled. Applying early is a real, free advantage that has nothing to do with your resume quality.',
            ),
          ],
          worked: {
            title: 'A real tailoring pass, start to finish',
            problem: `Rahul finds a posting: "Frontend Engineering Intern — Summer 2026, Bangalore (hybrid). Must have: React, TypeScript, CSS. Nice to have: testing, Next.js. Send resume to careers@company.com with subject 'FE Intern - YourName'."

He has a generic resume with all his projects, all his skills, and no city. He has 15 minutes. Do the pass.`,
            steps: [
              {
                title: 'Rename and re-export the file',
                desc: 'File becomes "Rahul-Sharma-Resume-FE-Intern.pdf". Quick check: open it, Ctrl+A — text selects cleanly.',
              },
              {
                title: 'Surface React, TypeScript, CSS in the first two bullets',
                desc: 'Reorder the Projects section so the React-heavy project is first. If TypeScript appears anywhere real, add it to that bullet. If he has never used TypeScript, do not fake it — lean on React and CSS.',
              },
              {
                title: 'Add Bangalore to the header',
                desc: 'The role is hybrid in Bangalore. "Bangalore" in the header line of the resume and in the LinkedIn location stops the recruiter guessing.',
              },
              {
                title: 'Use the exact subject line',
                desc: '"FE Intern - Rahul Sharma". Follow the instruction precisely — it is a small test of whether you read the posting.',
              },
              {
                title: 'Log it in the sheet',
                desc: 'Company, role, date, link, status=applied, next action = follow up in 10 days if no reply.',
              },
            ],
            solution: `The sent application:

**To:** careers@company.com
**Subject:** FE Intern - Rahul Sharma

Attached: Rahul-Sharma-Resume-FE-Intern.pdf — first two bullets now lead with the React project, header includes Bangalore.

LinkedIn updated to "Bangalore" and the headline already carries React. Tracking sheet row added: company, role, date, applied, follow-up in 10 days.

Fifteen minutes. Every one of them worth more than a twentieth generic application.`,
          },
          practice: {
            title: 'Run the full checklist on one real application',
            prompt: `Find one real, current job posting you could apply for today. Run the entire pre-application checklist: rename the file, verify the PDF text selects, click every link in incognito, check the LinkedIn URL is clean, confirm the three JD skills appear in your bullets, add your city if the role is location-specific.

Then apply, and add the row to a tracking spreadsheet. That spreadsheet is the deliverable of this lesson as much as the application.`,
            hint: 'Set up the spreadsheet even if you only have one application in it. A season of applications without tracking is a season you cannot learn from.',
          },
          mistakes: [
            {
              mistake: 'Sending "resume_final_v3.pdf"',
              fix: 'Name it "YourName-Resume-Role.pdf". A named file is findable in a recruiter\'s downloads folder a week later.',
            },
            {
              mistake: 'Not clicking your own links before sending',
              fix: 'A dead GitHub or a down deployment in the first minute is worse than not having the link. Check in incognito.',
            },
            {
              mistake: 'Applying to 40 roles with one identical resume',
              fix: 'Fifteen minutes of tailoring per application beats volume. And track every one, or you cannot tell what is working.',
            },
          ],
          exam: {
            question: 'Name three things from the pre-application checklist that take under five minutes each and meaningfully improve callback rates.',
            answer: 'Any three: name the file "Name-Resume-Role.pdf"; verify the PDF text is selectable; click every link in incognito; claim a clean LinkedIn URL; confirm the three JD skills appear in bullets (not just the skills list); add your city for location-specific roles; use the exact subject line requested.',
            source: 'Recruiter screening practice',
          },
          summary: [
            'File: "Name-Resume-Role.pdf". PDF, text selectable.',
            'Click every link in incognito before you send. Dead links are broken promises.',
            'Clean LinkedIn URL — you can set it once in settings.',
            'Tailor in 15 minutes: three JD skills in bullets, city if location-specific, exact subject line.',
            'Track every application in a spreadsheet. At season\'s end it is the only thing that tells you what works.',
          ],
        }),
        [
          [
            'How should a resume file be named for a SDE internship application?',
            ['resume.pdf', 'resume_final_v3.pdf', 'Rahul-Sharma-Resume-SDE.pdf', 'Resume (1).pdf'],
            2,
            'Name-Resume-Role. Recruiters download dozens; a named file is findable later.',
          ],
          [
            'Before sending, you should click every link on your resume:',
            ['Only the GitHub', 'In an incognito window, to confirm nothing is behind your own login', 'Only if the recruiter asked', 'Not necessary if they worked last week'],
            1,
            'Incognito confirms the link works for a stranger, not just for you logged in. A dead deployment is worse than no link.',
          ],
          [
            'What is the correct use of a tracking spreadsheet during an application season?',
            [
              'Log applications after you get a response',
              'Log the day you apply and the day anything changes; review at season end for what works',
              'Only log interviews',
              'It is optional if you apply to fewer than 10 roles',
            ],
            1,
            'Update on apply and on every change. At season end it is the only honest picture of which channels produce results.',
          ],
        ]
      ),
    ],
  },
];

// ---------------------------------------------------------------------------
// Final-exam bank — 30 questions, mixed difficulty, tagged by module topic.
// The engine draws from this bank per attempt; answers are stripped by
// sanitizeCourse before any student response.
// ---------------------------------------------------------------------------

const examBank: ExamQuestion[] = [
  // --- Module 1: resume structure + ATS ---
  {
    id: 'rl-exam-1',
    prompt: 'A recruiter at a campus drive has 200 resumes for 40 seats. Roughly how long is the first skim of each resume?',
    options: ['About 30 seconds', 'About six seconds', 'About two minutes', 'About 15 seconds'],
    correct_index: 1,
    explanation: 'Eye-tracking studies of recruiter behaviour put the first pass at around six seconds — a filter, not a read.',
    difficulty: 'easy',
    topic: 'Resume structure',
  },
  {
    id: 'rl-exam-2',
    prompt: 'Which four sections are the "bones" every effective resume has?',
    options: [
      'Summary, skills, hobbies, education',
      'Header, target line, experience, education',
      'Photo, declaration, skills, education',
      'Objective, extra-curricular, skills, education',
    ],
    correct_index: 1,
    explanation: 'Header, target line, experience, education. The rest is optional dressing; these four carry the resume.',
    difficulty: 'easy',
    topic: 'Resume structure',
  },
  {
    id: 'rl-exam-3',
    prompt: 'Why does a two-column resume often fail in an applicant tracking system?',
    options: [
      'It exceeds the page limit',
      'Most parsers read linearly, so the sidebar vanishes or interleaves with experience text',
      'Two columns trigger a spam filter',
      'It cannot be saved as PDF',
    ],
    correct_index: 1,
    explanation: 'ATS parsers typically read left-to-right, top-to-bottom. Sidebars and text boxes either disappear or get mixed into the main flow.',
    difficulty: 'medium',
    topic: 'ATS',
  },
  {
    id: 'rl-exam-4',
    prompt: 'Where should contact details go for maximum ATS compatibility?',
    options: ['In the header', 'In the body, as the first labelled lines', 'In the footer', 'On a separate contact page'],
    correct_index: 1,
    explanation: 'Headers and footers are frequently skipped by parsers. The body, labelled in plain text, is always read.',
    difficulty: 'easy',
    topic: 'ATS',
  },
  {
    id: 'rl-exam-5',
    prompt: 'An ATS primarily scores a resume against a job description based on:',
    options: [
      'Visual design quality',
      'Keyword overlap with the description',
      'Total length',
      'Number of certifications',
    ],
    correct_index: 1,
    explanation: 'Keyword overlap drives the match score that decides whether a recruiter ever sees the resume.',
    difficulty: 'easy',
    topic: 'ATS',
  },
  {
    id: 'rl-exam-6',
    prompt: 'Which section title would an ATS most likely fail to classify as work history?',
    options: ['Experience', 'Work History', 'My Learning Journey', 'Employment'],
    correct_index: 2,
    explanation: 'Parsers match on standard headings. A creative title like "My Learning Journey" matches nothing.',
    difficulty: 'easy',
    topic: 'ATS',
  },
  // --- Module 2: bullets + verbs ---
  {
    id: 'rl-exam-7',
    prompt: 'What are the three parts of a strong resume bullet?',
    options: ['Action, task, result', 'Action, adjective, result', 'Duty, task, responsibility', 'Task, tool, adjective'],
    correct_index: 0,
    explanation: 'Action → task → result. The result is what recruiters quote in hiring meetings, and what most students omit.',
    difficulty: 'easy',
    topic: 'Bullets',
  },
  {
    id: 'rl-exam-8',
    prompt: 'Which is the strongest rewrite of "Worked on the login module"?',
    options: [
      'Responsible for various aspects of authentication',
      'Added password reset, cutting locked-account support tickets by ~30%',
      'Worked collaboratively on login',
      'Involved in authentication development',
    ],
    correct_index: 1,
    explanation: 'It has a verb, a specific task, and a number. The others are all duty-style.',
    difficulty: 'easy',
    topic: 'Bullets',
  },
  {
    id: 'rl-exam-9',
    prompt: 'You built a project nobody used. What is the honest way to write the bullet?',
    options: [
      'Invent a user number to sound bigger',
      'Use scope: endpoints, lines of tested code, dataset size',
      'Leave the project off the resume',
      'Write "a robust and scalable application"',
    ],
    correct_index: 1,
    explanation: 'Scope is honest and specific. Inflated numbers are caught in interviews; adjectives convince nobody.',
    difficulty: 'medium',
    topic: 'Bullets',
  },
  {
    id: 'rl-exam-10',
    prompt: 'Which verb is most honest and informative for a fresher?',
    options: ['Spearheaded', 'Orchestrated', 'Migrated', 'Leveraged'],
    correct_index: 2,
    explanation: '"Migrated" (and built/cut/fixed) are true at intern level and carry real information. Spearheaded and orchestrated imply leadership you may not have had.',
    difficulty: 'medium',
    topic: 'Verbs',
  },
  {
    id: 'rl-exam-11',
    prompt: 'A JD asks for React, TypeScript and testing. You know React well, TypeScript a little, testing not at all. What is correct?',
    options: [
      'List all three to pass the ATS',
      'List React with evidence; omit TypeScript and testing',
      'List React and TypeScript; omit testing',
      'List all three and explain in the cover letter',
    ],
    correct_index: 1,
    explanation: 'List only what you can defend in an interview. Half-truths get past the filter and destroyed in the technical round.',
    difficulty: 'medium',
    topic: 'Tailoring',
  },
  {
    id: 'rl-exam-12',
    prompt: 'What is keyword-stuffing, and why does it backfire?',
    options: [
      'Listing too many skills — it makes the resume too long',
      'Adding JD keywords you do not have — it passes the filter then fails the interview',
      'Using the same verb repeatedly',
      'Putting skills in the header',
    ],
    correct_index: 1,
    explanation: 'It is faking JD keywords. It works once, then the technical round ends the application.',
    difficulty: 'medium',
    topic: 'Tailoring',
  },
  // --- Module 3: projects + education ---
  {
    id: 'rl-exam-13',
    prompt: 'For a fresher, which section carries the most weight?',
    options: ['Education', 'Projects', 'Certifications', 'Hobbies'],
    correct_index: 1,
    explanation: 'Projects are the closest thing a fresher has to employment history, and they are where the decision is usually made.',
    difficulty: 'easy',
    topic: 'Projects',
  },
  {
    id: 'rl-exam-14',
    prompt: 'What are the four elements of a strong project entry?',
    options: [
      'Name, stack, your contribution, outcome',
      'Name, screenshot, link, date',
      'Title, team size, duration, rating',
      'Repo URL, commit count, stars, forks',
    ],
    correct_index: 0,
    explanation: 'Name + what-it-is, the stack, YOUR specific contribution, and the outcome (a number). Most students omit the outcome.',
    difficulty: 'easy',
    topic: 'Projects',
  },
  {
    id: 'rl-exam-15',
    prompt: 'Your group project has four members. How should the bullet read?',
    options: [
      '"We built a hostel management system"',
      '"Built the booking module (Node, MySQL) for a 4-member team project used by 150 hostel residents"',
      '"Team project — my contribution was significant"',
      '"Worked with 3 others on a management system"',
    ],
    correct_index: 1,
    explanation: 'Name the team context, then verb YOUR specific part with the stack and an outcome.',
    difficulty: 'medium',
    topic: 'Projects',
  },
  {
    id: 'rl-exam-16',
    prompt: 'Your CGPA is 6.8. What is the correct approach on a fresher resume?',
    options: [
      'Round it up to 7.0',
      'Omit it and lead with strong projects',
      'Hide it in a footnote',
      'Write "6.8 (consistent performance)"',
    ],
    correct_index: 1,
    explanation: 'Never round or inflate — it is caught in verification. Omit and compensate with projects, or show it honestly if the page is strong enough.',
    difficulty: 'medium',
    topic: 'Education',
  },
  {
    id: 'rl-exam-17',
    prompt: 'What should a fresher\'s Education section contain?',
    options: [
      'School, 10th, 12th, degree, CGPA',
      'Degree, college, CGPA (if helpful), graduation year',
      'Degree, CGPA, hobbies, declaration',
      'Everything you have ever scored',
    ],
    correct_index: 1,
    explanation: 'Degree, college, CGPA (if it helps), graduation year. School marks are noise after year one of college.',
    difficulty: 'easy',
    topic: 'Education',
  },
  {
    id: 'rl-exam-18',
    prompt: 'Which certification is most likely worth a line on a fresher resume?',
    options: [
      'Udemy Git & GitHub',
      'Coursera Introduction to Python',
      'AWS Cloud Practitioner, if the JD asks for cloud',
      'Udemy MS Excel',
    ],
    correct_index: 2,
    explanation: 'A genuinely hard or JD-required certification. Generic courses everyone has are not differentiators.',
    difficulty: 'easy',
    topic: 'Certifications',
  },
  // --- Module 4: LinkedIn + application process ---
  {
    id: 'rl-exam-19',
    prompt: 'What should the default LinkedIn headline "Student at college" become?',
    options: [
      'Exactly that — it is honest',
      'A keyword line: role, top skills, honest status',
      'Your full resume summary',
      'Your CGPA and branch',
    ],
    correct_index: 1,
    explanation: 'The default matches zero recruiter searches. A keyword line is honest AND findable.',
    difficulty: 'easy',
    topic: 'LinkedIn',
  },
  {
    id: 'rl-exam-20',
    prompt: 'Where should your best projects live on LinkedIn?',
    options: [
      'Only in Featured links',
      'As Personal Project entries in Experience, plus Featured links',
      'In a pinned post',
      'Nowhere — LinkedIn is for jobs only',
    ],
    correct_index: 1,
    explanation: 'Experience is a structured search field; Featured is what a curious recruiter clicks. Use both.',
    difficulty: 'medium',
    topic: 'LinkedIn',
  },
  {
    id: 'rl-exam-21',
    prompt: 'How much of the LinkedIn About section shows before truncating in the feed?',
    options: ['The whole thing', 'About two lines', 'One sentence', 'It never truncates'],
    correct_index: 1,
    explanation: 'About two lines. Those two lines must stand alone — what you are, what you want.',
    difficulty: 'easy',
    topic: 'LinkedIn',
  },
  {
    id: 'rl-exam-22',
    prompt: 'How should a resume file be named for a SDE internship application?',
    options: ['resume.pdf', 'resume_final_v3.pdf', 'Rahul-Sharma-Resume-SDE.pdf', 'Resume (1).pdf'],
    correct_index: 2,
    explanation: 'Name-Resume-Role. Recruiters download dozens; a named file is findable later.',
    difficulty: 'easy',
    topic: 'Application process',
  },
  {
    id: 'rl-exam-23',
    prompt: 'Before sending, links on your resume should be checked:',
    options: [
      'Only the GitHub',
      'In an incognito window, confirming nothing sits behind your own login',
      'Only if the recruiter asked',
      'Not necessary if they worked last week',
    ],
    correct_index: 1,
    explanation: 'Incognito confirms it works for a stranger. A dead deployment is worse than no link.',
    difficulty: 'medium',
    topic: 'Application process',
  },
  {
    id: 'rl-exam-24',
    prompt: 'What is the correct use of a tracking spreadsheet during an application season?',
    options: [
      'Log applications after you get a response',
      'Log the day you apply and the day anything changes; review at season end',
      'Only log interviews',
      'Optional if you apply to fewer than 10 roles',
    ],
    correct_index: 1,
    explanation: 'Update on apply and on every change. At season end it is the only honest picture of what works.',
    difficulty: 'easy',
    topic: 'Application process',
  },
  // --- Mixed / applied ---
  {
    id: 'rl-exam-25',
    prompt: 'A resume is submitted through a portal and marked "unable to parse". Most likely cause?',
    options: [
      'The file was a PDF',
      'A layout the parser cannot read linearly — two columns or header contact details',
      'The resume was too short',
      'The applicant had no experience',
    ],
    correct_index: 1,
    explanation: 'Non-linear layouts (columns, text boxes, header contact) are the classic parsing failure.',
    difficulty: 'medium',
    topic: 'ATS',
  },
  {
    id: 'rl-exam-26',
    prompt: 'Your best project has 300 users but no "impact" metric like revenue. What is the strongest honest outcome to write?',
    options: [
      '"A successful project with many users"',
      '"Used by 300+ students; load time cut 4s to 1s"',
      '"A scalable and robust full-stack application"',
      '"Won second prize at the college hackathon"',
    ],
    correct_index: 1,
    explanation: 'Scale (300+ users) and a measurable change (4s → 1s) are both real numbers. Adjectives are claims; these are evidence.',
    difficulty: 'medium',
    topic: 'Bullets',
  },
  {
    id: 'rl-exam-27',
    prompt: 'Which LinkedIn change will most immediately change how often you appear in recruiter searches?',
    options: [
      'Adding a profile photo',
      'Rewriting the headline as a keyword line',
      'Endorsing 50 skills',
      'Posting weekly content',
    ],
    correct_index: 1,
    explanation: 'The headline is a primary search field. "Student at college" matches nothing; a keyword line matches real queries.',
    difficulty: 'medium',
    topic: 'LinkedIn',
  },
  {
    id: 'rl-exam-28',
    prompt: 'You followed a 4-hour tutorial and cloned Netflix. Can it go on your resume as-is?',
    options: [
      'Yes, a clone shows you can follow instructions',
      'Only if you add stars to the repo',
      'No — add a feature the tutorial did not have, deploy it, then it becomes a project',
      'No, tutorial clones are never allowed',
    ],
    correct_index: 2,
    explanation: 'As-is it is a learning exercise. One original feature plus a deployment makes it a project you can defend.',
    difficulty: 'medium',
    topic: 'Projects',
  },
  {
    id: 'rl-exam-29',
    prompt: 'When is the best time to apply to a freshly posted role?',
    options: [
      'After 30 days, when it is proven serious',
      'Within the first 48 hours, before the shortlist forms',
      'Whenever you are free',
      'After someone you know refers you',
    ],
    correct_index: 1,
    explanation: 'Many roles are reviewed rolling and closed once filled. Applying early is a free, real advantage.',
    difficulty: 'easy',
    topic: 'Application process',
  },
  {
    id: 'rl-exam-30',
    prompt: 'A recruiter searches "react intern bangalore". Which profile surfaces, and why?',
    options: [
      'The one with the most endorsements',
      'The one whose headline, About and Experience all contain those keywords in searchable text',
      'The one with the best photo',
      'The one with the longest About section',
    ],
    correct_index: 1,
    explanation: 'LinkedIn search runs over structured and text fields. Keywords in headline, About and Experience are what match.',
    difficulty: 'hard',
    topic: 'LinkedIn',
  },
];

export function getResumeLinkedinCourse(): Course {
  return {
    id: 'crs-resume-linkedin',
    slug: 'resume-linkedin-building',
    title: 'Resume + LinkedIn Building',
    subtitle: 'The fastest first certificate — build a resume that survives the six-second skim and a LinkedIn recruiters can find',
    description: `You do not need more projects to get an interview. You need the projects you already have to survive a six-second skim and a keyword search.

This is the shortest course on TieEdu on purpose. Four modules, eight lessons, two hours. It takes a resume that lists duties and turns it into one that leads with outcomes; it makes that resume readable by the applicant tracking systems that filter most online applications; and it rebuilds your LinkedIn so a recruiter searching "react intern" actually finds you.

By the end you will have a one-page resume you can defend line by line, a LinkedIn profile that is a searchable version of it, and a tracking sheet so your application season is a process instead of a hope.

**Who this is for:** any student, any branch, any year — who has applied to something and heard nothing back, or who has never applied because the resume felt unfinished.

**What you need:** your existing projects, even the tutorial ones. We will rebuild two of them into resume material.`,
    category: 'Career',
    level: 'beginner',
    is_free: true,
    price_inr: 0,
    thumbnail_url: '',
    thumbnail_alt: 'Resume and LinkedIn course cover',
    tags: ['resume', 'linkedin', 'placement', 'career', 'interview', 'fresher', 'micro-course'],
    outcomes: [
      'Restructure a resume to pass the six-second recruiter skim',
      'Write a resume an applicant tracking system can parse and score',
      'Turn duty-style bullets into outcome-led bullets with real numbers',
      'Select and present two or three projects as experience, not an archive',
      'Handle education, CGPA and certifications without filler',
      'Rebuild a LinkedIn profile as a searchable version of the resume',
      'Run a 15-minute tailoring pass and track every application',
    ],
    prerequisite_course_id: null,
    certificate_eligible: true,
    published: true,
    created_at: '2026-10-12T09:00:00.000Z',
    updated_at: '2026-10-12T09:00:00.000Z',
    instructor_id: null,
    about_course: `This course is built around one idea: a resume is not a document you write for yourself. It is a document written for a six-second skim and, before that, for a machine that does not care about your typeface.

Every lesson follows the same nine steps — an objective, a hook, the concept, a worked example, a practice task, the common mistakes, the exam or interview angle, a quiz, and a summary. The worked examples are real resumes, rewritten line by line. The practice tasks are things you do to your own resume in the next ten minutes, not homework for later.

The final module covers LinkedIn, because for most students the resume is finished and the profile is still the default "Student at college" headline that matches zero recruiter searches. And it closes with the pre-application checklist — the fifteen minutes that save more offers than any single bullet rewrite.`,
    prerequisites: [
      'Any existing resume, even a rough one',
      'At least one project, however small',
      'A LinkedIn account (or willingness to make one)',
    ],
    audience: [
      'First- and second-year students preparing for internships',
      'Final-year students who have applied and heard nothing back',
      'Any branch, any year — this course is not technical',
      'Anyone whose LinkedIn still says "Student at college"',
    ],
    audio_language: 'English',
    caption_language: 'English',
    // Bucket E micro-course, all branches. Foundation tier: it is the first
    // certificate a learner can earn, and it is deliberately not gated on any
    // other course.
    branch: 'career',
    branch_label: 'All branches · Career',
    bucket: 'E',
    certificate_tier: 'foundation',
    estimated_hours: 2,
    // The fastest first-certificate hook: this is the entry point the free
    // funnel is built around.
    perks: [
      { key: 'certificate', label: 'Verifiable certificate' },
      { key: 'xp', label: 'XP on the leaderboard' },
    ],
    // The one-night-revision payload, so Semester Exam Mode has something real
    // to render for placement season.
    exam_prep: {
      target: 'Placement prep — resume and LinkedIn, all branches',
      units: [
        {
          title: 'Resume structure & the skim',
          summary:
            'Recruiters skim in ~6 seconds. Four bones: header, target line, experience, education. One page for a fresher. Target line names the role, not "seeking opportunities".',
          questions: [
            'What are the four sections every resume needs?',
            'Why does a fresher keep the resume to one page?',
            'What does the target line say, and what does it never say?',
          ],
          pyqs: [],
        },
        {
          title: 'ATS parsing',
          summary:
            'Most large companies parse your resume before a human. Killers: two columns, header contact, icons, creative section names. Fix: single column, plain-text contact, standard headings. Run the Notepad paste test.',
          questions: [
            'Why does a two-column resume fail ATS parsing?',
            'Where do contact details go for maximum compatibility?',
            'What does an ATS primarily score on?',
          ],
          pyqs: [],
        },
        {
          title: 'Bullets: action → task → result',
          summary:
            'Strong bullets end in a result. "Responsible for X" is a job description. Find your number: time saved, scale, errors cut. No number? Use scope. Use I, not we, for your part.',
          questions: [
            'What are the three parts of a strong bullet?',
            'Rewrite "Worked on the login module" as an outcome bullet.',
            'How do you write a project nobody used?',
          ],
          pyqs: [],
        },
        {
          title: 'Projects as experience',
          summary:
            'For a fresher, Projects IS the experience section. Choose 2-3 you can defend for 10 minutes. Four elements: name+what, stack, your contribution, outcome. Group projects: name the team, verb YOUR part. Deploy it.',
          questions: [
            'What are the four elements of a project entry?',
            'How do you present a group project without hiding your part?',
            'What is the highest-leverage single upgrade to a GitHub project?',
          ],
          pyqs: [],
        },
        {
          title: 'Education & certifications',
          summary:
            'Education = degree, college, CGPA (if helpful), graduation year. Cut school marks, declaration, hobbies. CGPA: never inflate; omit if weak and lead with projects. Certs: only hard or JD-required ones.',
          questions: [
            'What belongs in a fresher Education section?',
            'How do you handle a 6.8 CGPA honestly?',
            'Which certifications are worth a line?',
          ],
          pyqs: [],
        },
        {
          title: 'LinkedIn & applying',
          summary:
            'LinkedIn is a searchable resume. Headline is a keyword line, not "Student at college". About: first two lines carry it. Projects go in Experience. Pre-application checklist: named PDF, live links in incognito, 15-min tailoring, tracking sheet.',
          questions: [
            'What should the default LinkedIn headline become?',
            'Where do projects live on LinkedIn?',
            'What is the 15-minute tailoring pass?',
          ],
          pyqs: [],
        },
      ],
      important_questions: [
        'Walk me through your resume in 60 seconds as if I am the recruiter.',
        'Pick your strongest project bullet and defend every word of it.',
        'How would you rewrite "Responsible for the backend of the dashboard"?',
        'Your CGPA is 7.1. How do you handle it, and why?',
        'What does an ATS do to your resume before a human sees it?',
        'Why is your LinkedIn headline not "Student at ABC College"?',
      ],
      previous_year_questions: [
        {
          year: '2024',
          question: 'Tell me about a time you improved something measurably. Use a resume bullet structure.',
          solution: 'Action → task → result. Name the number. E.g. "Cut the report generation from 3 hours of manual Excel to a 15-minute automated script, used weekly by the team."',
        },
        {
          year: '2024',
          question: 'Why should we hire you over another fresher with the same CGPA?',
          solution: 'Do not restate the CGPA. Lead with one outcome-led project bullet the other candidate cannot match — a real number, a real user, a real deployment.',
        },
        {
          year: '2025',
          question: 'What is the one change you would make to your resume right now, and why?',
          solution: 'Name a real, specific improvement you already know you need (e.g. "my third bullet still starts with Responsible for"). Self-awareness plus the fix.',
        },
      ],
    },
    // A final-exam bank of 30 mixed-difficulty questions, tagged by topic. The
    // engine draws from it per attempt; answers never leave the server pre-submit.
    exam: {
      question_count: 15,
      duration_minutes: 25,
      passing_percent: 60,
      retake_cooldown_hours: 24,
      distinction_percent: 85,
      bank: examBank,
    },
    // Capstone: rebuild one real resume and one real LinkedIn profile. Required
    // for the certificate, because the course's whole claim is that you finish
    // with artefacts, not notes.
    project: {
      title: 'Ship your resume and rebuild your LinkedIn',
      brief:
        'Produce two artefacts: (1) a one-page PDF resume, ATS-safe, every bullet outcome-led with at least one real number, named YourName-Resume-Role.pdf; (2) a rebuilt LinkedIn profile with a keyword headline, a two-line-strong About, at least one project as a Personal Project Experience entry, and your top three skills ordered. Submit links to both.',
      submission_hint: 'Link to the PDF (or a public drive link) and your LinkedIn profile URL.',
      required_for_certificate: true,
    },
    modules,
  };
}
