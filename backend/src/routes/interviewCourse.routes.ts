import { Router, Request, Response } from 'express';
import { loadDb, saveDb } from '../data/db';
import { requireAuth, optionalAuth } from '../middleware/auth';

export const interviewCourseRouter = Router();

export interface InterviewModule {
  id: number;
  category: 'Modules 1 - 10' | 'Modules 11 - 20' | 'Modules 21 - 30' | 'Modules 31 - 40' | 'Modules 41 - 50';
  title: string;
  question: string;
  summary: string;
  star_breakdown?: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };
  sample_answer: string;
  expert_tip: string;
  red_flag_trap: string;
  scoring_criteria: string;
  is_free: boolean;
}

// 50 Masterclass Modules Data Bank
const INTERVIEW_MODULES: InterviewModule[] = [
  // Modules 1 - 10
  {
    id: 1,
    category: 'Modules 1 - 10',
    title: '#1 — Course Introduction & Interview Mastery Mindset',
    question: 'How to prepare mentally for high-stakes interviews?',
    summary: 'Master the core framework of structured interview preparation, company alignment, and active confidence.',
    sample_answer: "I approach high-stakes interviews by thoroughly researching the organization's product ecosystem, business model, and engineering culture. I structure my key career achievements into clear STAR frameworks so I can deliver concise, impact-driven answers regardless of question phrasing.",
    expert_tip: "Map your past project outcomes directly to the company's core values before walking into the room.",
    red_flag_trap: "Rambling without a predefined structure or speaking negatively about past managers.",
    scoring_criteria: "Assessed on clarity of thought, poise under pressure, and systematic preparation.",
    is_free: true
  },
  {
    id: 2,
    category: 'Modules 1 - 10',
    title: '#2 — Free Access to Psychometric & Aptitude Job Tests',
    question: 'How do candidate assessment tests work in top tech & corporate rounds?',
    summary: 'Understand numerical reasoning, verbal logic, and situational judgment tests used by tier-1 recruiters.',
    sample_answer: "When tackling psychometric assessments, I balance speed with accuracy by identifying pattern rules quickly in spatial tests and staying calm during timed numerical logic sections.",
    expert_tip: "Take timed practice tests 3-5 days before the actual online assessment to build speed memory.",
    red_flag_trap: "Spending too long on a single tough question in a timed test.",
    scoring_criteria: "Accuracy rate under timed conditions, logical dexterity, and consistency.",
    is_free: true
  },
  {
    id: 3,
    category: 'Modules 1 - 10',
    title: '#3 — The Secrets to Passing Any Interview',
    question: 'What are the top 3 criteria recruiters use to evaluate candidates?',
    summary: 'Learn the candidate evaluation triad: Technical Competence, Team Fit, and Ownership/Initiative.',
    sample_answer: "Recruiters look for competence to do the job, passion for the company domain, and strong collaborative communication. Demonstrating ownership of past outcomes sets top candidates apart.",
    expert_tip: "Frame every past failure as a high-leverage learning experience.",
    red_flag_trap: "Failing to ask insightful questions at the end of the conversation.",
    scoring_criteria: "Demonstrated impact, cultural alignment, and proactive problem solving.",
    is_free: true
  },
  {
    id: 4,
    category: 'Modules 1 - 10',
    title: '#4 — S.T.A.R. Interview Technique Masterclass',
    question: 'How to structure behavioral answers using S.T.A.R.?',
    summary: 'Deconstruct Situation, Task, Action, and Result with emphasis on 70% time spent on Action & Result.',
    star_breakdown: {
      situation: "In Q3, our API latency spiked by 450ms during flash sale peaks affecting 100k users.",
      task: "As the backend lead, I was tasked with identifying bottlenecks and restoring P99 latency below 100ms.",
      action: "I profiled DB queries, introduced Redis caching for hot user tokens, and optimized connection pooling.",
      result: "P99 latency dropped by 78% (to 65ms), handling 3x concurrent load without single-point failure."
    },
    sample_answer: "I structure behavioral responses using STAR: first setting the concise Situation & Task context (20%), then detailing my specific individual Actions (60%), and concluding with quantifiable Results and metric impact (20%).",
    expert_tip: "Always end your STAR story with metrics (% increase, time saved, revenue generated).",
    red_flag_trap: "Using 'We did this' without clarifying your personal specific contribution.",
    scoring_criteria: "Clear structure, quantified metric results, and specific personal accountability.",
    is_free: true
  },
  {
    id: 5,
    category: 'Modules 1 - 10',
    title: '#5 — How to Predict Interview Questions',
    question: 'How can you anticipate 80% of questions before the interview?',
    summary: 'Reverse-engineer job descriptions, company tech stacks, and recent glassdoor/TieEdu vault submissions.',
    sample_answer: "I break down the job description requirements into core competency pillars. For every bullet point in the job spec, I prepare two concrete STAR anecdotes showing I have already solved similar problems.",
    expert_tip: "Look at the company's recent engineering blog posts or press releases for current priorities.",
    red_flag_trap: "Preparing generic answers that could apply to any company.",
    scoring_criteria: "Relevance of response to the specific job description requirements.",
    is_free: true
  },
  {
    id: 6,
    category: 'Modules 1 - 10',
    title: '#6 — Interview Technique & Body Language',
    question: 'How to project authority and warmth in virtual & in-person interviews?',
    summary: 'Master eye contact, posture, vocal tone, and non-verbal cues that build instant trust with interviewers.',
    sample_answer: "I maintain steady eye contact with the camera lens during virtual rounds, maintain upright open posture, and speak at a measured pace with deliberate pauses to convey composure.",
    expert_tip: "Look directly into the camera lens when delivering your key achievements, not at the screen.",
    red_flag_trap: "Slouching, crossing arms, or fidgeting with desk objects.",
    scoring_criteria: "Professional presence, confidence, and active listening cues.",
    is_free: true
  },
  {
    id: 7,
    category: 'Modules 1 - 10',
    title: '#7 — How to Answer Probing Follow-Up Questions',
    question: 'What do you do when an interviewer digs deeper into your claims?',
    summary: 'Handle technical cross-examination, architecture trade-offs, and unexpected drill-downs with ease.',
    sample_answer: "When probed, I welcome the depth. I walk through the trade-offs considered during design, explain alternative approaches evaluated, and justify why the chosen strategy was optimal under our constraints.",
    expert_tip: "Acknowledge limitations of your approach proactively — interviewers respect honesty.",
    red_flag_trap: "Getting defensive when an interviewer challenges your code or architecture choice.",
    scoring_criteria: "Depth of domain knowledge, honesty under scrutiny, and critical thinking.",
    is_free: true
  },
  {
    id: 8,
    category: 'Modules 1 - 10',
    title: '#8 — Mindset to Secure Your Dream Role',
    question: 'How to stand out from 500+ applicants for top CTC packages?',
    summary: 'Shift from a passive applicant mindset to a proactive solution consultant who brings immediate ROI.',
    sample_answer: "I view an interview as a collaborative technical discussion where I demonstrate how my skills directly solve the team's immediate operational challenges and scale their product.",
    expert_tip: "Prepare a mini 30-60-90 day impact plan to show proactive foresight.",
    red_flag_trap: "Appearing interested only in compensation or perks rather than company mission.",
    scoring_criteria: "Value orientation, ambition, and strategic vision.",
    is_free: true
  },
  {
    id: 9,
    category: 'Modules 1 - 10',
    title: '#9 — Small Talk & Icebreakers: "How was your journey here today?"',
    question: 'How to handle icebreaker questions effectively?',
    summary: 'Turn casual pleasantries into positive rapport without oversharing or sounding robotic.',
    sample_answer: "Thank you, it was smooth! I got here with plenty of time to spare, which gave me a moment to re-read your team's latest engineering release notes. I'm really looking forward to our discussion.",
    expert_tip: "Use the icebreaker to pivot seamlessly into enthusiasm for the role.",
    red_flag_trap: "Complaining about traffic, weather, or morning stress.",
    scoring_criteria: "Warmth, professional etiquette, and seamless transition to business.",
    is_free: true
  },
  {
    id: 10,
    category: 'Modules 1 - 10',
    title: '#10 — "Tell Me About Yourself" Master Answer Blueprint',
    question: 'What is the perfect 90-second answer to "Tell me about yourself"?',
    summary: 'Master the 3-part framework: Present role & key focus -> Past experience highlight -> Future fit with this company.',
    sample_answer: "I am a Full-Stack Systems Engineer with 3+ years of experience building high-throughput microservices and cloud infrastructure. Currently, I lead backend optimization for data pipelines serving 200k daily users, where I recently cut API latency by 45%. Earlier in my career, I focused on distributed DB caching and security protocols. What excites me about this role at your company is your aggressive push into Zero Trust Cloud Architecture, where my skills in distributed systems and performance tuning can drive immediate velocity.",
    expert_tip: "Keep it under 90 seconds. End with why this specific role is the logical next step.",
    red_flag_trap: "Reciting your resume chronologically starting from high school.",
    scoring_criteria: "Conciseness, relevance of experience, and clear pitch narrative.",
    is_free: true
  },

  // Modules 11 - 20
  {
    id: 11,
    category: 'Modules 11 - 20',
    title: '#11 — "Why Have You Applied for This Job?"',
    question: 'How to prove genuine alignment with the company?',
    summary: 'Connect your personal career goals with the company product trajectory and team culture.',
    sample_answer: "I have followed your product innovation in payment security for over two years. Your recent engineering blog post on idempotent webhooks highlighted the exact distributed systems challenges I excel at. I applied because I want to bring my background in high-concurrency microservices to help scale your transactional throughput.",
    expert_tip: "Mention a specific feature or blog post published by the company engineering team.",
    red_flag_trap: "Giving generic answers like 'It seems like a good company with high pay.'",
    scoring_criteria: "Domain research depth, alignment with company roadmap.",
    is_free: false
  },
  {
    id: 12,
    category: 'Modules 11 - 20',
    title: '#12 — "What Have You Learnt About This Company?"',
    question: 'How to show deep research during your interview?',
    summary: 'Demonstrate knowledge of company market position, competitors, culture values, and growth metrics.',
    sample_answer: "I know that your company recently expanded into tier-2 enterprise SaaS markets with 65% YoY growth. You pioneered Zero Trust proxy execution, competing directly with legacy hardware firewalls. I was particularly impressed by your commitment to 99.999% uptime SLA across global data centers.",
    expert_tip: "Cite 2-3 specific business metrics or recent market expansions.",
    red_flag_trap: "Only quoting the home page tagline.",
    scoring_criteria: "Commercial awareness and industry knowledge.",
    is_free: false
  },
  {
    id: 13,
    category: 'Modules 11 - 20',
    title: '#13 — "Why Do You Want to Leave Your Current Role?"',
    question: 'How to answer without speaking negatively about your current employer?',
    summary: 'Frame your career move as running TOWARD new growth opportunities, not running away from problems.',
    sample_answer: "I have had a fantastic journey at my current company, where I led the core database optimization initiative. However, I am now seeking a higher-scale challenge in cloud security infrastructure where I can take on larger system design ownership, which aligns perfectly with this role.",
    expert_tip: "Always express gratitude for past learning before pivoting to future growth.",
    red_flag_trap: "Criticizing past managers, office politics, or low compensation.",
    scoring_criteria: "Professionalism, positive framing, and growth orientation.",
    is_free: false
  },
  {
    id: 14,
    category: 'Modules 11 - 20',
    title: '#14 — "What Are Your Strengths?" (With Evidence Matrix)',
    question: 'How to back up strengths with concrete data?',
    summary: 'Pick 2 core technical/soft strengths and attach measurable evidence to each.',
    sample_answer: "My top strength is systematic root-cause diagnosis under pressure. For instance, when an unhandled memory leak degraded database response times during a product launch, I isolated the unindexed query pattern using APM tools and deployed a patch within 40 minutes, preventing SLA violation.",
    expert_tip: "Use the formula: [Strength] + [Concrete Incident] + [Quantified Outcome].",
    red_flag_trap: "Listing cliché words like 'hardworking' or 'perfectionist' without proof.",
    scoring_criteria: "Self-awareness and evidence-based justification.",
    is_free: false
  },
  {
    id: 15,
    category: 'Modules 11 - 20',
    title: '#15 — "Demonstrate Flexibility in a Work Scenario"',
    question: 'How do you handle sudden project pivot requirements?',
    summary: 'Show adaptability when specifications change, technologies change, or deadlines are moved up.',
    sample_answer: "When our product roadmap pivoted to support mobile web clients 3 weeks before launch, I adapted by refactoring our REST backend into modular GraphQL endpoints. This allowed mobile UI teams to query only required fields, keeping sprint timelines on track.",
    expert_tip: "Highlight emotional calm and solution-oriented agile execution.",
    red_flag_trap: "Expressing frustration or resistance to changing business requirements.",
    scoring_criteria: "Agility, problem solving under change, and team alignment.",
    is_free: false
  },
  {
    id: 16,
    category: 'Modules 11 - 20',
    title: '#16 — "What Are Your Weaknesses?" (Strategic Turnaround)',
    question: 'How to share a real weakness with a active growth plan?',
    summary: 'Select a real professional area of development and show the concrete steps you take to manage it.',
    sample_answer: "Earlier in my career, I tended to over-engineer solutions by attempting to build custom internal tools rather than leveraging existing open-source libraries. I recognized this slowed execution speed, so I implemented a strict 'build vs buy' evaluation rubric for all design proposals.",
    expert_tip: "Never say 'I have no weaknesses' or 'I work too hard.' Pick a real, fixable engineering habits item.",
    red_flag_trap: "Choosing a core job requirement as your weakness (e.g. 'I struggle with coding').",
    scoring_criteria: "Self-awareness, maturity, and proactive self-improvement.",
    is_free: false
  },
  {
    id: 17,
    category: 'Modules 11 - 20',
    title: '#17 — "Are You Self-Motivated?"',
    question: 'How do you drive impact without constant supervision?',
    summary: 'Demonstrate internal drive, continuous self-learning, and initiative in unblocking yourself.',
    sample_answer: "Yes, I am driven by building efficient systems. When I noticed our staging environment deployments were taking 45 minutes manually, I took initiative during hack week to build an automated GitHub Actions CI/CD pipeline, cutting deployment time to 6 minutes for the entire team.",
    expert_tip: "Share a project you initiated on your own initiative without being asked.",
    red_flag_trap: "Saying you need clear daily step-by-step instructions from management.",
    scoring_criteria: "Initiative, internal drive, and proactive value creation.",
    is_free: false
  },
  {
    id: 18,
    category: 'Modules 11 - 20',
    title: '#18 — "Where Do You See Yourself in 5 Years?"',
    question: 'How to show ambition while committing to the role?',
    summary: 'Balance vertical technical mastery with leadership growth aligned with company leveling.',
    sample_answer: "In 5 years, I aim to have developed deep domain expertise in distributed systems architecture, evolving into a Staff Engineer or Technical Lead who mentors junior developers and architects resilient infrastructure for core product modules.",
    expert_tip: "Show realistic milestone progression within the technical/management track.",
    red_flag_trap: "Saying 'I want your job' or 'I plan to start my own company in 2 years.'",
    scoring_criteria: "Long-term commitment, ambition, and career alignment.",
    is_free: false
  },
  {
    id: 19,
    category: 'Modules 11 - 20',
    title: '#19 — "Teamwork & Collaboration Dynamics"',
    question: 'How do you collaborate across cross-functional product teams?',
    summary: 'Demonstrate effective communication with PMs, Designers, QA, and DevOps.',
    sample_answer: "I believe great engineering requires active cross-functional empathy. When building a new checkout UI feature, I worked closely with UX designers to align component states and collaborated with QA to write automated integration tests early, ensuring zero launch regressions.",
    expert_tip: "Emphasize clear documentation and early contract definitions (e.g. OpenAPI specs).",
    red_flag_trap: "Describing yourself as a lone wolf who prefers working isolated.",
    scoring_criteria: "Cross-functional communication, empathy, and team velocity.",
    is_free: false
  },
  {
    id: 20,
    category: 'Modules 11 - 20',
    title: '#20 — "Handling Constructive Criticism & Feedback"',
    question: 'How do you handle peer review feedback or code rejections?',
    summary: 'Show humility, professional maturity, and objective code improvement during PR reviews.',
    sample_answer: "I view code reviews as high-leverage peer learning. When a senior engineer pointed out performance implications of a database loop in my pull request, I thanked them, refactored it to batch queries, and added a benchmark test to ensure performance limits were enforced.",
    expert_tip: "Separate your ego from your code.",
    red_flag_trap: "Defending bad patterns or taking technical feedback personally.",
    scoring_criteria: "Egoless collaboration, receptivity to coaching, and continuous learning.",
    is_free: false
  },

  // Modules 21 - 30
  {
    id: 21,
    category: 'Modules 21 - 30',
    title: '#21 — "Are You a Risk Taker?"',
    question: 'How do you balance calculated technical risks vs system stability?',
    summary: 'Explain calculated risk evaluation, feature flagging, canary deployments, and rollback strategies.',
    sample_answer: "I advocate for calculated, mitigated risks. When upgrading our core framework version, we deployed the changes behind feature flags to a 5% canary cohort first, monitoring error budgets before rolling out to 100% production traffic.",
    expert_tip: "Always pair risk-taking with safety nets (rollbacks, observability, feature flags).",
    red_flag_trap: "Admitting to deploying untested code directly to main production.",
    scoring_criteria: "Risk management, engineering rigor, and deployment safety.",
    is_free: false
  },
  {
    id: 22,
    category: 'Modules 21 - 30',
    title: '#22 — "Time Management & Prioritization Techniques"',
    question: 'How do you manage competing deadlines and urgent production bugs?',
    summary: 'Use prioritization frameworks (Eisenhower Matrix, P0-P3 severity triage).',
    sample_answer: "I triage tasks based on urgency and business impact. P0 production security/outage issues take immediate priority. For sprint tasks, I break work into small deliverable PRs, blocking out focus time for deep complex architecture logic.",
    expert_tip: "Mention communication: inform stakeholders immediately if a scope change impacts deadline.",
    red_flag_trap: "Silently missing deadlines without informing project leads.",
    scoring_criteria: "Prioritization logic, execution discipline, and stakeholder communication.",
    is_free: false
  },
  {
    id: 23,
    category: 'Modules 21 - 30',
    title: '#23 — "Resolving Conflicts with Work Colleagues"',
    question: 'How do you handle technical disagreements on system design?',
    summary: 'Use data, benchmarks, and prototype testing to resolve engineering deadlocks objectively.',
    sample_answer: "When a colleague and I disagreed on whether to use GraphQL or REST for a new service, I proposed building a quick 1-day benchmark prototype. We evaluated payload size, client latency, and caching complexity together, selecting GraphQL based on empirical evidence.",
    expert_tip: "Follow the principle: 'Disagree and Commit' once a decision is finalized.",
    red_flag_trap: "Escalating trivial disputes immediately to management without peer dialogue.",
    scoring_criteria: "Conflict resolution, data-driven reasoning, and team harmony.",
    is_free: false
  },
  {
    id: 24,
    category: 'Modules 21 - 30',
    title: '#24 — "Handling Bullying or Harassment in the Workplace"',
    question: 'How do you respond to toxic behavior or ethical violations?',
    summary: 'Demonstrate professional integrity, adherence to workplace policies, and HR escalation channels.',
    sample_answer: "I maintain a zero-tolerance stance on harassment. If I witness toxic behavior, I first address it directly and professionally if appropriate, while documenting incidents and escalating through established HR and management compliance channels.",
    expert_tip: "Emphasize psychological safety and ethical workplace culture.",
    red_flag_trap: "Bystander indifference or participating in workplace gossip.",
    scoring_criteria: "Ethical alignment, courage, and professional conduct.",
    is_free: false
  },
  {
    id: 25,
    category: 'Modules 21 - 30',
    title: '#25 — "How Long Do You Plan to Stay with Our Company?"',
    question: 'How to demonstrate long-term commitment without over-promising?',
    summary: 'Express intention to stay as long as there is mutual value, continuous challenge, and growth.',
    sample_answer: "I am looking for a long-term engineering home where I can build deep system expertise. As long as I am continuously challenged, contributing value to key product milestones, and growing professionally, I see myself staying for many years.",
    expert_tip: "Frame longevity around impact milestones rather than static timelines.",
    red_flag_trap: "Stating you plan to leave after 1 year to pursue higher CTC.",
    scoring_criteria: "Retention probability and career stability.",
    is_free: false
  },
  {
    id: 26,
    category: 'Modules 21 - 30',
    title: '#26 — "Have You Ever Held a Position That Wasn\'t Right for You?"',
    question: 'How to turn a past mismatch into a learning experience?',
    summary: 'Explain role misalignment objectively while highlighting key skills acquired.',
    sample_answer: "In a previous role focused purely on legacy maintenance, I realized I thrive best when driving new feature velocity and scalable cloud design. While I fulfilled my commitments diligently, it helped me identify that product-driven engineering environments are where I create maximum impact.",
    expert_tip: "Focus on what the experience taught you about your optimal working conditions.",
    red_flag_trap: "Blaming company culture or colleagues for the mismatch.",
    scoring_criteria: "Maturity, self-knowledge, and constructive reflection.",
    is_free: false
  },
  {
    id: 27,
    category: 'Modules 21 - 30',
    title: '#27 — "Why Should We Give You the Job?" (The Value Proposition)',
    question: 'How to deliver a compelling elevator closing pitch?',
    summary: 'Summarize your unique combination of domain skills, proven metric track record, and cultural drive.',
    sample_answer: "You should hire me because I bring a proven track record of optimizing high-throughput distributed systems, a deep alignment with your Zero Trust product strategy, and a habit of shipping clean, well-tested code that reduces team tech debt from day one.",
    expert_tip: "Synthesize 3 distinct bullet points: Skill + Track Record + Culture Fit.",
    red_flag_trap: "Repeating your entire resume or giving generic answers.",
    scoring_criteria: "Conviction, pitch clarity, and value proposition.",
    is_free: false
  },
  {
    id: 28,
    category: 'Modules 21 - 30',
    title: '#28 — "Tell Me Why I Shouldn\'t Hire Other Candidates?"',
    question: 'How to answer competitive comparison questions respectfully?',
    summary: 'Focus exclusively on your own positive differentiators without diminishing others.',
    sample_answer: "While I cannot speak for other candidates, I can guarantee what I bring: deep hands-on expertise in API performance tuning, a relentless work ethic, and a commitment to taking complete end-to-end ownership of product modules.",
    expert_tip: "Never criticize competitors or other candidates.",
    red_flag_trap: "Spewing negative assumptions about other applicants.",
    scoring_criteria: "Confidence, professionalism, and high integrity.",
    is_free: false
  },
  {
    id: 29,
    category: 'Modules 21 - 30',
    title: '#29 — "Qualities of a Great Manager/Leader"',
    question: 'What management style enables you to perform at your best?',
    summary: 'Describe effective leadership characteristics: clear vision, empowerment, feedback, and unblocking.',
    sample_answer: "A great leader provides clear strategic direction, empowers developers with autonomy, fosters psychological safety for innovation, and actively works to unblock operational friction so the team can ship high-quality work.",
    expert_tip: "Highlight mutual accountability and open feedback loops.",
    red_flag_trap: "Demanding micromanagement or refusing any managerial oversight.",
    scoring_criteria: "Leadership maturity and team operational awareness.",
    is_free: false
  },
  {
    id: 30,
    category: 'Modules 21 - 30',
    title: '#30 — "Can You Tell Us About Working Under High Pressure?"',
    question: 'How do you perform during production incidents or tight deadlines?',
    summary: 'Detail incident response protocols, calm focus, structured troubleshooting, and post-mortems.',
    sample_answer: "During a major black friday traffic surge, our payment webhook service experienced gateway timeouts. I remained calm, established an incident bridge, enabled fallback queue processing, and mitigated 100% of stuck transactions within 25 minutes, followed by a blameless post-mortem.",
    expert_tip: "Demonstrate emotional stability and methodical triage under stress.",
    red_flag_trap: "Panic, blame shifting, or shutting down during crises.",
    scoring_criteria: "Composure, incident response discipline, and resilience.",
    is_free: false
  },

  // Modules 31 - 40
  {
    id: 31,
    category: 'Modules 31 - 40',
    title: '#31 — "Greatest Achievements to Date"',
    question: 'How to highlight your top professional milestone?',
    summary: 'Select a project where your individual contribution led to huge business or technical impact.',
    sample_answer: "My greatest achievement was architecting our real-time notification engine from scratch. It scaled to process 10M daily push events with 99.99% reliability, cutting infrastructure server costs by $45,000 annually.",
    expert_tip: "Highlight both business ROI ($ saved/earned) and engineering technical success.",
    red_flag_trap: "Picking an academic award from years ago instead of professional engineering impact.",
    scoring_criteria: "Impact scale, technical ambition, and business value.",
    is_free: false
  },
  {
    id: 32,
    category: 'Modules 31 - 40',
    title: '#32 — "Team Project Goal Accomplishment"',
    question: 'How do you contribute to a successful sprint release?',
    summary: 'Show active collaboration, cross-pairing, and commitment to overall team sprint commitments.',
    sample_answer: "During our v2 platform migration, I took ownership of core auth middleware while actively pairing with junior devs to unblock their UI integration tasks. We shipped 2 days ahead of schedule with zero critical bugs.",
    expert_tip: "Highlight how helping teammates elevated the collective output.",
    red_flag_trap: "Claiming full solo credit for a multi-developer team release.",
    scoring_criteria: "Team player mindset and collaborative execution.",
    is_free: false
  },
  {
    id: 33,
    category: 'Modules 31 - 40',
    title: '#33 — "Completing a Difficult Project Under Constraints"',
    question: 'How do you handle resource constraints or tight budgets?',
    summary: 'Demonstrate resourcefulness, scope prioritization, and creative technical solutions.',
    sample_answer: "When tasked with building a global asset CDN under a strict budget constraint, I leveraged open-source reverse proxies combined with edge caching rules, delivering 95% latency reduction at 1/5th the commercial vendor cost.",
    expert_tip: "Focus on creative trade-offs and pragmatic execution.",
    red_flag_trap: "Complaining that constraints made the project impossible.",
    scoring_criteria: "Resourcefulness, problem-solving, and financial efficiency.",
    is_free: false
  },
  {
    id: 34,
    category: 'Modules 31 - 40',
    title: '#34 — "Attendance & Sickness Record Philosophy"',
    question: 'How do you view reliability and work commitment?',
    summary: 'Emphasize strong attendance record, reliability, and proactive communication when absent.',
    sample_answer: "I pride myself on exemplary reliability and attendance. In the rare event of illness, I communicate early with my team lead, ensure ongoing PRs are documented, and delegate urgent blockers so sprint velocity remains unaffected.",
    expert_tip: "Show accountability to team commitments.",
    red_flag_trap: "Casual attitude towards unexcused absences.",
    scoring_criteria: "Reliability and professional responsibility.",
    is_free: false
  },
  {
    id: 35,
    category: 'Modules 31 - 40',
    title: '#35 — "Can You Tell Us About a Situation Where You Demonstrated Leadership?"',
    question: 'How do you lead without formal managerial authority?',
    summary: 'Demonstrate thought leadership, technical guidance, initiative, and mentoring.',
    sample_answer: "When our codebase accumulated technical debt in API test coverage, I organized a weekly 'Quality Guild', established RFC guidelines for integration testing, and mentored 4 team members. Test coverage increased from 40% to 85% within two quarters.",
    expert_tip: "Leadership is influence and initiative, not a title.",
    red_flag_trap: "Equating leadership to bossing colleagues around.",
    scoring_criteria: "Thought leadership, mentorship, and cultural influence.",
    is_free: false
  },
  {
    id: 36,
    category: 'Modules 31 - 40',
    title: '#36 — "What Are the Mission & Aims of This Company?"',
    question: 'How to prove you understand the company strategy?',
    summary: 'Demonstrate alignment with company long-term vision and market strategy.',
    sample_answer: "Your mission is to democratize enterprise security for organizations globally. By replacing complex legacy hardware with cloud-native Zero Trust proxies, you enable seamless, secure hybrid work while reducing attack surfaces.",
    expert_tip: "Connect your specific engineering function to this overall mission.",
    red_flag_trap: "Failing to state what problem the company actually solves.",
    scoring_criteria: "Mission alignment and strategic clarity.",
    is_free: false
  },
  {
    id: 37,
    category: 'Modules 31 - 40',
    title: '#37 — "Best Example of Customer Service Delivered"',
    question: 'How do developers exhibit customer empathy?',
    summary: 'Show developer-to-customer empathy, resolving user pain points through technical fixes.',
    sample_answer: "When an enterprise client reported intermittent webhook drops during peak sales, I personally investigated their payload logs, diagnosed a race condition in our queue worker, and patched it within 6 hours, restoring client trust.",
    expert_tip: "Remember that end users or internal API consumers are your customers.",
    red_flag_trap: "Treating customer issues as 'not an engineering problem'.",
    scoring_criteria: "Customer orientation, empathy, and responsiveness.",
    is_free: false
  },
  {
    id: 38,
    category: 'Modules 31 - 40',
    title: '#38 — "What Didn\'t You Like About Your Last Job?"',
    question: 'How to handle negative reflection questions professionally?',
    summary: 'Frame minor dislikes around desire for higher technical challenge or faster release cadence.',
    sample_answer: "While I enjoyed my team, the manual deployment release cycle often took weeks due to legacy bureaucracy. I prefer modern DevOps pipelines with automated CI/CD where code can be tested and shipped to users continuously.",
    expert_tip: "Pivot immediately from process limitations to your preference for modern engineering standards.",
    red_flag_trap: "Attacking former managers or company culture.",
    scoring_criteria: "Diplomacy, professional standards, and constructive framing.",
    is_free: false
  },
  {
    id: 39,
    category: 'Modules 31 - 40',
    title: '#39 — "Why Are There Gaps in Your Employment?"',
    question: 'How to explain employment gaps productively?',
    summary: 'Explain career breaks positively by highlighting upskilling, certifications, or personal projects.',
    sample_answer: "During my 4-month career break, I dedicated time to intensive self-directed upskilling in distributed systems design, earned cloud architecture certifications, and built open-source tools to sharpen my full-stack expertise.",
    expert_tip: "Show that the gap was used intentionally for personal or technical growth.",
    red_flag_trap: "Being defensive or vague about the timeline.",
    scoring_criteria: "Honesty, continuous learning, and self-direction.",
    is_free: false
  },
  {
    id: 40,
    category: 'Modules 31 - 40',
    title: '#40 — "How Would You Deal With Underperforming Team Members?"',
    question: 'How do you handle team members falling behind on sprint tasks?',
    summary: 'Offer supportive pairing, clear goal resetting, and constructive feedback before escalation.',
    sample_answer: "I approach underperformance with empathy and support. I would first schedule a private check-in to understand if they face technical blockers or unclear specifications, offer pair programming support, and help break down tasks into manageable sub-goals.",
    expert_tip: "Focus on unblocking and coaching before managerial escalation.",
    red_flag_trap: "Publicly criticizing or ignoring struggling teammates.",
    scoring_criteria: "Empathy, leadership maturity, and team-first orientation.",
    is_free: false
  },

  // Modules 41 - 50
  {
    id: 41,
    category: 'Modules 41 - 50',
    title: '#41 — "What Do You Dislike Doing in a Work Environment?"',
    question: 'How to state work preferences productively?',
    summary: 'Express preference against unorganized workflows, lack of documentation, or siloed communication.',
    sample_answer: "I dislike working without clear architectural specifications or written ticket requirements, as it leads to wasted rework. I thrive when team goals are documented, tickets are clear, and technical decisions are transparent.",
    expert_tip: "Frame your dislike as a preference for high engineering standards.",
    red_flag_trap: "Saying 'I dislike writing unit tests' or 'I hate team meetings.'",
    scoring_criteria: "Engineering standards, workflow discipline, and communication.",
    is_free: false
  },
  {
    id: 42,
    category: 'Modules 41 - 50',
    title: '#42 — "Why Move On After Only 6 Months?"',
    question: 'How to justify a short tenure on your resume?',
    summary: 'Explain unexpected role scope changes or structural company shifts objectively.',
    sample_answer: "Following a company restructuring, the project scope shifted from core backend cloud engineering to legacy internal maintenance. I am seeking a position aligned with my core skills in scalable cloud architecture.",
    expert_tip: "Be concise, honest, and emphasize long-term stability in your next role.",
    red_flag_trap: "Blaming management or job hopping compulsively.",
    scoring_criteria: "Reasoning validity, honesty, and career alignment.",
    is_free: false
  },
  {
    id: 43,
    category: 'Modules 41 - 50',
    title: '#43 — "Addressing \'Overqualified for This Job\' Objections"',
    question: 'How to respond when an interviewer thinks you are overqualified?',
    summary: 'Frame advanced experience as an asset that allows fast onboarding and low risk.',
    sample_answer: "My deep experience means I can hit the ground running immediately with minimal onboarding cost, mentor team members, and handle complex edge cases reliably from week one.",
    expert_tip: "Emphasize your passion for the day-to-day work itself.",
    red_flag_trap: "Sounding arrogant or implying the job is beneath your skill level.",
    scoring_criteria: "Humility, enthusiasm, and onboarding readiness.",
    is_free: false
  },
  {
    id: 44,
    category: 'Modules 41 - 50',
    title: '#44 — "Can You Run a Meeting, and How Would You Do It?"',
    question: 'How do you lead productive engineering syncs?',
    summary: 'Outline meeting preparation: clear agenda, timeboxing, active facilitation, and action item notes.',
    sample_answer: "I run effective meetings by sending an agenda beforehand, timeboxing topics, ensuring all attendees voice their technical inputs, and ending with documented action items assigned to clear owners.",
    expert_tip: "Always mention action items and written follow-ups.",
    red_flag_trap: "Running unstructured, endless meetings without clear outcome owners.",
    scoring_criteria: "Facilitation skills, time management, and execution discipline.",
    is_free: false
  },
  {
    id: 45,
    category: 'Modules 41 - 50',
    title: '#45 — "What Has Been Your Biggest Failure to Date?"',
    question: 'How to discuss technical mistakes constructively?',
    summary: 'Share a real incident, take 100% personal responsibility, and detail system safeguards added post-incident.',
    sample_answer: "Early in my career, I pushed a database migration script that missed an index, causing slow queries on 5% of requests. I owned the issue immediately, rolled back, added the index, and introduced automated query performance checks in CI/CD so the error could never recur.",
    expert_tip: "The key is ownership and systemic prevention.",
    red_flag_trap: "Claiming you have never made a mistake or blaming junior team members.",
    scoring_criteria: "Accountability, learning agility, and systemic improvement.",
    is_free: false
  },
  {
    id: 46,
    category: 'Modules 41 - 50',
    title: '#46 — "Are You Willing to Relocate or Travel?"',
    question: 'How to address mobility requirements during hiring?',
    summary: 'State clear readiness aligned with job expectations and personal flexibility.',
    sample_answer: "Yes, I am fully open to relocating for the right opportunity. I am excited by your office hub in Bangalore/Gurgaon and can transition smoothly within standard notice timelines.",
    expert_tip: "Be straightforward about timelines and logistical requirements.",
    red_flag_trap: "Hesitating or giving vague conflicting answers about availability.",
    scoring_criteria: "Flexibility and operational readiness.",
    is_free: false
  },
  {
    id: 47,
    category: 'Modules 41 - 50',
    title: '#47 — "What Are Your Salary Expectations?" (Negotiation Framework)',
    question: 'How to discuss compensation professionally without underselling?',
    summary: 'Use market research benchmarking, state expected CTC ranges, and anchor to total value.',
    sample_answer: "Based on industry benchmarks for Senior Systems Engineers in tier-1 tech companies with my track record, I am targeting a range of ₹24 LPA to ₹32 LPA total compensation, but I am open to discussing the complete package details.",
    expert_tip: "Anchor your range based on verified market data and emphasize total rewards.",
    red_flag_trap: "Demanding unrealistic figures without market justification or refusing to give any range.",
    scoring_criteria: "Commercial awareness, professional negotiation, and market knowledge.",
    is_free: false
  },
  {
    id: 48,
    category: 'Modules 41 - 50',
    title: '#48 — "Do You Have Any Questions for the Panel?"',
    question: 'What are the top smart questions candidates should ask at the end?',
    summary: 'Ask high-signal questions about team architecture challenges, success metrics, and growth plans.',
    sample_answer: "Yes! 1) What is the single biggest technical challenge your team faces in the next 6 months? 2) How do you measure success for someone in this role during their first 90 days? 3) What does the technical growth path look like for senior engineers?",
    expert_tip: "Never say 'No, you answered everything.' Smart questions leave a lasting impression.",
    red_flag_trap: "Asking basic questions easily answered on the website or asking about vacation days first.",
    scoring_criteria: "Curiosity, strategic thinking, and engagement.",
    is_free: false
  },
  {
    id: 49,
    category: 'Modules 41 - 50',
    title: '#49 — "What to Say at the End of Your Interview (The Closing Pitch)"',
    question: 'How to close the interview on a high note?',
    summary: 'Reiterate enthusiasm, summarize key value match, and ask about next steps.',
    sample_answer: "Thank you for your time today! This discussion confirmed how exciting your Zero Trust scaling plans are. I am confident my background in distributed systems and performance optimization will add immediate value. What are the next steps in your timeline?",
    expert_tip: "Express clear enthusiasm and ask for the timeline timeline.",
    red_flag_trap: "Ending passively or abruptly without reaffirming interest.",
    scoring_criteria: "Closing impact, enthusiasm, and professional follow-up.",
    is_free: false
  },
  {
    id: 50,
    category: 'Modules 41 - 50',
    title: '#50 — End of Interview Thank You Letter Template & Follow-Up Protocol',
    question: 'How to write a high-converting post-interview thank you email?',
    summary: 'Send a personalized thank-you note within 24 hours referencing specific conversation points.',
    sample_answer: "Subject: Thank You - Senior Systems Engineer Interview - [Your Name]\n\nDear [Interviewer Name],\n\nThank you for taking the time to speak with me today regarding the Senior Systems Engineer position. I loved learning about your team's migration to Zero Trust architecture.\n\nOur conversation reinforced my strong interest in joining your team. I look forward to hearing about the next steps.\n\nBest regards,\n[Your Name]",
    expert_tip: "Reference one specific technical insight mentioned during the call.",
    red_flag_trap: "Sending generic copy-pasted templates or waiting 4+ days to follow up.",
    scoring_criteria: "Professional etiquette, written communication, and follow-through.",
    is_free: false
  }
];

// GET /api/interview-course/modules — Retrieve all 50 masterclass modules
interviewCourseRouter.get('/modules', (req: Request, res: Response) => {
  res.json({
    success: true,
    total_modules: INTERVIEW_MODULES.length,
    data: INTERVIEW_MODULES
  });
});

// GET /api/interview-course/progress/:userId — Fetch user completed modules & XP (own or admin)
interviewCourseRouter.get('/progress/:userId', optionalAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const userId = req.params.userId;

  if (req.user?.id !== userId && req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'You can only view your own progress' });
  }

  if (!db.interview_progress) {
    db.interview_progress = {};
  }

  const userProgress = db.interview_progress[userId] || {
    completed_module_ids: [],
    total_xp: 0,
    certificate_issued: false,
    updated_at: new Date().toISOString()
  };

  res.json({
    success: true,
    user_id: userId,
    progress: userProgress,
    percentage: Math.round((userProgress.completed_module_ids.length / 50) * 100)
  });
});

// POST /api/interview-course/progress — Toggle module completion & update XP
// Identity comes from the Bearer token — no anonymous progress, no spoofable user_id.
interviewCourseRouter.post('/progress', requireAuth, (req: Request, res: Response) => {
  const { module_id } = req.body;
  const user_id = req.user!.id;

  if (!module_id || typeof module_id !== 'number') {
    return res.status(400).json({ success: false, error: 'Valid numeric module_id required' });
  }

  const db = loadDb();
  if (!db.interview_progress) {
    db.interview_progress = {};
  }

  let userProgress = db.interview_progress[user_id] || {
    completed_module_ids: [],
    total_xp: 0,
    certificate_issued: false,
    updated_at: new Date().toISOString()
  };

  const isCompleted = userProgress.completed_module_ids.includes(module_id);
  const MODULE_XP = 50;
  if (isCompleted) {
    userProgress.completed_module_ids = userProgress.completed_module_ids.filter((id: number) => id !== module_id);
    userProgress.total_xp = Math.max(0, userProgress.total_xp - MODULE_XP);
  } else {
    userProgress.completed_module_ids.push(module_id);
    userProgress.total_xp += MODULE_XP;
  }

  userProgress.updated_at = new Date().toISOString();
  db.interview_progress[user_id] = userProgress;

  // Sync real account XP/streak (leaderboard + /account isi se padhte hain)
  const account = (db.users || []).find((u: any) => u.id === user_id && u.role === 'user' && !u.disabled);
  if (account) {
    if (isCompleted) {
      account.xp = Math.max(0, (Number(account.xp) || 0) - MODULE_XP);
      account.streak = Math.max(0, (Number(account.streak) || 0) - 1);
    } else {
      account.xp = (Number(account.xp) || 0) + MODULE_XP;
      account.streak = (Number(account.streak) || 0) + 1;
    }
  }

  saveDb(db);

  res.json({
    success: true,
    message: isCompleted ? 'Module unchecked' : 'Module completed! +50 XP',
    progress: userProgress,
    percentage: Math.round((userProgress.completed_module_ids.length / 50) * 100)
  });
});

// POST /api/interview-course/certificate — Generate Certificate Metadata (honest eligibility gate)
interviewCourseRouter.post('/certificate', requireAuth, (req: Request, res: Response) => {
  const candidate_name = (req.body.candidate_name || req.user!.name || 'Candidate').toString();
  const user_id = req.user!.id;
  const db = loadDb();

  const userProgress = (db.interview_progress && db.interview_progress[user_id]) || {
    completed_module_ids: [],
    total_xp: 0,
    certificate_issued: false,
    updated_at: new Date().toISOString()
  };

  const COMPLETION_THRESHOLD = 50;
  const completed = userProgress.completed_module_ids.length;
  const eligible = completed >= COMPLETION_THRESHOLD;

  const certificateData = {
    certificate_id: eligible ? `TIEEDU-CERT-${Math.floor(100000 + Math.random() * 900000)}` : null,
    candidate_name,
    course_name: '50-Module Masterclass: Free Online Interview Skills & STAR Mastery',
    completion_date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    total_modules_completed: completed,
    modules_required: COMPLETION_THRESHOLD,
    issuer: 'TiEedu Placement Intelligence Authority',
    verification_url: `https://tieedu.com/verify-cert/${user_id}`,
    status: eligible ? 'ACTIVE_VALIDATED' : 'IN_PROGRESS'
  };

  res.json({
    success: true,
    data: certificateData
  });
});
