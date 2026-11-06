/**
 * Story-page content for the Feed v3 drops (owner request, 2026-11-06: "a
 * good page should open where we can read, then send us to the website").
 *
 * Keyed by the seeded drop id (`drop-v3-NN`, NN = position in FEED_V3). Every
 * figure comes from companyProfiles2026.ts, lib/festival.ts or the course
 * catalogue; where a profile marks a number as an estimate or one-source, the
 * article says so. `source_url` is the company's own careers page from the
 * profile — the drop page sends students there through the leave-site page.
 *
 * FEED_V3_QUIZ are practice questions (labelled "Practice", never PYQs). Each
 * answer was worked by hand; the working is in `explain`.
 */
import type { DropQuiz } from './db';

export interface StoryContent {
  body: string;
  facts?: [string, string][];
  source_name?: string;
  source_url?: string;
}

const prep = (company: string) =>
  `\n\n## How to prepare on TieEdu\n\nOpen the ${company} page for the round-by-round pattern, topic lessons and timed mocks. Take one full mock under real timing before the test day and review every wrong answer the same evening.`;

const verify = '\n\n> Figures can change between drives. Always confirm pay, bond and eligibility in the official notice and your offer letter.';

export const FEED_V3_STORY: Record<string, StoryContent> = {
  // ─── Diwali ──────────────────────────────────────────────────────────────
  'drop-v3-01': {
    body: '## What is on sale\n\nEvery **paid course** and every **company prep pack** on TieEdu is **50% off** until **10 November 2026, 11:59 PM IST**. Free courses stay free.\n\n## How the price works\n\n- The discount is applied by the server at checkout — the price you see is the price you pay\n- Coupons do not stack on the sale price; only a coupon bigger than 50% replaces it\n- After the sale ends, prices return to normal automatically\n\n## Also this Diwali\n\nA free 3-month TieEdu membership and the internship board. Both are on the Diwali page.',
    facts: [['Discount', '50% off'], ['Applies to', 'Paid courses + prep packs'], ['Ends', '10 Nov 2026, 11:59 PM IST'], ['Free courses', 'Stay free']],
  },
  'drop-v3-02': {
    body: '## What you get\n\nA **free TieEdu membership for 3 months**, claimed in one tap during the Diwali Sale.\n\n- **Extra company mocks** — two more free attempts on top of the default\n- **Every prep lesson** in the company packs\n- **The internship board** — members apply in one tap\n\n## What it costs\n\nNothing. No card, no auto-debit, nothing renews by itself. A membership claimed during the sale stays active for its full 3 months, even after the sale ends.',
    facts: [['Price', 'Free'], ['Length', '3 months'], ['Card needed', 'No'], ['Claim by', '10 Nov 2026']],
  },
  'drop-v3-03': {
    body: '## The course\n\n**AI.FIRST** is TieEdu\'s flagship AI course: 12 modules and 48 lessons covering how AI and LLMs work, prompting and context, checking AI output, building with APIs and agents, and AI ethics and safety.\n\n## Start with the readiness test\n\nA timed test checks what you already know module by module. Ace a module and you can skip it.\n\n## Diwali price\n\n**₹49 instead of ₹99** until 10 November, 11:59 PM IST.\n\n## The certificate\n\nIssued only after the final exam and a capstone project you defend — it shows real skill, not just attendance.',
    facts: [['Sale price', '₹49'], ['Regular price', '₹99'], ['Modules', '12'], ['Lessons', '48']],
  },
  'drop-v3-04': {
    body: '## What is in a prep pack\n\nThe complete company prep pack covers one company end to end:\n\n- **Unlimited mocks** with fresh questions in every attempt\n- **Every technical and HR model answer**\n- Round-by-round lessons and the test pattern\n\n## Diwali price\n\n**₹124 instead of ₹249** until 10 November, 11:59 PM IST.\n\nPick the company you are sitting for next — the free lessons on its page show you the level before you buy.',
    facts: [['Sale price', '₹124'], ['Regular price', '₹249'], ['Mocks', 'Unlimited'], ['Ends', '10 Nov 2026']],
  },
  'drop-v3-05': {
    body: '## DSA Mastery\n\nThe data-structure and algorithm topics coding rounds test most: arrays and strings, hashing, recursion, trees, graphs and dynamic programming — built for the coding sections in TCS NQT Advanced, Infosys DSE/SP, Virtusa Power Coding and similar rounds.\n\n## Diwali price\n\n**₹749 instead of ₹1,499** until 10 November, 11:59 PM IST.\n\nIf coding decides your band (Digital vs Ninja, DSE vs SE), this is the course that moves it.',
    facts: [['Sale price', '₹749'], ['Regular price', '₹1,499'], ['Best for', 'Coding rounds'], ['Ends', '10 Nov 2026']],
  },
  'drop-v3-06': {
    body: '## Half price, everything paid\n\nEvery paid course — AI, coding, aptitude and interview prep — is **50% off** at checkout until 10 November, 11:59 PM IST. Free courses stay free.\n\n## Choosing well\n\n- Sitting for a mass recruiter soon? Start with aptitude and the company pack\n- Aiming for a higher band? Spend the saving on DSA\n- New to AI? AI.FIRST at ₹49\n\nEvery course ends with a certificate anyone can verify.',
    facts: [['Discount', '50% off'], ['Free courses', 'Stay free'], ['Ends', '10 Nov 2026']],
  },
  'drop-v3-07': {
    body: '## TieEdu internships\n\nThe internship board lists roles our team has checked before they go up. Members apply in one tap.\n\n## How to get access\n\n1. Claim the free 3-month Diwali membership\n2. Open the internship board\n3. Apply to the roles that fit\n\nNew listings appear on the board first.',
    facts: [['Who can apply', 'Members'], ['Membership', 'Free this Diwali'], ['Apply', 'One tap']],
  },
  'drop-v3-08': {
    body: '## Happy Diwali\n\nFrom all of us at TieEdu — happy Diwali to you and your family.\n\n## One small gift to your prep\n\nTake **one full mock this week**, under real timing. It shows you exactly which section to fix before the next drive.\n\nThe Diwali Sale runs until 10 November: half price on paid courses and prep packs, and a free 3-month membership.',
    facts: [['Sale ends', '10 Nov 2026'], ['This week', 'One full mock']],
  },
  'drop-v3-09': {
    body: '## The sale ends soon\n\nThe Diwali Sale closes on **10 November 2026 at 11:59 PM IST**. After that, prices reset by themselves.\n\n## Before it ends\n\n- Claim the free 3-month membership (one tap, no card)\n- Pick up the prep pack for your next company at ₹124\n- AI.FIRST is ₹49, DSA Mastery ₹749',
    facts: [['Ends', '10 Nov 2026, 11:59 PM IST'], ['Discount', '50% off'], ['Membership', 'Free, 3 months']],
  },

  // ─── Wipro iOS ──────────────────────────────────────────────────────────
  'drop-v3-10': {
    body: '## A free iOS program\n\nThe Wipro iOS (Swift) training program on TieEdu is **completely free**: 12 modules, lessons, guess papers with memory tricks, cheat sheets, milestone tests and a full course mock.\n\n## Milestone dates\n\n| Test | Date |\n|---|---|\n| Milestone 1 | 15 Nov |\n| Milestone 2 | 25 Nov |\n| Milestone 3 | 4 Dec |\n| Milestone 4 | 10 Dec |\n| Final | 13 Dec |\n\nThe plan counts down to the next milestone and tells you what to study each day.',
    facts: [['Price', 'Free'], ['Modules', '12'], ['Milestone 1', '15 Nov'], ['Final', '13 Dec']],
  },
  'drop-v3-11': {
    body: '## Milestone 1 is on 15 November\n\nRevise the modules up to M1 with the guess papers — every question has a memory trick — then take the M1 milestone test on TieEdu before the real one.\n\n## The last three days\n\n1. Day 1: guess papers, mark what you got wrong\n2. Day 2: cheat sheets for those topics only\n3. Day 3: the milestone test under time, then rest',
    facts: [['Test', 'Milestone 1'], ['Date', '15 Nov'], ['Price', 'Free']],
  },
  'drop-v3-12': {
    body: '## Milestone 2 is on 25 November\n\nLessons, cheat sheets and the M2 milestone test are ready. Check your readiness score first — it is worked out only from the milestones that are due, so it tells you honestly what to fix.',
    facts: [['Test', 'Milestone 2'], ['Date', '25 Nov'], ['Price', 'Free']],
  },

  // ─── Companies ──────────────────────────────────────────────────────────
  'drop-v3-13': {
    body: '## One test, three tracks\n\nTCS hires freshers through the **National Qualifier Test (NQT)**. Your score decides which track you are offered.\n\n| Track | CTC |\n|---|---|\n| Ninja | ₹3.36 LPA |\n| Digital | ₹7.0–7.3 LPA |\n| Prime | ₹9.09–9.3 LPA (UG) |\n\n## The rounds\n\n- **Part A — Foundation:** numerical, verbal, reasoning\n- **Part B — Advanced:** advanced quant, reasoning and coding — this decides Digital and Prime\n- Technical, managerial and HR interviews\n\n## Eligibility\n\nB.E./B.Tech, M.E./M.Tech, MCA, M.Sc; 2024–2026 graduates; 60% throughout; no active backlogs.' + prep('TCS NQT') + verify,
    facts: [['Ninja', '₹3.36 LPA'], ['Digital', '₹7–7.3 LPA'], ['Prime', '₹9.09–9.3 LPA'], ['Cut-off', '60% throughout'], ['Batches', '2024–2026']],
    source_name: 'TCS iON — NQT', source_url: 'https://www.tcsion.com/hub/national-qualifier-test/',
  },
  'drop-v3-14': {
    body: '## ASE or Advanced ASE\n\nAccenture runs one assessment for both roles. The **coding round** is what moves you from ASE (₹4.5 LPA) to Advanced ASE (₹6.5 LPA).\n\n## The rounds\n\n1. **Cognitive and technical** — quant, reasoning, verbal, pseudocode, networking basics, MS Office\n2. **Coding** — 2 problems, 45 minutes\n3. **Communication** — read aloud, listen and repeat, short answers (AI-scored)\n4. **Interview**\n\n## Eligibility\n\nB.E./B.Tech or MCA, current graduating batch, no active backlogs.' + prep('Accenture') + verify,
    facts: [['ASE', '₹4.5 LPA'], ['Advanced ASE', '₹6.5 LPA'], ['Rounds', '4'], ['Coding', '2 problems, 45 min']],
    source_name: 'Accenture India careers', source_url: 'https://www.accenture.com/in-en/careers',
  },
  'drop-v3-15': {
    body: '## Infosys Systems Engineer\n\nInfosys\'s main mass-hiring role, with foundation training often at the Mysuru campus. CTC from recent drives is about **₹3.6–4.2 LPA**.\n\n## The rounds\n\n1. **Online assessment** — 54 questions in 100 minutes: quant, reasoning, verbal and pseudocode\n2. **Technical interview** — project, OOP, DBMS, DSA\n3. **HR interview**\n\n## Eligibility\n\nB.E./B.Tech, M.E./M.Tech, MCA, M.Sc in CS-related and circuit branches; 60% or 6.0 CGPA throughout; no active backlogs; up to a 2-year gap.\n\n## On TieEdu\n\nThe Infosys SE page has 25 free topic lessons, the full 54-question mock and 32 interview answers in the pack.' + verify,
    facts: [['CTC', '~₹3.6–4.2 LPA'], ['Online test', '54 Qs, 100 min'], ['Cut-off', '60% / 6.0 CGPA'], ['Gap allowed', 'Up to 2 years']],
    source_name: 'Infosys careers', source_url: 'https://www.infosys.com/careers/',
  },
  'drop-v3-16': {
    body: '## Infosys\'s premium fresher roles\n\n| Role | CTC |\n|---|---|\n| DSE | ₹7 LPA |\n| SP L1 | ₹11 LPA |\n| SP L2 | ₹16 LPA |\n| SP L3 | ₹21 LPA |\n\n## What decides the level\n\nYour **coding score** and how deep the technical interview goes. The coding assessment has 3 problems — greedy, DP and graphs are common.\n\n## Another route in\n\nHackWithInfy: a strong score there can take you straight to a Power Programmer or DSE interview.' + prep('Infosys DSE / SP') + verify,
    facts: [['DSE', '₹7 LPA'], ['SP L3', '₹21 LPA'], ['Coding', '3 problems'], ['Cut-off', '60% / 6.0 CGPA']],
    source_name: 'Infosys careers', source_url: 'https://www.infosys.com/careers/',
  },
  'drop-v3-17': {
    body: '## Three bands, one process\n\n| Band | CTC |\n|---|---|\n| GenC | ~₹4.0 LPA |\n| GenC Pro | ~₹5.4 LPA |\n| GenC Next | ~₹6.75 LPA |\n\nCognizant states **no service bond** for the GenC program.\n\n## What gets you GenC Next\n\n70%+ across academic levels, plus strong coding and interview performance.\n\n## The rounds\n\n1. Communication + aptitude\n2. Technical assessment (coding for GenC Next)\n3. Technical interview' + prep('Cognizant GenC') + verify,
    facts: [['GenC', '~₹4.0 LPA'], ['GenC Next', '~₹6.75 LPA'], ['Bond', 'None stated'], ['GenC Next cut-off', '70%+']],
    source_name: 'Cognizant careers', source_url: 'https://careers.cognizant.com',
  },
  'drop-v3-18': {
    body: '## Train first, then join\n\nDigital Nurture 5.0 is Cognizant\'s skilling-to-hire program for the **2027 batch**: you train in **Java full stack** (backend, front-end, databases, APIs, testing, CI/CD), and your assessments during the program decide your band.\n\n| Band | CTC |\n|---|---|\n| GenC | ₹4.01 LPA |\n| GenC Pro | ₹5.4 LPA |\n| GenC Next | ₹6.75 LPA |\n\n## Eligibility\n\nCS, IT, ECE, EEE, E&I and circuit branches; 60% throughout; no active backlogs. DN 5.0 applications closed on 18 May 2026 — watch for the next cycle around April–May of your pre-final year.' + verify,
    facts: [['Batch', '2027'], ['Track', 'Java full stack'], ['GenC Next', '₹6.75 LPA'], ['Bond', 'None stated']],
    source_name: 'Cognizant careers', source_url: 'https://careers.cognizant.com',
  },
  'drop-v3-19': {
    body: '## Your score sets your band\n\n| Band | CTC |\n|---|---|\n| Analyst | ~₹4.25 LPA |\n| Analyst (differential) | ~₹5.75 LPA |\n| Senior Analyst | ~₹7.5 LPA |\n\n## The rounds\n\n1. Communication test — spoken English and listening\n2. Technical — pseudocode and CS fundamentals\n3. **Debugging + AI-assisted coding + game-based aptitude**\n4. Interview\n\nThe AI-assisted coding round is new: you are judged on how you use the tool, not just the final code.' + prep('Capgemini Exceller') + verify,
    facts: [['Analyst', '~₹4.25 LPA'], ['Senior Analyst', '~₹7.5 LPA'], ['New round', 'AI-assisted coding'], ['Bond', 'Not stated']],
    source_name: 'Capgemini India careers', source_url: 'https://www.capgemini.com/in-en/careers/',
  },
  'drop-v3-20': {
    body: '## National Talent Hunt\n\nOne Wipro test feeds two tracks:\n\n| Track | CTC |\n|---|---|\n| Elite (Project Engineer) | ~₹3.5–4.0 LPA |\n| Turbo | ~₹6.5–7 LPA |\n\n## The online assessment\n\n- Aptitude: quant, reasoning, verbal\n- An essay\n- 2 coding problems (arrays, strings)\n\nA higher test cut-off plus a tougher technical round leads to Turbo. A service agreement is discussed in the HR round — read it before you sign.' + prep('Wipro Elite NTH') + verify,
    facts: [['Elite', '~₹3.5–4.0 LPA'], ['Turbo', '~₹6.5–7 LPA'], ['Coding', '2 problems'], ['Essay', 'Yes']],
    source_name: 'Wipro careers', source_url: 'https://careers.wipro.com',
  },
  'drop-v3-21': {
    body: '## Two offers from one process\n\n| Track | CTC |\n|---|---|\n| Standard | ₹3.25 LPA |\n| SuperCoder | ₹5.5 LPA |\n\nSuperCoder is an invite-only challenge (2 hard problems, 90 minutes). Clearing it lifts your offer.\n\n## The rounds\n\nAptitude + essay, technical + psychometric (with automata coding), an AI-scored communication test, then technical and HR interviews.\n\n## Read your offer letter\n\nA **₹1 lakh, 2-year bond** is reported. Marks cut-offs (60–70% by drive) are not rounded up.' + prep('Tech Mahindra') + verify,
    facts: [['Standard', '₹3.25 LPA'], ['SuperCoder', '₹5.5 LPA'], ['Bond', '₹1 lakh, 2 years (reported)'], ['Gap', 'Max 1 year']],
    source_name: 'Tech Mahindra registration', source_url: 'https://registration.techmahindra.com',
  },
  'drop-v3-22': {
    body: '## Four rounds\n\n1. **Online assessment** (about 135 minutes) — quantitative aptitude, logical reasoning, verbal English, computer programming MCQs and the **SVAR spoken-English** test\n2. **Coding** (conditional / role-specific) — fix logical and compilation errors, complete partial functions\n3. **Technical interview**\n4. **HR interview**\n\n## Eligibility\n\nB.E./B.Tech, M.E./M.Tech in CS, IT or ECE, or MCA; 60% (6.0 CGPA) in 10th, 12th and degree; no active backlogs.\n\nPay and bond details come from a single third-party guide, so confirm them in the official notice.' + prep('Mphasis') + verify,
    facts: [['Rounds', '4'], ['Spoken English', 'SVAR, in the OA'], ['Cut-off', '60% / 6.0 CGPA'], ['Branches', 'CS, IT, ECE, MCA']],
    source_name: 'Mphasis careers', source_url: 'https://careers.mphasis.com',
  },
  'drop-v3-23': {
    body: '## Two ways in\n\n| Track | CTC |\n|---|---|\n| Standard | ~₹3.5–4.5 LPA |\n| Elite AI-skilled | ~₹18–22 LPA |\n\n## What the Elite track looks for\n\nA demonstrable **AI / GenAI / data / cybersecurity portfolio** and an extended technical screen. The Elite figures come from one source.\n\n## The rounds\n\nOnline assessment (aptitude, technical MCQs and 1–2 coding problems), technical interview, HR interview. Service agreements are used for some entry roles — check the offer letter.' + prep('HCLTech') + verify,
    facts: [['Standard', '~₹3.5–4.5 LPA'], ['Elite AI', '~₹18–22 LPA'], ['Needs', 'AI portfolio'], ['Cut-off', '~60% (typical)']],
    source_name: 'HCLTech careers', source_url: 'https://www.hcltech.com/careers',
  },
  'drop-v3-24': {
    body: '## GET or Premier GET\n\n| Role | CTC |\n|---|---|\n| GET | ₹4.0 LPA |\n| PGET | ₹6.0 LPA |\n\nClearing the **coding assessment** is what gets you PGET.\n\n## The rounds\n\n1. Aptitude + technical domain test\n2. AI-based communication test\n3. Coding assessment (PGET)\n4. Technical interview\n5. HR interview\n\nTraining is 3–6 months on a stipend.' + prep('Hexaware') + verify,
    facts: [['GET', '₹4.0 LPA'], ['PGET', '₹6.0 LPA'], ['Rounds', '5'], ['Training', '3–6 months']],
    source_name: 'Hexaware careers', source_url: 'https://hexaware.com/careers/',
  },
  'drop-v3-25': {
    body: '## Coder or Power Coder\n\n| Role | CTC |\n|---|---|\n| Coder | ₹5 LPA |\n| Power Coder | ₹6.5 LPA |\n\n## The rounds\n\n1. Aptitude — 10 questions, 10 minutes\n2. CS fundamentals + pseudocode — 40 questions, 40 minutes\n3. Coding challenge — 4 problems, 50 minutes\n4. **Power coding** — 3 hard problems, 80 minutes (decides Power Coder)\n5. Interview (technical + HR)\n\nOpen to CSE and ECE.' + prep('Virtusa') + verify,
    facts: [['Coder', '₹5 LPA'], ['Power Coder', '₹6.5 LPA'], ['Power coding', '3 problems, 80 min'], ['Branches', 'CSE, ECE']],
    source_name: 'Virtusa careers', source_url: 'https://www.virtusa.com/careers',
  },
  'drop-v3-26': {
    body: '## Analyst (Technology)\n\nDeloitte USI hires B.Tech freshers as Analysts at about **₹6.5–8.5 LPA** (varies by team) — a higher starting band than most mass recruiters.\n\n## The rounds\n\n1. Online assessment — quant, reasoning, verbal, technical MCQs\n2. **Technical / case interview** — project, SQL, one language, scenarios\n3. HR / fit interview\n\nThe case interview is the different part: practise talking through a problem out loud. There is generally no traditional bond — check the notice-period terms.' + prep('Deloitte USI') + verify,
    facts: [['CTC', '~₹6.5–8.5 LPA'], ['Special round', 'Case interview'], ['Cut-off', '60%+'], ['Bond', 'Generally none']],
    source_name: 'Deloitte India careers', source_url: 'https://www.deloitte.com/in/en/careers.html',
  },
  'drop-v3-27': {
    body: '## LTM, formerly LTIMindtree\n\nLarsen & Toubro\'s IT services arm hires freshers as **Software Engineers** (~₹4.0–4.4 LPA) and **GETs** (~₹3.9–4.3 LPA). These figures are candidate-reported.\n\n## The rounds\n\nOnline assessment (aptitude and coding), technical interview, HR interview. Test invites for off-campus applications usually arrive 1–3 weeks after you apply.\n\n## Eligibility\n\nAbout 60% / 6.0 CGPA in graduation and 60% in 10th and 12th; zero active backlogs.' + prep('LTM') + verify,
    facts: [['Software Engineer', '~₹4.0–4.4 LPA'], ['GET', '~₹3.9–4.3 LPA'], ['Backlogs', 'None allowed'], ['Source', 'Candidate-reported']],
    source_name: 'LTM careers', source_url: 'https://www.ltm.com/careers',
  },
  'drop-v3-28': {
    body: '## IBM\'s entry role\n\nAssociate System Engineers join IBM\'s Client Innovation Centers. The CTC is an **estimate** of about ₹4.5–6.5 LPA.\n\n## Who can apply\n\nB.E./B.Tech in **CSE, IT, AI/ML, DS or Cyber Security** — ECE, EEE, Mechanical and Civil are not eligible for this posting. 6.0 CGPA / 60%, no active backlogs.\n\n## The rounds\n\n1. Game-based cognitive test (memory and pattern games)\n2. Coding test — 3 easy-to-medium problems\n3. Technical interview\n4. HR interview' + prep('IBM') + verify,
    facts: [['CTC', '~₹4.5–6.5 LPA (est.)'], ['Branches', 'CS-stream only'], ['Coding', '3 problems'], ['Applications', 'Rolling']],
    source_name: 'IBM careers', source_url: 'https://www.ibm.com/careers',
  },
  'drop-v3-29': {
    body: '## Product engineering\n\nPersistent Systems hires software developers at about **₹4–6 LPA**, with your interview performance setting where you land in the band.\n\n## The rounds\n\n1. Online aptitude + coding test\n2. Technical interview\n3. HR interview\n\nB.E./B.Tech or MCA in CS, IT or related. A bond is typically not used, but this is unconfirmed — check the offer letter.' + prep('Persistent Systems') + verify,
    facts: [['CTC', '~₹4–6 LPA'], ['Decided by', 'Interview'], ['Rounds', '3'], ['Bond', 'Typically none']],
    source_name: 'Persistent careers', source_url: 'https://careers.persistent.com',
  },
  'drop-v3-30': {
    body: '## NTT DATA in India\n\nThe Japanese IT major hires CS and IT freshers as **Associate Software Engineers**. Recent postings accepted the 2024, 2025 and 2026 batches. The CTC was not disclosed.\n\n## The rounds\n\n1. Online coding + aptitude\n2. Technical interview\n3. HR interview\n\nPostings appear through the year on their careers portal.' + prep('NTT DATA') + verify,
    facts: [['Role', 'Associate Software Engineer'], ['Batches', '2024–2026'], ['Branches', 'CS, IT'], ['CTC', 'Not disclosed']],
    source_name: 'NTT DATA careers', source_url: 'https://nttdata.eightfold.ai',
  },
  'drop-v3-31': {
    body: '## A global coding contest\n\nTCS CodeVita Season 14 is open to science and engineering students worldwide graduating in **2027, 2028, 2029 or 2030**. There is no marks cut-off.\n\n## The format\n\n- **Round 1** and **Round 2** — competitive programming (greedy, DP, graphs)\n- **Grand Finale** — the hardest problems\n\nGood ranks have led to TCS interview calls, but an interview is not guaranteed. Season 14 dates were not confirmed when this was written.',
    facts: [['Batches', '2027–2030'], ['Cut-off', 'None'], ['Rounds', '2 + Grand Finale'], ['Interview', 'Not guaranteed']],
    source_name: 'TCS CodeVita', source_url: 'https://codevita.tcsapps.com',
  },
  'drop-v3-32': {
    body: '## Three problems, three hours\n\nHackWithInfy is Infosys\'s coding contest. How many problems you fully solve decides the role you interview for:\n\n| Solved | Interview for |\n|---|---|\n| 2–3 | Power Programmer (Specialist Programmer) |\n| 2 | DSE |\n| 1–2 | SE Specialist |\n| Partial | SE |\n\nGreedy and dynamic programming are the usual topics. This role mapping comes from a prep site, not Infosys.',
    facts: [['Problems', '3 in 3 hours'], ['Top role', 'Power Programmer'], ['Topics', 'Greedy, DP'], ['Who', 'Pre-final / final year']],
    source_name: 'Infosys HackWithInfy', source_url: 'https://www.infosys.com/careers/hackwithinfy.html',
  },

  // ─── Courses ────────────────────────────────────────────────────────────
  'drop-v3-33': {
    body: '## Python Programming\n\nA free, hands-on course in 15 modules — from your first script to functions, files, OOP, testing and packages.\n\n## Why Python for placements\n\nMost coding rounds accept Python, and its short syntax leaves more of the clock for the actual problem.',
    facts: [['Price', 'Free'], ['Modules', '15'], ['Certificate', 'Yes']],
  },
  'drop-v3-34': {
    body: '## Aptitude & Reasoning Mastery\n\nThe online test is where most mass-recruiter attempts end. This free course drills the **high-frequency quant and reasoning** topics that mass-recruiter tests repeat, and ends with a certificate.',
    facts: [['Price', 'Free'], ['Focus', 'Online-test round'], ['Certificate', 'Yes']],
  },
  'drop-v3-35': {
    body: '## Generative AI Essentials\n\nA free course on prompting, everyday AI tools and using them well — including checking what they produce.\n\nRecruiters now ask about AI skills, and some tracks (HCLTech Elite, Capgemini\'s AI-assisted coding round) test them directly.',
    facts: [['Price', 'Free'], ['Modules', '10'], ['Certificate', 'Yes']],
  },
  'drop-v3-36': {
    body: '## SQL & Databases Mastery\n\nThe SQL and database questions that repeat in tests and technical interviews — in a free course with a certificate.\n\nSQL comes up in almost every technical interview, whatever the role.',
    facts: [['Price', 'Free'], ['Covers', 'SQL + databases'], ['Certificate', 'Yes']],
  },
  'drop-v3-37': {
    body: '## Resume & LinkedIn Building\n\nA recruiter spends seconds on the first pass of a resume. This free course shows how to write one that survives it, and how to set up a LinkedIn profile recruiters actually find.\n\n- One page, outcomes over duties\n- Projects with numbers\n- A headline and summary that say what you do',
    facts: [['Price', 'Free'], ['Covers', 'Resume + LinkedIn'], ['Certificate', 'Yes']],
  },

  // ─── Features ───────────────────────────────────────────────────────────
  'drop-v3-38': {
    body: '## Free skill tests\n\nPick a skill, take a timed test and get a **score by topic** — your strengths and the exact gaps to fix. Pass the cut-off and you get a certificate anyone can verify.\n\nA good first step before you choose what to study next.',
    facts: [['Tests', '100'], ['Price', 'Free'], ['Certificate', 'On passing']],
  },
  'drop-v3-39': {
    body: '## The real pattern\n\nThe Infosys SE full mock follows the online assessment: **54 questions** — Math 10, Reasoning 15, Verbal 20, Pseudocode 5, Puzzles 4 — with section timers, secure mode and an email-writing task at the end.\n\nTake it once early to find your weak section, and once more in the final week.',
    facts: [['Questions', '54'], ['Sections', '5 + email task'], ['Mode', 'Secure, timed']],
  },
  'drop-v3-40': {
    body: '## Skill Passport\n\nEvery badge, certificate and score you earn on TieEdu, on **one page behind one link**. Share it with recruiters or add it to your resume — anyone can verify it.',
    facts: [['Shows', 'Badges, certificates, scores'], ['Share', 'One link'], ['Price', 'Free']],
  },
  'drop-v3-41': {
    body: '## Practise speaking, not just reading\n\nSpeak for about 30 seconds and get gentle tips on your English. You can read the tips in English or Hinglish.\n\nAccenture, Cognizant, Hexaware and Tech Mahindra all use AI-scored communication rounds — a few minutes a day makes them far easier.',
    facts: [['Time', '30 seconds a go'], ['Tips in', 'English or Hinglish'], ['Price', 'Free']],
  },
  'drop-v3-42': {
    body: '## Mock interview\n\nAnswer five HR or technical questions and get feedback on **each answer**, not just a final score. Do it a few times before your real interview and the common questions stop being a surprise.',
    facts: [['Questions', '5 per round'], ['Types', 'HR or technical'], ['Feedback', 'On every answer']],
  },
  'drop-v3-43': {
    body: '## Interview a friend, then swap\n\nInvite a friend: you take their interview, then swap and they take yours. Both of you earn points. Asking questions shows you what interviewers look for.',
    facts: [['Format', 'Swap roles'], ['Points', 'Both earn'], ['Price', 'Free']],
  },
  'drop-v3-44': {
    body: '## Ten minutes a day\n\nOne aptitude question, one coding question and one HR question — a fresh set every day. Small daily practice beats a weekend cram, and your streak keeps you honest.',
    facts: [['Time', '~10 min'], ['Each day', 'Aptitude + coding + HR'], ['Price', 'Free']],
  },
  'drop-v3-45': {
    body: '## A plan for every day\n\nEnter your test date and TieEdu builds a day-by-day plan: a countdown, one Train and one Test task a day, and a **readiness score** that tells you what to fix next.',
    facts: [['Input', 'Your test date'], ['Each day', '1 Train + 1 Test task'], ['Tracks', 'Readiness score']],
  },
  'drop-v3-46': {
    body: '## Is this offer real?\n\nPaste a job offer message and check it for the warning signs of a fake offer before you reply.\n\n## The one rule\n\n**Genuine companies never ask you to pay** for a test, an interview, training or an offer letter.',
    facts: [['Checks', 'Offer messages'], ['Rule', 'Never pay'], ['Price', 'Free']],
  },
  'drop-v3-47': {
    body: '## Side by side\n\nPick two companies and compare pay, rounds and eligibility in one view — then put your prep time where your strengths fit.',
    facts: [['Compares', 'Pay, rounds, eligibility'], ['Companies', 'Any two']],
  },
  'drop-v3-48': {
    body: '## Where does your campus stand?\n\nThe college leaderboard ranks campuses by **tested skills** on TieEdu — not claims. Every test you take adds to your college\'s standing.',
    facts: [['Ranked by', 'Tested skills'], ['Updates', 'As students practise']],
  },

  // ─── Tips ───────────────────────────────────────────────────────────────
  'drop-v3-49': {
    body: '## Trace, then answer\n\nPseudocode questions are traps for people who answer by reading. Instead:\n\n1. Make a small table with one column per variable\n2. Write the values after **every** pass of the loop\n3. Check the loop condition (`<` or `<=`) before each pass\n4. Only then pick the option\n\nIt feels slow; it is faster than getting it wrong.',
    facts: [['Method', 'Variable table'], ['Watch for', '< vs <='], ['Used in', 'Infosys, Accenture, Capgemini']],
  },
  'drop-v3-50': {
    body: '## Never pay\n\nGenuine companies charge **nothing** for tests, interviews, training or offer letters.\n\n## Red flags\n\n- A "registration" or "security" fee\n- An offer without any interview\n- Email from a free mail domain instead of the company\'s\n- Pressure to pay today\n\nApply only on official careers pages, and check any message with Offer Check.',
    facts: [['Fees', 'Never genuine'], ['Apply on', 'Official careers pages'], ['Check with', 'Offer Check']],
  },
  'drop-v3-51': {
    body: '## Communication rounds eliminate\n\nAccenture, Cognizant, Hexaware and Tech Mahindra use **AI-scored spoken-English** rounds, and failing them ends the process regardless of your other scores.\n\n## What helps\n\n- Speak answers out loud, not in your head\n- Short sentences, clear endings\n- A few minutes a day with the English coach',
    facts: [['Eliminatory at', 'Accenture, Cognizant, Hexaware, TechM'], ['Practise', 'Out loud, daily']],
  },
  'drop-v3-53': {
    body: '## One full mock, real timing\n\nMost attempts slip on **time**, not knowledge. Before any drive:\n\n1. Take one full mock with the real timer\n2. Note where you ran out of time\n3. Review every wrong answer the same day\n4. Re-do only the weak section the next day',
    facts: [['When', 'The week before'], ['Timer', 'Real'], ['Review', 'Same day']],
  },
};

// ─── Quiz drops ────────────────────────────────────────────────────────────

export interface QuizSpec {
  id: string;
  headline: string;
  topic: string;
  art: string;
  route: string;
  /** Publish offset in days from the seed run (interleaves with the feed). */
  at: number;
  quiz: DropQuiz;
}

export const FEED_V3_QUIZ: QuizSpec[] = [
  {
    id: 'drop-v3-q01', at: -0.32, art: 'code', topic: 'Pseudocode', route: '/company/infosys-systems-engineer',
    headline: 'Practice: what does this pseudocode print?',
    quiz: {
      question: 'x = 5, y = 0\nwhile x > 0:\n    y = y + x\n    x = x - 2\nprint y',
      options: ['9', '15', '8', '6'], answer: 0,
      explain: 'Trace it: (x=5) y=5 → x=3; (x=3) y=8 → x=1; (x=1) y=9 → x=−1; loop stops. y = 9.',
    },
  },
  {
    id: 'drop-v3-q02', at: -0.62, art: 'chart', topic: 'Speed & distance', route: '/courses/aptitude-reasoning-mastery',
    headline: 'Practice: a train, a pole and six seconds',
    quiz: {
      question: 'A 120 m long train passes a pole in 6 seconds. What is its speed in km/h?',
      options: ['60 km/h', '72 km/h', '80 km/h', '66 km/h'], answer: 1,
      explain: 'Speed = 120 ÷ 6 = 20 m/s. To convert, multiply by 18/5: 20 × 18/5 = 72 km/h.',
    },
  },
  {
    id: 'drop-v3-q03', at: -0.92, art: 'chart', topic: 'Percentages', route: '/courses/aptitude-reasoning-mastery',
    headline: 'Practice: up 20%, then down 20% — where does the price land?',
    quiz: {
      question: 'A price rises by 20% and then falls by 20%. What is the net change?',
      options: ['No change', '4% decrease', '4% increase', '2% decrease'], answer: 1,
      explain: '100 → 120 → 120 × 0.8 = 96. That is a 4% decrease. Successive ±x% always nets −x²/100%.',
    },
  },
  {
    id: 'drop-v3-q04', at: -1.22, art: 'stars', topic: 'Number series', route: '/courses/aptitude-reasoning-mastery',
    headline: 'Practice: find the next number in the series',
    quiz: {
      question: '2, 6, 12, 20, 30, ?',
      options: ['40', '42', '44', '36'], answer: 1,
      explain: 'The gaps are 4, 6, 8, 10, so the next gap is 12: 30 + 12 = 42. (Each term is n × (n + 1).)',
    },
  },
  {
    id: 'drop-v3-q05', at: -1.52, art: 'book', topic: 'Verbal', route: '/english-coach',
    headline: 'Practice: spot the correctly spelt word',
    quiz: {
      question: 'Which spelling is correct?',
      options: ['Acommodate', 'Accomodate', 'Accommodate', 'Acomodate'], answer: 2,
      explain: '"Accommodate" has a double c and a double m.',
    },
  },
  {
    id: 'drop-v3-q06', at: -1.82, art: 'code', topic: 'Python', route: '/courses/python-programming',
    headline: 'Practice: what does this line of Python print?',
    quiz: {
      question: 'print(len(set([1, 2, 2, 3, 3, 3])))',
      options: ['6', '3', '1', 'Error'], answer: 1,
      explain: 'A set keeps only unique values: {1, 2, 3}. Its length is 3.',
    },
  },
  {
    id: 'drop-v3-q07', at: -2.12, art: 'chart', topic: 'SQL', route: '/courses/sql-databases-mastery',
    headline: 'Practice: which SQL clause filters groups?',
    quiz: {
      question: 'Which clause filters rows AFTER GROUP BY has formed the groups?',
      options: ['WHERE', 'HAVING', 'ORDER BY', 'LIMIT'], answer: 1,
      explain: 'WHERE filters rows before grouping; HAVING filters the groups after GROUP BY (e.g. HAVING COUNT(*) > 5).',
    },
  },
  {
    id: 'drop-v3-q08', at: -2.42, art: 'code', topic: 'DSA', route: '/courses/dsa-mastery',
    headline: 'Practice: how fast is binary search?',
    quiz: {
      question: 'What is the worst-case time complexity of binary search on a sorted array of n elements?',
      options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'], answer: 1,
      explain: 'Each step halves the search range, so it takes at most about log₂ n steps.',
    },
  },
  {
    id: 'drop-v3-q09', at: -2.72, art: 'ai', topic: 'OOP', route: '/mock-interview',
    headline: 'Practice: an OOP question interviews love',
    quiz: {
      question: 'Which OOP idea lets one method name behave differently in different subclasses?',
      options: ['Encapsulation', 'Inheritance', 'Polymorphism', 'Abstraction'], answer: 2,
      explain: 'Polymorphism — "many forms". A subclass overrides the method, and the call runs the version for the actual object.',
    },
  },
  {
    id: 'drop-v3-q10', at: -3.02, art: 'chart', topic: 'Profit & loss', route: '/courses/aptitude-reasoning-mastery',
    headline: 'Practice: bought at ₹400, sold at ₹500 — profit %?',
    quiz: {
      question: 'An item bought for ₹400 is sold for ₹500. What is the profit percentage?',
      options: ['20%', '25%', '30%', '15%'], answer: 1,
      explain: 'Profit = ₹100. Profit % is on the cost price: 100 ÷ 400 × 100 = 25%. (20% would be on the selling price — the common trap.)',
    },
  },
  {
    id: 'drop-v3-q11', at: -3.32, art: 'calendar', topic: 'Time & work', route: '/courses/aptitude-reasoning-mastery',
    headline: 'Practice: A takes 10 days, B takes 15 — together?',
    quiz: {
      question: 'A can finish a job in 10 days and B in 15 days. Working together, how many days do they take?',
      options: ['5 days', '6 days', '8 days', '12.5 days'], answer: 1,
      explain: 'Per day: A does 1/10, B does 1/15. Together 1/10 + 1/15 = 3/30 + 2/30 = 1/6, so 6 days.',
    },
  },
  {
    id: 'drop-v3-q12', at: -3.62, art: 'code', topic: 'Swift', route: '/company/wipro-ios-swift',
    headline: 'Practice: Swift basics for the Wipro iOS milestone',
    quiz: {
      question: 'In Swift, which keyword declares a constant?',
      options: ['var', 'let', 'const', 'final'], answer: 1,
      explain: '`let` declares a constant; `var` declares a variable that can change. Swift has no `const` keyword.',
    },
  },
];
