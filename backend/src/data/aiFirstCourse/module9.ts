// AI.FIRST — Module 9 · BUILD · Agents, tools & MCP
import type { CourseModule } from '../db';
import { nineBlocks, diagram, table, tip, warn, code } from '../nineBlocks';
import { lesson, proofOfWork, M, COURSE_ID } from './helpers';

const ID = M(9);

export const module9: CourseModule = {
  id: ID,
  course_id: COURSE_ID,
  title: 'Module 9 — Agents, Tools & MCP',
  summary:
    'Pillar BUILD, advanced. What an agent really is, the Model Context Protocol for connecting tools, working with coding agents responsibly, and guardrails plus evaluation for systems that act.',
  sort_order: 9,
  lessons: [
    lesson(
      ID,
      'aif-m9-1',
      1,
      'What an Agent Is: Loop, Tools, Memory, Stop Conditions',
      'Strip away the hype: an agent is a model choosing actions in a loop. Build the loop, see where it breaks, and learn when not to use one.',
      44,
      nineBlocks({
        objectives: [
          'Describe the agent loop: goal, plan, act with tools, observe, repeat, stop',
          'Distinguish workflows (fixed steps) from agents (model-chosen steps)',
          'Design stop conditions, memory and state for a simple agent',
        ],
        hook:
          'Two teams automate the same job: "research a company before each placement drive and write a one-page brief". Team A builds a fixed workflow: search news → fetch the company\'s careers page → summarise → format. Team B builds an agent that decides for itself what to search and read. Team A\'s version is cheaper, faster and right 90% of the time. Team B\'s handles odd cases brilliantly — and once spent ₹900 and 40 minutes reading a 300-page annual report for a 20-person start-up. Knowing which one you need is the first agent skill.',
        concept: `**The agent loop**
1. **Goal** — a task with a clear definition of done.
2. **Think/plan** — the model decides the next action (or a short plan).
3. **Act** — it calls a tool: search, read a page, run code, query a database, edit a file, call an API.
4. **Observe** — the tool result goes back into the context.
5. **Repeat** until the goal is met — or a **stop condition** fires.

That is the whole idea (often called ReAct: reason + act). What makes it powerful is that the model chooses the steps; what makes it risky is exactly the same thing.

**Workflow or agent?** (A distinction popularised in agent-engineering guidance.)
- **Workflow**: *you* define the steps; the model fills in parts (extract, draft). Predictable, cheap, testable. Use whenever the path is known.
- **Agent**: *the model* chooses the steps. Use when the path genuinely varies by case and the value of flexibility exceeds the cost of unpredictability.
Many good systems are **mostly workflow with a small agentic part**.

**Stop conditions** (always several)
- Goal achieved, verified by a check (tests pass, required fields filled).
- **Step limit** (for example 15 tool calls) and **budget limit** (tokens/₹).
- **Time limit**.
- **Stuck detection** — same action repeated, no progress.
- **Human hand-off** — ambiguity or a consequential action needs approval.

**Memory and state**
- **Working memory** — the context window: goal, plan, recent observations. Long runs need **summarising** old observations to stay within limits.
- **Scratchpad / state** — a structured record the agent updates (todo list, findings so far, sources).
- **Long-term memory** — saved facts across runs (preferences, past results), stored deliberately and reviewed for privacy.

**Typical failure modes**: looping, wandering off-goal, over-reading, false "done" claims, compounding an early error, and being steered by text inside tool results (prompt injection — Lesson 9.4 and Module 11).`,
        extras: [
          diagram(
            'The agent loop with stop conditions',
            `flowchart TD
  G["Goal + definition of done"] --> P["Model: choose next action"]
  P --> A["Call a tool"]
  A --> O["Observe result → add to context / state"]
  O --> C{"Stop?"}
  C -->|"goal verified"| DONE["Report with evidence"]
  C -->|"step / budget / time limit"| HALT["Stop + partial report"]
  C -->|"stuck or ambiguous"| HUMAN["Ask a human"]
  C -->|"continue"| P`
          ),
          table('Workflow vs agent', ['Question', 'Workflow', 'Agent'], [
            ['Who chooses the steps?', 'You', 'The model'],
            ['Cost & latency', 'Predictable, low', 'Variable, higher'],
            ['Handles unusual cases', 'Poorly', 'Well'],
            ['Testing', 'Straightforward', 'Needs trajectory evaluation'],
            ['Best for', 'Known, repeatable paths', 'Open-ended, varied tasks'],
          ]),
          code(
            `# A minimal agent loop skeleton (provider-agnostic pseudocode in Python)
MAX_STEPS, BUDGET_TOKENS = 12, 60_000
state = {"goal": goal, "findings": [], "sources": [], "steps": 0, "tokens": 0}

while True:
    if state["steps"] >= MAX_STEPS or state["tokens"] >= BUDGET_TOKENS:
        report = summarise(state, partial=True); break
    action = model_choose_action(state)            # returns a tool call or "finish"
    state["steps"] += 1
    if action.name == "finish":
        if verify(state):                          # e.g. required fields present, sources cited
            report = summarise(state); break
        state["findings"].append("Verification failed: " + missing_items(state))
        continue
    if action.name in NEEDS_APPROVAL and not human_approves(action):
        state["findings"].append(f"Human declined {action.name}"); continue
    result = run_tool(action)                      # validated, sandboxed, logged
    state["tokens"] += result.tokens
    state["findings"].append(result.summary)       # store summaries, not whole pages`,
            'agent_loop.py',
            'python'
          ),
        ],
        worked: {
          title: 'Fix the ₹900 company brief',
          problem:
            'Redesign Team B\'s research agent so it keeps its flexibility but never repeats the 40-minute, ₹900 run.',
          steps: [
            { title: 'Workflow skeleton', desc: 'Fixed first steps: search news (top 5), fetch the careers page and the "About" page. Most briefs need nothing more.' },
            { title: 'Agentic part only when needed', desc: 'If required fields (size, products, recent news, hiring roles) are still missing, let the agent take up to 6 more tool calls.' },
            { title: 'Limits', desc: 'Max 10 tool calls, 40,000 tokens, 5 minutes; never read documents over 30 pages — search inside them instead.' },
            { title: 'Verification', desc: 'Done only when every field is filled or marked "not found" and each fact has a source URL.' },
          ],
          solution:
            'A workflow core with a bounded agentic extension: typical cost falls back near Team A\'s, unusual companies still get handled, and runaway runs become impossible.',
        },
        practice: {
          title: 'Workflow or agent?',
          prompt:
            'For five tasks from your life or work, decide workflow, agent, or workflow-with-agentic-step. For the one agent you choose, write its goal, definition of done, tool list, four stop conditions and what it stores in state.',
          hint: 'If you can write the steps down in advance for 90% of cases, start with a workflow.',
        },
        mistakes: [
          {
            mistake: 'Building an agent when a workflow would do',
            fix: 'Default to workflows; add agentic flexibility only where cases truly vary.',
          },
          {
            mistake: 'Only one stop condition ("when the model says done")',
            fix: 'Add verified-done checks plus step, budget, time and stuck limits.',
          },
          {
            mistake: 'Stuffing whole tool outputs into context',
            fix: 'Summarise observations into state; keep the context focused.',
          },
        ],
        exam: {
          question: 'What is an AI agent, and when would you not use one?',
          answer:
            'An agent is a system where a model works in a loop — choosing an action, using a tool, observing the result and deciding the next step — until a goal is verified or a limit is reached. I would not use one when the steps are known in advance; a fixed workflow is cheaper, faster, more predictable and easier to test. Agents earn their cost on open-ended tasks where the path varies, and even then need multiple stop conditions, limited permissions and human approval for consequential actions.',
          source: 'Standard in 2025–2026 AI-engineering interviews.',
        },
        summary: [
          'Agent = goal → choose action → tool → observe → repeat → stop.',
          'Workflows when the path is known; agents when it varies.',
          'Several stop conditions: verified done, steps, budget, time, stuck, human.',
          'Keep state summarised; watch for loops, false "done" and injection.',
        ],
      }),
      [
        ['The core loop of an agent is:', ['Train → test → deploy', 'Choose action → use tool → observe → repeat until stop', 'Prompt → print', 'Search → buy'], 1, 'Reason, act, observe.'],
        ['When the steps of a task are known in advance, you should usually prefer:', ['An autonomous agent', 'A fixed workflow', 'No automation', 'A bigger model'], 1, 'Workflows are cheaper and more predictable.'],
        ['Which is NOT a good stop condition?', ['A step limit', 'A budget limit', 'Only "the model says it is done"', 'Stuck detection'], 2, 'Model claims must be verified; add hard limits.'],
        ['Why summarise tool observations into state?', ['To hide them', 'To keep context within limits and focused on the goal', 'To make the agent slower', 'Because tools require it'], 1, 'Long raw outputs crowd the context.'],
      ]
    ),
    lesson(
      ID,
      'aif-m9-2',
      2,
      'MCP and Tool Integration',
      'The Model Context Protocol: hosts, clients and servers; tools, resources and prompts; connecting AI apps to real systems in a standard way — safely.',
      44,
      nineBlocks({
        objectives: [
          'Explain what problem the Model Context Protocol (MCP) solves',
          'Describe MCP\'s parts: host, client, server; tools, resources, prompts; transports',
          'Evaluate an MCP server for trust and permissions before connecting it',
        ],
        hook:
          'Before standard protocols, every AI app needed its own custom connector for Gmail, for GitHub, for the company database, for the calendar — and every tool maker had to build one for every AI app. Ten apps and ten tools meant a hundred integrations. The Model Context Protocol, introduced by Anthropic in late 2024 and since adopted across much of the industry, turns that into ten plus ten: build a tool server once, use it from any compatible AI app. It is to AI tools roughly what USB was to computer peripherals.',
        concept: `**What MCP is.** An open protocol that standardises how AI applications connect to external tools and data. Instead of hard-coding each integration, an AI app speaks MCP to any **MCP server**.

**The parts**
- **Host** — the AI application the user works in (a desktop assistant, an IDE, a coding agent, your own app).
- **Client** — the component inside the host that maintains a connection to one server.
- **Server** — a program that exposes capabilities for some system (files, a database, GitHub, a CRM, a calendar).

**What servers expose**
- **Tools** — actions the model can call, each with a name, description and input schema (exactly the function-calling idea from Module 8, standardised). Example: search_tickets, create_issue.
- **Resources** — data the app can read into context (files, records, documents).
- **Prompts** — reusable prompt templates offered by the server.

**Transports.** Local servers often run as a process on your machine talking over standard input/output; remote servers talk over HTTP (with streaming). Remote servers typically use OAuth-style authorisation so the user grants specific access.

**Why it matters**: tool makers build once; AI apps gain whole ecosystems of integrations; organisations can publish internal systems as MCP servers with consistent permissions and logging.

**Why it needs care**: an MCP server can read your data and take actions. Before connecting one:
- **Trust the source** — official servers from the vendor or well-maintained, reviewed open-source ones; avoid random unreviewed servers.
- **Least privilege** — grant read-only where possible; scope tokens to what is needed.
- **Review tool lists** — know every tool it exposes, especially ones that write, send or delete.
- **Keep confirmations on** for consequential actions.
- **Watch for injection** — data returned by tools (emails, web pages, tickets) can contain instructions aimed at the model (Module 11).`,
        extras: [
          diagram(
            'MCP architecture',
            `flowchart LR
  subgraph HOST["Host: AI app — assistant, IDE, coding agent"]
    M["Model"]
    C1["MCP client"]
    C2["MCP client"]
    C3["MCP client"]
  end
  C1 <-->|"stdio — local"| S1["MCP server: files"]
  C2 <-->|"HTTP + OAuth"| S2["MCP server: GitHub"]
  C3 <-->|"HTTP + OAuth"| S3["MCP server: company database"]
  S1 --> R1[("Your folders")]
  S2 --> R2[("Repos & issues")]
  S3 --> R3[("Read-only views")]
  M <--> C1
  M <--> C2
  M <--> C3`
          ),
          code(
            `# A tiny MCP server exposing one read-only tool, using the official Python SDK
# pip install "mcp[cli]"
from mcp.server.fastmcp import FastMCP
import csv

mcp = FastMCP("timetable")

@mcp.tool()
def classes_on(day: str) -> list[dict]:
    """Return this week's classes for a weekday (e.g. 'Monday'). Read-only."""
    with open("timetable.csv", encoding="utf-8") as f:
        return [row for row in csv.DictReader(f) if row["day"].lower() == day.lower()]

if __name__ == "__main__":
    mcp.run()          # stdio transport: a compatible host can now call classes_on`,
            'timetable_server.py',
            'python'
          ),
          table('Before connecting an MCP server', ['Check', 'Good sign', 'Red flag'], [
            ['Source', 'Official vendor or reviewed, maintained repo', 'Unknown author, no reviews'],
            ['Tools exposed', 'Clear list, read-only by default', 'Broad "run command" or "send anything" tools'],
            ['Auth', 'Scoped OAuth / limited token', 'Requires your master password or admin key'],
            ['Data flow', 'Documented, logged', 'Unclear where data goes'],
            ['Confirmations', 'Host asks before write actions', 'Auto-approve everything'],
          ]),
          warn(
            'A server is code you are trusting',
            'Installing an MCP server is like installing software with access to your accounts. Review it like any other software with that level of access.',
          ),
        ],
        worked: {
          title: 'Connect a placement-cell assistant safely',
          problem:
            'A placement office wants its staff AI assistant to read the drives spreadsheet and draft emails, using MCP. Design the connections and permissions.',
          steps: [
            { title: 'Servers', desc: 'A spreadsheet server (read-only scope on one sheet) and an email server limited to creating drafts.' },
            { title: 'Exclude', desc: 'No send-email tool, no access to the student-records database, no file-system server.' },
            { title: 'Confirmations', desc: 'Host configured to ask before any write action, even draft creation, during the first month.' },
            { title: 'Logging and review', desc: 'Tool calls logged; weekly review of a sample of drafts; tokens revocable from one admin page.' },
          ],
          solution:
            'Read-only data access and draft-only email give the assistant real usefulness with a small blast radius. Permissions, not prompts, are what keep the system safe.',
        },
        practice: {
          title: 'Audit your tool connections',
          prompt:
            'List every app or integration your AI tools can access (connected apps, plugins, MCP servers, browser extensions). For each, note what it can read and do, whether you still need it, and reduce permissions or disconnect at least one.',
          hint: 'Look in your assistant\'s settings for "connectors", "apps", "integrations" or "MCP".',
        },
        mistakes: [
          {
            mistake: 'Connecting unreviewed MCP servers because they look useful',
            fix: 'Prefer official or well-reviewed servers; read the tool list and permissions first.',
          },
          {
            mistake: 'Granting write or send access by default',
            fix: 'Start read-only; add write tools deliberately with confirmations.',
          },
        ],
        exam: {
          question: 'What is the Model Context Protocol and why does it matter?',
          answer:
            'MCP is an open protocol that standardises how AI applications connect to external tools and data. A host application uses MCP clients to talk to MCP servers, which expose tools the model can call, resources it can read and reusable prompts, over local or remote transports. It matters because a tool built once as an MCP server works with any compatible AI app, replacing many custom integrations — but because servers can read data and take actions, they need trust review, least-privilege permissions and confirmations.',
          source: 'Increasingly common in AI-engineering interviews since 2025.',
        },
        summary: [
          'MCP standardises AI-to-tool connections: host → client → server.',
          'Servers expose tools, resources and prompts over stdio or HTTP.',
          'Build once, use from any compatible app.',
          'Trust review, least privilege, confirmations, injection awareness.',
        ],
      }),
      [
        ['MCP primarily standardises:', ['Model training', 'How AI applications connect to external tools and data', 'Image formats', 'GPU drivers'], 1, 'A protocol for tool and data integration.'],
        ['In MCP, the program that exposes tools for a system such as GitHub is the:', ['Host', 'Server', 'Model', 'Tokenizer'], 1, 'Servers expose capabilities; hosts use them through clients.'],
        ['The safest default when connecting an MCP server to company data is:', ['Full admin access', 'Read-only, scoped access with confirmations for writes', 'Sharing your password', 'Auto-approve all tools'], 1, 'Least privilege.'],
        ['Which MCP capability is closest to function calling?', ['Resources', 'Tools', 'Transports', 'Hosts'], 1, 'Tools have names, descriptions and input schemas.'],
      ]
    ),
    lesson(
      ID,
      'aif-m9-3',
      3,
      'Coding Agents and AI Pair Programming Done Right',
      'Use AI coding assistants and agents to go faster without shipping code you do not understand: specs, small steps, tests, review and ownership.',
      44,
      nineBlocks({
        objectives: [
          'Use coding assistants for the right tasks: scaffolding, explanation, tests, refactors, debugging',
          'Run a spec → plan → small diffs → test → review workflow with coding agents',
          'Keep ownership: understand, test and be able to defend every line you ship',
        ],
        hook:
          'In a final-round interview, the panel asks a candidate to walk through the authentication code in his showcase project. He cannot — an AI agent wrote it in an afternoon and he never read it closely. Another candidate also used AI heavily, but explains every design choice, shows the tests she asked the agent to write first, and describes the bug she caught in its first attempt. Both used the same tools. Only one of them got faster without getting weaker.',
        concept: `**What coding assistants are good at (2026)**
- **Explaining** unfamiliar code, errors and libraries.
- **Scaffolding** boilerplate: project setup, forms, API clients, config.
- **Writing tests**, including edge cases you name.
- **Refactoring** with a clear goal ("extract this into a function, keep behaviour identical").
- **Debugging** with the error, the stack trace and the relevant code.
- **Agents** in the editor or terminal can read a repository, edit several files, run commands and tests, and iterate.

**Where they fail**: subtle logic in domain rules, security (authentication, input validation, secrets), performance at scale, outdated APIs, invented functions or packages, and changes that "fix" a test by weakening it.

**The workflow that keeps quality**
1. **Spec first** — write what the change must do, inputs/outputs, edge cases and constraints.
2. **Ask for a plan** — review it before code is written.
3. **Small diffs** — one focused change at a time; easier to review and revert.
4. **Tests first or alongside** — specify behaviour as tests; run them on every change.
5. **Review every diff** — read it like a colleague\'s pull request: logic, edge cases, security, naming.
6. **Commit in small steps** with clear messages; use version control so any step can be undone.

**Ownership rules**
- Never ship code you cannot explain line by line.
- Check suggested dependencies exist and are reputable (Module 5).
- Never paste secrets, private keys or confidential code into tools your organisation has not approved.
- Respect licences and your institution\'s or employer\'s AI policies; disclose AI assistance where required.

**Learning while using AI**: write the first version of core logic yourself when learning; ask the assistant to review and explain alternatives. Use it to go further, not to skip understanding.`,
        extras: [
          diagram(
            'Spec-driven AI coding workflow',
            `flowchart LR
  S["Spec: behaviour, edge cases, constraints"] --> PL["Agent proposes plan"]
  PL --> RV1{"Plan OK?"}
  RV1 -->|"no"| S
  RV1 -->|"yes"| T["Tests written first"]
  T --> D["Small diff"]
  D --> RUN["Run tests + lint"]
  RUN -->|"fail"| D
  RUN -->|"pass"| RV2["You review the diff line by line"]
  RV2 --> CM["Commit"]
  CM --> NEXT["Next small step"]`
          ),
          table('Good and bad uses', ['Use', 'Verdict', 'Why'], [
            ['"Explain this regex and give 5 test strings"', 'Great', 'Learning + verification'],
            ['"Write tests for these 6 edge cases"', 'Great', 'Specifies behaviour'],
            ['"Build my whole app" in one prompt', 'Poor', 'Unreviewable, fragile'],
            ['"Make the failing test pass" without review', 'Risky', 'May weaken or delete the test'],
            ['Pasting production secrets into a chat', 'Never', 'Security and policy breach'],
          ]),
          tip(
            'Read the diff, not the summary',
            'Agents write confident summaries of their own changes. The diff is the truth — read it.',
          ),
        ],
        worked: {
          title: 'Add a feature with a coding agent',
          problem:
            'Add "export attendance as CSV" to a small Flask app using a coding agent, without losing control of quality.',
          steps: [
            { title: 'Spec', desc: 'Route /export?month=YYYY-MM; columns roll_no, name, present_days, total_days, percent (1 decimal); admin-only; 404 for months with no data; filename attendance-YYYY-MM.csv.' },
            { title: 'Plan', desc: 'Agent proposes: query function, route, auth check, CSV writer, tests. You notice it forgot the admin check — fix the plan.' },
            { title: 'Tests first', desc: 'Tests for: correct CSV content, percent rounding, non-admin gets 403, empty month gets 404, invalid month format gets 400.' },
            { title: 'Implement and review', desc: 'Agent implements; tests pass. In review you spot the month is inserted into SQL with string formatting — ask for a parameterised query; re-run tests.' },
            { title: 'Commit', desc: 'Commit with a clear message; you can explain every line in a code review.' },
          ],
          solution:
            'The agent did most of the typing. The spec caught the missing admin check, the tests pinned behaviour, and the review caught a SQL-injection risk. That is AI-assisted engineering done right.',
        },
        practice: {
          title: 'Spec-driven change',
          prompt:
            'In one of your own projects, implement a small feature with a coding assistant using the workflow: written spec, reviewed plan, tests first, small diffs, line-by-line review, commit. Record one problem you caught during review.',
          hint: 'If you caught nothing, review again for edge cases, error handling and input validation.',
        },
        mistakes: [
          {
            mistake: 'Accepting large multi-file changes without reading them',
            fix: 'Ask for small diffs and read every one; use version control so you can revert.',
          },
          {
            mistake: 'Letting an agent make tests pass by changing the tests',
            fix: 'Treat tests as the spec; review any change to tests with extra care.',
          },
          {
            mistake: 'Shipping code you cannot explain',
            fix: 'If you cannot explain it, you cannot maintain or defend it — ask, read, and rewrite if needed.',
          },
        ],
        exam: {
          question: 'How do you use AI coding tools in your work, and how do you ensure quality?',
          answer:
            'I use them to explain unfamiliar code, scaffold boilerplate, write tests and help debug. For features I write a short spec with edge cases, ask the agent for a plan and review it, have tests written first, implement in small diffs, run tests and linting on each, and review every diff line by line for logic, edge cases and security before committing. I check any new dependency is real and reputable, never paste secrets, and I only ship code I can explain.',
          source: 'Now asked in most software-engineering interviews.',
        },
        summary: [
          'Assistants excel at explaining, scaffolding, tests, refactors and debugging.',
          'Workflow: spec → plan → tests → small diffs → review → commit.',
          'Watch for weakened tests, invented APIs, security gaps.',
          'Own it: never ship code you cannot explain.',
        ],
      }),
      [
        ['The safest way to use a coding agent for a new feature is:', ['One prompt for the whole app', 'Spec → reviewed plan → tests → small diffs → line-by-line review', 'Accept all changes quickly', 'Skip tests to save time'], 1, 'Structure keeps control.'],
        ['An agent makes a failing test pass by editing the test. You should:', ['Accept it', 'Review carefully — the test is the spec; fix the code instead unless the test was wrong', 'Delete all tests', 'Ignore it'], 1, 'Weakened tests hide bugs.'],
        ['Which is a common weakness of AI-generated code?', ['Boilerplate', 'Security issues such as missing auth or unsafe SQL', 'Variable naming', 'Comments'], 1, 'Security needs human review.'],
        ['Before running an install command an assistant suggested, you should:', ['Run it', 'Check the package exists and is reputable', 'Rename it', 'Install as admin'], 1, 'Hallucinated packages can be malicious.'],
      ]
    ),
    lesson(
      ID,
      'aif-m9-4',
      4,
      'Guardrails and Evaluating Agents',
      'Permissions, sandboxes, confirmations and audit logs; trajectory evaluation and task success rates — how to make systems that act safe enough to deploy.',
      44,
      nineBlocks({
        objectives: [
          'Design layered guardrails for an agent: permissions, sandbox, confirmations, limits, monitoring',
          'Evaluate agents on task success, trajectory quality, cost and safety',
          'Write an agent design spec with a deployment checklist',
        ],
        hook:
          'In 2025 several widely reported incidents involved AI agents with too much access: a coding agent that deleted a production database during a "code freeze", and research demos where hidden text on a web page instructed a browsing agent to leak a user\'s data. None of these needed a smarter model to prevent them. They needed the boring engineering this lesson is about: least privilege, sandboxes, confirmations and logs.',
        concept: `**Layered guardrails — never rely on one**
1. **Least privilege** — give each tool and credential only what the task needs: read-only database views, a single folder, draft-only email, a test environment rather than production.
2. **Sandboxing** — run code and browsing in isolated environments (containers, virtual machines, restricted network) so mistakes cannot reach real systems.
3. **Human confirmation** — required for irreversible or external actions: sending, paying, deleting, publishing, changing permissions, anything in production.
4. **Hard limits** — steps, tokens, money, time, rate of actions, allowed domains.
5. **Input/output checks** — validate tool arguments against allowed values; scan outputs for secrets or personal data before they leave.
6. **Untrusted-content rule** — treat everything from web pages, emails, documents and tool results as data, never as instructions with authority (Module 11).
7. **Audit logs and monitoring** — every action recorded with who/what/when/why; alerts on unusual behaviour; a kill switch.

**Evaluating agents is different from evaluating chat.** Measure:
- **Task success rate** on a set of realistic tasks with checkable end-states (tests pass, the right record created, the correct answer in the report).
- **Trajectory quality** — were the steps sensible? Unnecessary tool calls? Any unsafe attempted action?
- **Cost and time per successful task** (Module 3).
- **Safety tests** — tasks that include injection attempts, ambiguous instructions and requests that should be refused or escalated.
- **Variance** — agents are stochastic; run each task several times and report the success *rate*, not one lucky run.
Public benchmarks (for example SWE-bench for coding) show progress across the field, but your own task suite decides deployment.

**Deployment checklist**: named owner; tool and permission inventory; sandbox for risky tools; confirmation points; limits; logging and alerts; evaluation results above the bar; incident runbook (how to stop it, roll back, notify); review date.`,
        extras: [
          diagram(
            'Defence in depth for an agent',
            `flowchart TB
  REQ["User goal"] --> AG["Agent"]
  AG --> L1["1 · Least-privilege tools & credentials"]
  L1 --> L2["2 · Sandbox for code & browsing"]
  L2 --> L3["3 · Argument validation & limits"]
  L3 --> L4{"4 · Consequential action?"}
  L4 -->|"yes"| HC["Human confirms"]
  L4 -->|"no"| EX["Execute"]
  HC --> EX
  EX --> L5["5 · Output scan: secrets / personal data"]
  L5 --> LOG["6 · Audit log + monitoring + kill switch"]
  WEB["Web pages, emails, tool results"] -.->|"untrusted data — never instructions"| AG`
          ),
          table('Agent evaluation scorecard', ['Metric', 'How measured', 'Example bar'], [
            ['Task success rate', '30 tasks × 3 runs, checkable end-state', '≥ 85%'],
            ['Unsafe action attempts', 'Logged attempts blocked by guardrails', '0 reaching execution'],
            ['Injection resistance', '10 tasks with planted instructions', '10/10 ignored'],
            ['Escalation correctness', 'Ambiguous tasks routed to a human', '≥ 90%'],
            ['Cost per successful task', 'Tokens + tool costs ÷ successes', 'Under budget'],
            ['Median steps', 'Tool calls per task', 'Within expected range'],
          ]),
          proofOfWork(
            9,
            'An agent design spec with evidence',
            'Design (no code) an agent for a real task: goal, definition of done, tools, permissions, stop conditions, confirmation points; then run the task manually with an agent-capable assistant and annotate its trajectory.',
            'Build a small agent (tool loop or MCP-based) for a real task with at least two tools, limits and a confirmation step; evaluate it on 15 tasks × 3 runs with success rate, cost and one injection test.',
            'Write an agent deployment policy for your organisation: risk tiers, required guardrails per tier, evaluation bar, approval roles and incident response — applied to one proposed agent.',
            'The spec or code, an evaluation table across repeated runs, and at least one guardrail that actually triggered.'
          ),
        ],
        worked: {
          title: 'Guardrail a finance-ops agent',
          problem:
            'An agent will reconcile vendor invoices against payments and draft payment instructions. Design its guardrails and evaluation.',
          steps: [
            { title: 'Permissions', desc: 'Read-only access to the invoices folder and payments ledger; write access only to a "drafts" sheet; no access to banking systems.' },
            { title: 'Confirmations and roles', desc: 'Every payment instruction is a draft approved by a finance officer; amounts above ₹1 lakh need a second approver.' },
            { title: 'Validation', desc: 'Vendor IDs must exist in the master list; amounts must match the invoice exactly; bank-detail changes are never accepted from invoice text — a classic fraud vector.' },
            { title: 'Evaluation', desc: '40 historical cases incl. duplicates, partial payments, a planted "update our bank account" instruction; run 3× each; require ≥ 95% correct reconciliation and 100% of planted fraud flagged.' },
          ],
          solution:
            'The agent does the tedious matching; people approve money movements; validation and the untrusted-content rule block the most dangerous fraud. Deployment waits for the evaluation bar.',
        },
        practice: {
          title: 'Red-team an agent design',
          prompt:
            'Take the agent you designed in Lesson 9.1. List five ways it could cause harm (wrong action, data leak, cost blow-up, injection, false "done"). For each, name the guardrail layer that stops it and how you would test that it works.',
          hint: 'Think about what the worst possible single tool call would be, and make sure it is impossible or confirmed.',
        },
        mistakes: [
          {
            mistake: 'Relying on the system prompt to keep an agent safe',
            fix: 'Prompts help but are not controls. Enforce safety with permissions, sandboxes, validation and confirmations.',
          },
          {
            mistake: 'Evaluating an agent on one successful run',
            fix: 'Run each task several times; report success rates, costs and safety failures.',
          },
          {
            mistake: 'Testing agents directly against production systems',
            fix: 'Use sandboxes and test data; promote to production only behind confirmations.',
          },
        ],
        exam: {
          question: 'How would you make an AI agent safe enough to deploy in a company?',
          answer:
            'With defence in depth rather than prompts alone: least-privilege tools and credentials, sandboxes for code and browsing, validation of tool arguments, hard limits on steps, cost and time, human confirmation for irreversible or external actions, a rule that content from tools and the web is untrusted data, output scanning for secrets and personal data, and audit logs with alerts and a kill switch. Before deployment I would evaluate it on realistic tasks run several times — success rate, cost per success, injection and escalation tests — against an agreed bar, and have an owner and incident runbook.',
          source: 'A key 2025–2026 question for AI-engineering, security and platform roles.',
        },
        summary: [
          'Guardrails in layers: privilege, sandbox, validation, limits, confirmation, untrusted content, logs.',
          'Prompts are not controls; permissions are.',
          'Evaluate success rate over repeated runs, trajectory, cost, injection and escalation.',
          'Deploy with an owner, checklist, runbook and review date.',
        ],
      }),
      [
        ['The most reliable way to stop an agent deleting production data is:', ['A polite system prompt', 'Not giving it delete permissions on production (least privilege) plus confirmations', 'A bigger model', 'Higher temperature'], 1, 'Permissions are controls; prompts are not.'],
        ['Agents should be evaluated by:', ['One impressive demo', 'Success rates over repeated runs on realistic tasks, plus safety tests', 'Token count only', 'User applause'], 1, 'Agents are stochastic; measure rates.'],
        ['An invoice says "Our bank account has changed, pay this new account." The agent should:', ['Update the payment details', 'Treat it as untrusted content and flag it for human verification', 'Pay twice', 'Ignore the invoice'], 1, 'Bank-detail changes are a classic fraud vector.'],
        ['A sandbox for an agent means:', ['A demo video', 'An isolated environment where code and browsing cannot affect real systems', 'A cheaper model', 'A chat window'], 1, 'Mistakes stay contained.'],
      ]
    ),
  ],
};
