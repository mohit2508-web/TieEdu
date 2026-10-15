// Module 2 — Layers, Blocks & Annotation
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M2, COURSE_ID } from './helpers';

export const module2: CourseModule = {
  id: M2,
  course_id: COURSE_ID,
  title: 'Module 2 — Layers, Blocks & Annotation',
  summary:
    'Layer discipline, reusable blocks, text and dimensions — what makes a drawing readable and maintainable.',
  sort_order: 2,
  lessons: [
    lesson(
      M2,
      'cad-2-1',
      1,
      'Layers, Linetypes and Properties',
      'Organize geometry by function; stop fighting color-by-hand drawings.',
      11,
      nineBlocks({
        objectives: [
          'Create and manage layers with color, linetype and lineweight',
          'Use ByLayer properties consistently',
          'Control visibility with freeze/thaw, on/off and lock appropriately',
        ],
        hook: 'A drawing where every line is red BYCOMMAND is unmaintainable. Layers let you hide dimensions while editing structure, print walls thicker than furniture, and hand off a sheet without a 30-minute explanation.',
        concept: `**Layers** are the primary organization tool: name by discipline and role (A-WALL, A-DOOR, A-DIMS, E-POWER, S-COL).

**Object properties:** Color, Linetype, Lineweight, Plot style. Best practice: set objects to BYLAYER and control appearance on the layer itself.

**Linetype:** Continuous, Dashed, Center, Hidden — load via LINETYPE before assigning. LTSCALE scales dash patterns to the drawing.

**Visibility:**
- On/Off — hides objects; still regenerates.
- Freeze/Thaw — hides and unloads from memory; better for xrefs and large sheets.
- Lock — visible but not editable; good for background underlays.

**Layer states / filters:** save sets of on/off/frozen for different deliverables (plan vs furniture plan).

**VPSCALE / plot:** lineweight display is paper-dependent; rely on plot style tables (CTB/STB) for final print control.`,
        extras: [
          table('Layer naming (AIA-style, adapt locally)', ['Layer', 'Typical content'], [
            ['A-WALL', 'Wall geometry'],
            ['A-DOOR', 'Doors and swings'],
            ['A-GLAZ', 'Glazing'],
            ['A-DIMS', 'Dimensions'],
            ['A-ANNO-TEXT', 'Text notes'],
            ['A-HATCH', 'Hatch/fill'],
            ['DEFPOINTS', 'Non-plot construction points'],
          ]),
          tip(
            'One property rule',
            'Objects BYLAYER always; change the layer to change the look of many objects at once.',
          ),
          warn(
            'Do not freeze the layer you are drawing on',
            'New objects on a frozen layer are invisible — a classic "where did my line go" bug.',
          ),
        ],
        worked: {
          title: 'Wall + door layer setup',
          problem: 'Prepare layers for a simple plan: walls (continuous, white), doors (continuous, yellow), dimensions (continuous, cyan), hatch (light gray).',
          steps: [
            { title: 'Wall layer', desc: 'LAYER → New A-WALL color 7 continuous lw 0.5mm.' },
            { title: 'Other layers', desc: 'New A-DOOR color 2 continuous; A-DIMS color 4; A-HATCH color 8.' },
            { title: 'Draw ByLayer', desc: 'Set current A-WALL; draw walls. Switch current for each new type.' },
            { title: 'Fix strays', desc: 'Select stray objects → Properties → Layer = correct name (or LAYMCH).' },
          ],
          solution: 'Four layers with ByLayer objects; plot thick walls via CTB mapping.',
        },
        practice: {
          title: 'Freeze vs lock',
          prompt: 'When would you freeze a layer vs lock it? Give one scenario each.',
          hint: 'Think: not needed at all vs needed as reference.',
        },
        mistakes: [
          {
            mistake: 'Coloring objects directly instead of BYLAYER',
            fix: 'Overrides hide layer standards and break CTB plotting.',
          },
          {
            mistake: 'Everything on layer 0',
            fix: 'Layer 0 is for block definition internals, not production geometry.',
          },
        ],
        exam: {
          question: 'Difference between freeze and off?',
          answer: 'Both hide; freeze also unloads the layer from the display cache (faster on large drawings, affects regen).',
          source: 'Common CAD interview question.',
        },
        summary: [
          'Name layers by discipline-role; keep objects BYLAYER.',
          'Freeze for heavy unused content; lock for reference.',
          'LTSCALE and CTB control dash and print weight.',
        ],
      }),
      [
        [
          'Best practice for object color is:',
          ['Hard-code every object', 'ByLayer', 'ByBlock always', 'Random per line'],
          1,
          'Layer owns appearance.',
        ],
        [
          'Layer 0 should mostly contain:',
          ['All project geometry', 'Block definition internals only', 'Dimensions only', 'Hatches only'],
          1,
          'Block base convention.',
        ],
        [
          'Freeze differs from off mainly by:',
          ['Nothing', 'Unloading from display cache / regen', 'Deleting objects', 'Changing color'],
          1,
          'Performance and xref behavior.',
        ],
      ]
    ),
    lesson(
      M2,
      'cad-2-2',
      2,
      'Blocks, Attributes and Dimensions',
      'Reusable symbols, title-block data and annotation that updates when geometry changes.',
      11,
      nineBlocks({
        objectives: [
          'Create, insert and edit blocks with a sensible base point',
          'Use attributes for title-block fields and equipment tags',
          'Apply dimension styles and associate dimensions with geometry',
        ],
        hook: 'The same door appears 40 times on a floor plan. As a block, one update edits all. As 40 exploded line-sets, you redraw the office. Blocks are the single biggest productivity lever in 2D CAD.',
        concept: `**Blocks:** a named collection of entities stored once, inserted many times. Base point matters — it is the insertion handle. Use WBLOCK to save blocks to external files for reuse across projects.

**Attributes:** text placeholders inside a block (tag, prompt, default). Title blocks use ATTRIB for project, sheet, date, scale. Edit values with ATTEDIT / EATTEDIT or by double-click.

**Dynamic blocks (advanced):** visibility states, stretch actions, lookup tables — one block with many configurations. Worth knowing for libraries.

**Dimensions:** linear (DLI), aligned (DAL), angular (DAN), radial (DRA/DRE), diameter (DDI), ordinate (DOR).

**Dimension style (DIMSTYLE):** unit precision, arrowheads, text height, gaps, alternate units. Set once per office standard; annotative scaling keeps text readable across view scales.

**Association:** dimensions stay linked to geometry; moving an endpoint updates the dimension if association is on.`,
        extras: [
          table('When to block', ['Entity type', 'Block?'], [
            ['Door/window/furniture symbol', 'Yes'],
            ['North arrow, level mark', 'Yes'],
            ['Unique construction line', 'No'],
            ['Title frame', 'Yes + attributes'],
            ['Hatch of one room', 'Usually no'],
          ]),
          tip(
            'Block base point at a logical handle',
            'Door jamb corner, column grid intersection — not geometry bbox random corner.',
          ),
          warn(
            'Exploding blocks destroys attribute structure',
            'Explode only when you must; prefer copy + edit in place.',
          ),
        ],
        worked: {
          title: 'Door block with swing',
          problem: 'Create a door symbol (leaf line + arc swing) as block DOOR-900, insert 12 times along a corridor.',
          steps: [
            { title: 'Draw symbol', desc: 'Draw leaf and arc on A-DOOR; ensure correct base point at hinge.' },
            { title: 'Make block', desc: 'BLOCK → name DOOR-900, select objects, pick base at hinge.' },
            { title: 'Insert', desc: 'INSERT along the corridor; ROTATE/MIRROR per opening direction.' },
            { title: 'Global edit', desc: 'Later: edit one instance definition (BEDIT) → all 12 update.' },
          ],
          solution: 'One block definition, twelve inserts, single source of truth.',
        },
        practice: {
          title: 'Title block attributes',
          prompt: 'List four attributes you would put in a title block and their tags.',
          hint: 'Project name, client, sheet number, date, scale, drawn-by.',
        },
        mistakes: [
          {
            mistake: 'Inserting blocks with random scale factors',
            fix: 'Draw blocks at 1:1 in real units; scale at insertion only when the library demands it.',
          },
          {
            mistake: 'Dimensions without a proper style',
            fix: 'Default text can be unreadable on plot; set DIMSTYLE once to office standard.',
          },
        ],
        exam: {
          question: 'What is the purpose of a block base point?',
          answer: 'It is the insertion reference point aligned to the cursor when placing the block.',
          source: 'Standard block fundamentals question.',
        },
        summary: [
          'Blocks = reuse; WBLOCK for cross-project libraries.',
          'Attributes carry title-block and tag data.',
          'DIMSTYLE + association keep annotation professional.',
        ],
      }),
      [
        [
          'Block base point is:',
          ['Always the bbox center', 'The insertion reference point', 'The first layer drawn', 'Unused'],
          1,
          'Aligns geometry to the cursor.',
        ],
        [
          'Title-block fields like project name are best stored as:',
          ['Hardcoded TEXT in every sheet', 'ATTRIB values in a block', 'Hatch', 'Xline'],
          1,
          'Editable per insert.',
        ],
        [
          'Dimensions should normally use properties:',
          ['ByLayer via DIMSTYLE', 'Random colors', 'ByBlock only', 'Manual height each time'],
          0,
          'Style + ByLayer.',
        ],
      ]
    ),
  ],
};
