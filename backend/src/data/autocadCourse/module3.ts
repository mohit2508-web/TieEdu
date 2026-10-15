// Module 3 — Civil/Mechanical Drafting Workflows
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M3, COURSE_ID } from './helpers';

export const module3: CourseModule = {
  id: M3,
  course_id: COURSE_ID,
  title: 'Module 3 — Drafting Workflows',
  summary:
    'Floor plans, sections and mechanical views with hatch, plot and paper space — the sheets that actually get issued.',
  sort_order: 3,
  lessons: [
    lesson(
      M3,
      'cad-3-1',
      1,
      'Plans, Sections and Hatching',
      'Cut planes, poché, section markers and associative hatch that survives edits.',
      12,
      nineBlocks({
        objectives: [
          'Draft a simple floor plan with walls, openings and room labels',
          'Create a section with correct cut-line convention and hatch (poche)',
          'Use associative HATCH that updates when boundaries change',
        ],
        hook: 'Employers hire draftspeople who can produce a clean plan-section-elevation set — not just operate the mouse. This lesson mirrors how real architectural sheets are built in 2D CAD.',
        concept: `**Plan discipline:** draw walls as closed polylines or double-line offsets; openings by TRIM with door/window blocks inserted; rooms labeled on A-ANNO-TEXT with room name + area if required.

**Section basics:** the cut plane location is shown on the plan with a section line (heavy line + arrows + label A-A). The section view shows what is cut (poché/hatch) and what is beyond (elevation lines).

**Poché:** the material cut through is filled — diagonal hatch for masonry, solid for RC, specific patterns per material legend.

**HATCH (H):** pick internal point or select boundary; associative hatch re-fires when the boundary edits. Patterns: ANSI31 (general), AR-CONC (concrete), SAND, STEEL. Scale (HPSCALE / pattern scale) must suit the drawing scale — too dense becomes solid on plot.

**Elevation markers and levels:** level datums (±0.000) with finished floor levels; section level callouts.

**Workflow order:** grid → structural/wall lines → openings → furniture/equipment → annotation → hatch → plot.`,
        extras: [
          table('Hatch patterns', ['Pattern', 'Use'], [
            ['ANSI31', 'General cut / masonry default'],
            ['AR-CONC', 'Reinforced concrete'],
            ['AR-SAND', 'Earth/fill'],
            ['STEEL / ANSI32', 'Metal section'],
            ['SOLID', 'Poché emphasis, insulation variants'],
          ]),
          tip(
            'Hatch after boundaries are final',
            'Associative hatch helps, but early hatching still slows selection and trim.',
          ),
          warn(
            'HPGAPTOL / boundary gaps',
            'A hatch that fails usually has a micro-gap; enlarge tolerance slightly or close the polyline properly.',
          ),
        ],
        worked: {
          title: 'Room with hatched walls',
          problem: 'Plan with 230 outer walls, one door opening 900, hatched poché, room label "BEDROOM 3600×3300".',
          steps: [
            { title: 'Walls', desc: 'Draw outer wall polyline 3600×3300 outer; OFFSET 230 inward for inner face.' },
            { title: 'Opening', desc: 'TRIM a 900 opening; insert DOOR block on hinge.' },
            { title: 'Poché', desc: 'HATCH the wall cavity with ANSI31 at correct scale; associative on.' },
            { title: 'Annotate', desc: 'TEXT room name on A-ANNO-TEXT; place dimension strings on A-DIMS.' },
          ],
          solution: 'Readable room with poché walls, door and annotation on layers.',
        },
        practice: {
          title: 'Section line on plan',
          prompt: 'Describe the 3 elements every section cut line needs on a plan.',
          hint: 'Heavy line, direction arrows, label matching the section view.',
        },
        mistakes: [
          {
            mistake: 'Hatch scale wrong for plot scale',
            fix: 'Preview plot; adjust pattern scale until lines read clearly, not solid.',
          },
          {
            mistake: 'Section view without matching cut line on plan',
            fix: 'Every section must be locatable from the plan marker.',
          },
        ],
        exam: {
          question: 'What is poché in a architectural section?',
          answer: 'The filled/hatched representation of materials cut through by the section plane.',
          source: 'Drafting fundamentals question.',
        },
        summary: [
          'Plan → openings → hatch → annotate → plot.',
          'Section needs plan marker + cut hatch + beyond elevation lines.',
          'Associative hatch + correct scale for readability.',
        ],
      }),
      [
        [
          'Poché represents:',
          ['Furniture only', 'Materials cut by the section plane', 'Grid lines', 'Text styles'],
          1,
          'Cut material fill.',
        ],
        [
          'A section view on a drawing set is located from:',
          ['The elevation only', 'The section cut line on the plan', 'The title block alone', 'Hatch alone'],
          1,
          'Marker A-A points to view A-A.',
        ],
        [
          'Associative hatch means:',
          ['It is locked forever', 'It updates when its boundary changes', 'It is not printable', 'It is a block'],
          1,
          'Boundary-linked fill.',
        ],
      ]
    ),
    lesson(
      M3,
      'cad-3-2',
      2,
      'Paper Space, Viewports and Plotting',
      'Layouts, viewport scale, annotative text and producing a correct PDF/DWG plot.',
      11,
      nineBlocks({
        objectives: [
          'Create paper-space layouts with titled title blocks',
          'Set viewport scale precisely and lock viewports',
          'Configure plot to PDF with correct CTB, area and rotation',
        ],
        hook: 'Model space is infinite; the plotter sheet is not. Candidates who only print from model space at "fit to page" never show a true 1:100 elevation. Paper space is the professional path.',
        concept: `**Model space vs paper space:**
- Model: draw 1:1 in real units, forever.
- Paper (Layout): the sheet; floating viewports are windows onto model at defined scales.

**Viewport scale:** select viewport → Properties → Standard scale (1:100, 1:50) or set with ZOOM 1/100xp while the viewport is active (MSLIDE/CHSPACE workflow). Then Lock viewport so pans do not destroy scale.

**Annotative objects:** text/dimensions that auto-scale per viewport — keeps notes readable in 1:100 plan and 1:20 detail without style forks.

**Plot (PLOT / Ctrl+P):**
- Printer: DWG to PDF (or your office PDF driver).
- Paper size: A1/A2/A3 as required.
- Plot area: Layout (paper space).
- Plot style table: office CTB (color→lineweight).
- Center the plot; scale 1:1 for layouts.

**Publish / batch plot:** PUBLISH for multi-sheet PDF sets.

**Export for consultants:** eTransmit packages DWG + xrefs + fonts + CTB.`,
        extras: [
          table('Viewport mistakes', ['Symptom', 'Cause'], [
            ['Wrong text size on plot', 'Model text + no annotative / wrong vp scale'],
            ['Viewport panned by accident', 'Viewport not locked'],
            ['Lineweights all equal', 'No CTB or objects not ByLayer'],
            ['Fit-to-page fuzzy scale', 'Plotted model space with "fit"'],
          ]),
          tip(
            'Zoom 1/100xp method',
            'Double-click into viewport, ZOOM → 1/100xp, then lock. Reliable when standard scales are missing.',
          ),
          warn(
            'Do not dimension in paper space to model geometry without association checks',
            'Prefer annotative dims in model or associative paper dims; verify after plot.',
          ),
        ],
        worked: {
          title: 'A3 plan at 1:100 to PDF',
          problem: 'Issue an A3 floor plan at 1:100 with title block and CTB lineweights.',
          steps: [
            { title: 'Page setup', desc: 'Create Layout1 → page setup A3, PDF plotter, CTB office file.' },
            { title: 'Title block', desc: 'Insert title block at paper coordinates; attributes filled.' },
            { title: 'Viewport scale', desc: 'MVIEW → draw viewport; activate; set scale 1:100; ZOOM E; lock.' },
            { title: 'Visibility', desc: 'Freeze viewport-visibility of construction layers if needed.' },
            { title: 'Plot', desc: 'PLOT → Layout → PDF; check preview lineweights; save.' },
          ],
          solution: 'Correctly scaled, plotted PDF from paper space.',
        },
        practice: {
          title: 'Two viewports one sheet',
          prompt: 'Plan at 1:100 and detail at 1:20 on one A3. How do you set each scale?',
          hint: 'Two mviews; set each scale independently; lock both.',
        },
        mistakes: [
          {
            mistake: 'Forgetting to lock the viewport',
            fix: 'One accidental zoom ruins the printed scale.',
          },
          {
            mistake: 'Using fit-to-page on model space for "real" drawings',
            fix: 'Scale is then unknown — unacceptable for construction.',
          },
        ],
        exam: {
          question: 'How do you set a viewport to exactly 1:100?',
          answer: 'Set Standard scale to 1:100 in viewport properties, or ZOOM 1/100xp inside the active viewport; then lock it.',
          source: 'Plotting section of CAD assessments.',
        },
        summary: [
          'Draw 1:1 in model; compose sheets in layouts.',
          'Viewport standard scale or 1/100xp; always lock.',
          'Plot layouts with CTB; preview before PDF.',
        ],
      }),
      [
        [
          'In paper space you should draw walls at:',
          ['Half size', 'Full model size in model space, view through viewport', 'Random', 'Text size only'],
          1,
          'Viewports scale the view, not the model.',
        ],
        [
          'Zoom 1/100xp means:',
          ['Zoom 100%', 'Scale the viewport view to 1:100 relative to paper', 'Delete 100 objects', 'Layer 100'],
          1,
          'xp = times paper.',
        ],
        [
          'After setting viewport scale you should:',
          ['Leave it unlocked', 'Lock the viewport', 'Explode it', 'Freeze it'],
          1,
          'Protect the scale.',
        ],
      ]
    ),
  ],
};
