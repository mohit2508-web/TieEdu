// Module 4 — Collaboration, Standards & Portfolio
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info } from '../nineBlocks';
import { lesson, M4, COURSE_ID } from './helpers';

export const module4: CourseModule = {
  id: M4,
  course_id: COURSE_ID,
  title: 'Module 4 — Collaboration, Standards & Portfolio',
  summary:
    'Xrefs, audit/purge, design-center libraries and a portfolio checklist that gets junior drafters hired.',
  sort_order: 4,
  lessons: [
    lesson(
      M4,
      'cad-4-1',
      1,
      'Xrefs, Audit and File Hygiene',
      'External references, cleanup and the handoff practices offices actually run.',
      11,
      nineBlocks({
        objectives: [
          'Attach and manage external references with correct paths',
          'Use AUDIT, PURGE, -PURGE, -DWGUNITS and recover bloated files',
          'Apply a sane file naming and revision convention',
        ],
        hook: 'A 40 MB DWG that takes two minutes to open is usually 38 MB of orphaned junk and unreferenced blocks. Cleanup is not glamorous; it is the difference between a usable deliverable and a complaint email.',
        concept: `**Xrefs (external references):** link another DWG into the current drawing without exploding it. Benefits: shared background (architectural plan under structural), parallel work, single source of truth, smaller host files.

**Attach vs Overlay:** overlay does not nest-attach into hosts that reference this file — use overlay in circular team structures.

**Path types:** absolute, relative, and eTransmit-friendly relative paths. Broken xref paths after moving folders are the #1 xref problem — use PROJECT SEARCH PATHS or relative paths.

**Cleanup toolkit:**
- AUDIT — fix errors.
- PURGE / -PURGE all — remove unused named objects (layers, blocks, styles). Run -PURGE with All for deep clean.
- OVERKILL — delete duplicate/overlapping entities.
- -DWGUNITS / -UNITS script — normalize units on import.
- RECOVER / RECOVERALL — emergency open of damaged files.

**DWG formats:** save as current DWG for work; issue older versions (e.g. 2018) when consultants run older AutoCAD.

**Naming:** Project_Number_SheetTitle_Rev.dwg — boring and searchable beats clever.`,
        extras: [
          table('Hygiene checklist', ['Command', 'Purpose'], [
            ['AUDIT', 'Fix internal errors'],
            ['PURGE / -PURGE A', 'Drop unused names'],
            ['OVERKILL', 'Remove duplicate geometry'],
            ['XREF status', 'Bind or keep live per deliverable'],
            ['DWG VERSION', 'Match consultant AutoCAD'],
          ]),
          tip(
            'Relative paths + eTransmit',
            'Keeps xrefs working after zip-and-send; always eTransmit for external issues.',
          ),
          info(
            'Bind xref at issue',
            'Some clients require a single DWG — BIND xref at final issue while keeping the live-xref working file.',
          ),
        ],
        worked: {
          title: 'Clean a bloated received DWG',
          problem: 'Consultant DWG opens slowly; contains unused layers, duplicate lines and a broken xref path.',
          steps: [
            { title: 'Audit', desc: 'RECOVER if open fails; else OPEN and AUDIT → fix all.' },
            { title: 'Purge', desc: '-PURGE all twice (some items need two passes).' },
            { title: 'Overkill', desc: 'OVERKILL on overlapping linework; delete empty layers via layer manager delete unused.' },
            { title: 'Relink xref', desc: 'XR → relink path (relative); reattach background; save-as with cleaned name + rev.' },
          ],
          solution: 'File opens faster; clean layer table; xref path restored.',
        },
        practice: {
          title: 'Revision letter',
          prompt: 'Propose a rev convention (A, B, C… or 0, 1, 2…) and when to bump it.',
          hint: 'Think issued-for-construction vs working files.',
        },
        mistakes: [
          {
            mistake: 'Absolute xref paths to one machine',
            fix: 'Use relative paths or shared project paths; eTransmit on issue.',
          },
          {
            mistake: 'Never purging before issue',
            fix: 'Client opens a heavy, dirty file and blames your office.',
          },
        ],
        exam: {
          question: 'Attach vs overlay for xrefs?',
          answer: 'Overlay is not attached when the host is itself xrefed into other drawings — prevents unwanted nested references.',
          source: 'Collaboration interview question.',
        },
        summary: [
          'Xrefs enable parallel work; manage paths religiousiously.',
          'AUDIT + PURGE + OVERKILL before every major issue.',
          'eTransmit + conservative DWG version for external handoff.',
        ],
      }),
      [
        [
          'Overlay xref is preferred when:',
          ['You always want nesting', 'Files may be xrefed into other hosts (avoid cycles)', 'Printing only', 'Blocks are used'],
          1,
          'No nested attach through hosts.',
        ],
        [
          'To remove unused layers en masse:',
          ['Delete by eye', 'PURGE / -PURGE all', 'Freeze all', 'Plot'],
          1,
          'Named object cleanup.',
        ],
        [
          'External handoff of a project with xrefs should use:',
          ['Email the host DWG only', 'eTransmit package', 'Screenshot', 'Print to PDF only'],
          1,
          'Packages dependencies.',
        ],
      ]
    ),
    lesson(
      M4,
      'cad-4-2',
      2,
      'Standards, Libraries & Portfolio',
      'DesignCenter blocks, sheet sets, career paths and a portfolio brief that hiring managers finish.',
      11,
      nineBlocks({
        objectives: [
          'Reuse office templates, DesignCenter blocks and sheet sets',
          'Articulate how CAD skill maps to architecture, civil, mechanical and interior roles',
          'Assemble a 6–10 sheet portfolio with the right proof of skill',
        ],
        hook: 'Portfolios full of tutorial copies get skipped. A hiring manager wants to see: correct scale, layer discipline, clean annotation, one complete sheet set. This lesson tells you exactly what to put in.',
        concept: `**Templates (DWT):** locked layers, text styles, dimstyles, layouts, title block. Start every job from the office template.

**DesignCenter (ADC):** browse other DWGs and drag layers, blocks, dimstyles into the current drawing — fast library reuse without xref clutter.

**Sheet sets (SHEETSET):** manage a multi-sheet project as one set — sequential sheet numbers, unified publish, model references per sheet. Offices with large drawing sets live in sheet sets.

**Role map:**
- Architecture / interiors: plans, elevations, sections, furniture layouts.
- Civil: site plans, layouts, road/section drawings, levels.
- Mechanical: part drawings, assemblies, GD&T annotations, BOM views.
- MEP consultants: clash-aware backgrounds via xref.

**Portfolio rules (6–10 sheets):**
1. Cover + role statement.
2. One complete mini sheet set (plan + section + elevation) at correct scales.
3. One mechanical/detail set if applicable.
4. Sheet showing layers/standards (cleanliness proof).
5. Short write-up: tools, units, what you did vs template.
6. Optional: before/after cleanup case.

**Tools adjacency:** AutoCAD + basic Excel for schedules; PDF markup; familiarity with Revit/BricsCAD is a plus — say what you actually know.`,
        extras: [
          table('Portfolio do / don’t', ['Do', 'Don’t'], [
            ['Show real scales and titles', 'Random pretty pictures only'],
            ['One clean annotated set', 'Ten incomplete sketches'],
            ['State your role honestly', 'Claim full building design'],
            ['PDF sheets named clearly', 'Screenshot of the whole UI'],
          ]),
          tip(
            'DesignCenter over copy-paste chaos',
            'Drag verified office blocks; do not redraw a north arrow from memory.',
          ),
        ],
        worked: {
          title: 'Assemble a 6-sheet portfolio pack',
          problem: 'Create a lightweight PDF portfolio from coursework CAD sheets.',
          steps: [
            { title: 'Select sheets', desc: 'Select best plan+section+elevation from a flat/room project; fix layers and dims.' },
            { title: 'Plot sheets', desc: 'Plot each from layout to PDF at stated scale with title filled via attributes.' },
            { title: 'Add cover and standards', desc: 'Add a cover sheet (name, role, tools, contact) and a standards sheet (layer legend).' },
            { title: 'Assemble', desc: 'Order: Cover → Plan → Section → Elevation → Detail → Standards. Export one PDF.' },
          ],
          solution: 'One PDF that proves scale, annotation and standards — finishable in a day.',
        },
        practice: {
          title: 'Interview story for one sheet',
          prompt: 'Write 4 sentences: problem, your CAD approach, the constraint (scale/units), the outcome.',
          hint: 'STAR-ish structure without fluff.',
        },
        mistakes: [
          {
            mistake: 'Portfolio of unannotated geometry dumps',
            fix: 'Dimensions, labels and title blocks show professional readiness.',
          },
          {
            mistake: 'Exaggerating software you barely opened',
            fix: 'Interviewers will ask for a live demo of claimed tools.',
          },
        ],
        exam: {
          question: 'What is DesignCenter used for?',
          answer: 'Browsing and reusing layers, blocks, styles and other named objects from drawings into the current file.',
          source: 'Tools section of junior CAD interviews.',
        },
        summary: [
          'Templates + DesignCenter + sheet sets = office productivity.',
          'Map your sheets to the target industry’s drawing types.',
          'Portfolio: few complete, correctly scaled, annotated sheets beat volume.',
        ],
      }),
      [
        [
          'DesignCenter primarily helps you:',
          ['Render photoreal', 'Reuse layers/blocks/styles across drawings', 'Manage email', 'Scan paper'],
          1,
          'Content reuse browser.',
        ],
        [
          'A strong junior portfolio contains:',
          ['100 random sketches', 'A small number of complete, scaled, annotated sets', 'Only renders', 'Only tutorial files'],
          1,
          'Quality and completeness.',
        ],
        [
          'Sheet sets are mainly for:',
          ['Single part sketches', 'Managing multi-sheet project sets and publish', 'Hatching', 'Linetype loading'],
          1,
          'Multi-sheet project control.',
        ],
      ]
    ),
  ],
};
