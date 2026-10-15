// Module 1 — Interface, Units & Precision Drawing
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M1, COURSE_ID } from './helpers';

export const module1: CourseModule = {
  id: M1,
  course_id: COURSE_ID,
  title: 'Module 1 — Interface, Units & Precision Drawing',
  summary:
    'Workspace, units, object snap and the draw/modify commands that everything else builds on.',
  sort_order: 1,
  lessons: [
    lesson(
      M1,
      'cad-1-1',
      1,
      'Workspace, Units and Object Snap',
      'Set a drawing up correctly before the first line — units, snap, grid and coordinates.',
      11,
      nineBlocks({
        objectives: [
          'Configure drawing units, limits and grid for a civil or mechanical sheet',
          'Use absolute, relative and polar coordinates accurately',
          'Enable and interpret object snap modes (endpoint, midpoint, center, intersection)',
        ],
        hook: 'A drawing made in the wrong units is scrap. A line drawn near an endpoint but not on it breaks fillets, hatches and dimensions later. Setup discipline is what separates production drawings from sketches.',
        concept: `**Units:** UNITS command sets length type (decimal, architectural, engineering) and precision. For Indian civil work often mm or m; mechanical often mm. INSUNITS controls insert scale for blocks/xrefs.

**Coordinates:**
- Absolute: 100,50 (from origin 0,0)
- Relative: @50,0 (from last point)
- Polar relative: @100<45 (length 100 at 45°)

**Grid and snap:** GRID displays a reference lattice; SNAP constrains cursor movement. Ortho (F8) limits to horizontal/vertical; Polar (F10) guides at set angles.

**Object snap (OSNAP):** locks the cursor to exact geometry points — endpoint, midpoint, center, quadrant, node, intersection, perpendicular, tangent, extension. Run-time OSNAP vs one-time osnap overrides (shift+right-click). Always draw to real snaps, not eyeballed proximity.

**Dynamic Input (F12):** shows lengths/angles at the cursor — useful once you trust the numbers.`,
        extras: [
          table('Essential osnap modes', ['Mode', 'Snaps to'], [
            ['END', 'Endpoint of line/arc/polyline'],
            ['MID', 'Midpoint of an edge'],
            ['CEN', 'Center of circle/arc/ellipse'],
            ['INT', 'Intersection of two entities'],
            ['PER', 'Perpendicular foot on an entity'],
            ['TAN', 'Tangent point on a curve'],
            ['NOD', 'Point objects / node'],
            ['EXT', 'Extension of a linear path'],
          ]),
          tip(
            'Set a startup template',
            'Create a DWT with correct units, layers, text styles and dimension styles; start every job from it.',
          ),
          warn(
            'Never force-draw to "close enough"',
            'Zoom in; use osnap. Micro-gaps look fine on screen and fail hatch/trim later.',
          ),
        ],
        worked: {
          title: 'Draw a 60-30 right triangle with coordinates',
          problem: 'Start at (0,0). Horizontal leg 60 mm, then a 30° upward leg of length 40, then close.',
          steps: [
            { title: 'Draw base', desc: 'LINE → 0,0 → @60,0 (horizontal 60).' },
            { title: 'Polar leg', desc: 'Continue @40<30 (polar relative 40 at 30°).' },
            { title: 'Close', desc: 'Close with C back to the start.' },
            { title: 'Verify', desc: 'Dimension the horizontal leg; it should read 60.' },
          ],
          solution: 'Triangle drawn with exact lengths using absolute then polar-relative input.',
        },
        practice: {
          title: 'Rectangle by coordinates',
          prompt: 'Draw a 100×60 rectangle starting at (20,20) using relative coordinates only.',
          hint: 'First point absolute 20,20; then @100,0; @0,60; @-100,0; C.',
        },
        mistakes: [
          {
            mistake: 'Typing 50,0 after the first point and getting a jump to the origin',
            fix: 'Without @, AutoCAD treats input as absolute. Use @ for relative.',
          },
          {
            mistake: 'Leaving every osnap mode on',
            fix: 'Too many modes fight each other near dense geometry; enable the 4–6 you need.',
          },
        ],
        exam: {
          question: 'What does @100<45 mean?',
          answer: 'Relative polar: 100 units from the last point at 45 degrees.',
          source: 'Common CAD viva / OA input question.',
        },
        summary: [
          'UNITS before geometry; template for every new sheet.',
          'Absolute vs relative (@) vs polar (@dist<angle).',
          'OSNAP is mandatory for production accuracy.',
        ],
      }),
      [
        [
          'Relative polar input @50<90 means:',
          ['Absolute 50,90', '50 units at 90° from the last point', 'Grid snap 50', '50 mm altitude'],
          1,
          '@ = relative; < = angle.',
        ],
        [
          'OSNAP endpoint snaps to:',
          ['Any edge middle', 'The end of a line or arc', 'Circle center only', 'Grid intersections'],
          1,
          'Endpoint geometry.',
        ],
        [
          'Drawing units are set with the command:',
          ['GRID', 'UNITS', 'SNAP', 'LIMITS'],
          1,
          'UNITS (or -UNITS).',
        ],
      ]
    ),
    lesson(
      M1,
      'cad-1-2',
      2,
      'Draw and Modify Commands',
      'Line, circle, arc, trim, extend, offset, mirror, array — the daily verbs of CAD.',
      12,
      nineBlocks({
        objectives: [
          'Use LINE, CIRCLE, ARC, RECTANG, POLYLINE and PLINE correctly',
          'Apply TRIM, EXTEND, OFFSET, FILLET, CHAMFER, MIRROR and ARRAY',
          'Choose polyline vs exploded lines for editing and hatching',
        ],
        hook: 'A senior draftsman once said the job is 20% draw and 80% modify. Learning OFFSET+TRIM and ARRAY turns a 2-hour elevation into a 15-minute job.',
        concept: `**Draw essentials:**
- LINE — segments; C to close; U undo last segment.
- CIRCLE — center-radius (default), 2P, 3P, TTR (tangent-tangent-radius).
- ARC — 3-point default; start-center-end variants for precision.
- RECTANG — two corners; fillet/chamfer options before drawing.
- PLINE — polyline with width; one object, easier trim/fillet as a whole.
- POLYLINE vs LINE: a polyline is a single entity (one layer/color, closed area for hatch/area).

**Modify essentials:**
- TRIM (TR) — trim to cutting edges; select all = fence mode in newer releases.
- EXTEND (EX) — the dual of trim.
- OFFSET (O) — parallel copy at distance; workhorse for walls, ribs, stairs.
- FILLET (F) — round corner (radius R); CHAMFER — bevel.
- MIRROR (MI) — reflect; keep or delete source.
- ARRAY (AR) — rectangular, polar, path arrays with counts/spacing.
- MOVE (M) / COPY (CO) / SCALE (SC) / ROTATE (RO).

**Selection:** window (L→R) selects fully inside; crossing (R→L) selects touched. Fence for messy areas.`,
        extras: [
          table('Modify command map', ['Command', 'Typical use'], [
            ['OFFSET', 'Wall thickness, concentric ribs, stair treads'],
            ['TRIM/EXTEND', 'Clean intersections after offset'],
            ['FILLET R=0', 'Join two lines into a corner'],
            ['MIRROR', 'Symmetric halves of a part/elevation'],
            ['ARRAY polar', 'Bolt circles, column grids'],
          ]),
          tip(
            'Fillet radius 0 is a corner join',
            'F with R=0 and two lines snaps them into a sharp corner — faster than trim+extend.',
          ),
          warn(
            'SCALE breaks dimensions',
            'Scaling a dimensioned drawing without DIMLFAC/ annotative scaling lies about sizes. Prefer drawing to scale, not scaling annotated views.',
          ),
        ],
        worked: {
          title: 'Inner wall via offset and trim',
          problem: 'Outer rectangle 5000×3000. Create a 230-thick wall inner boundary and fillet the corners R=0.',
          steps: [
            { title: 'Outer rectangle', desc: 'RECTANG 0,0 → @5000,3000.' },
            { title: 'Offset inward', desc: 'OFFSET 230 → click inside the rectangle.' },
            { title: 'Clean edges', desc: 'Explode the outer rect if needed so offset produces clean parallel lines; or offset a polyline inward.' },
            { title: 'Close corners', desc: 'FILLET R=0 on each inner corner pair to close the ring.' },
          ],
          solution: 'Inner boundary offset 230 from all sides with clean corners.',
        },
        practice: {
          title: 'Bolt circle',
          prompt: 'Circle R=80; place 6 holes Ø10 on a bolt circle R=60 using polar array.',
          hint: 'Draw one hole with polar coordinates @60<0; ARRAY polar, 6 items, fill 360.',
        },
        mistakes: [
          {
            mistake: 'Trimming with the wrong cutting edges selected',
            fix: 'Select all relevant edges first, or use fence; in newer TRIM, hover-click works with implied edges.',
          },
          {
            mistake: 'Using LINE segments where a PLINE belongs',
            fix: 'Walls and outlines that will be offset/filleted/hatched are better as polylines.',
          },
        ],
        exam: {
          question: 'How do you make a rectangular array of 5 columns × 3 rows spaced 100 × 80?',
          answer: 'ARRAYRECT (or ARRAY rectangular): set columns 5, rows 3, column spacing 100, row spacing 80.',
          source: 'Standard modify-command assessment.',
        },
        summary: [
          'Draw with snaps; modify with OFFSET/TRIM/FILLET/ARRAY.',
          'Polylines unify geometry for edit and hatch.',
          'Fillet R=0 joins corners; arrays replace manual copying.',
        ],
      }),
      [
        [
          'FILLET with radius 0 between two lines:',
          ['Creates a rounded corner', 'Joins them into a sharp corner', 'Deletes both', 'Offsets them'],
          1,
          'Common drafting shortcut.',
        ],
        [
          'Best entity for a wall outline to be offset and hatched:',
          ['Separate LINEs', 'One POLYLINE', 'SPLINE', 'TEXT'],
          1,
          'Single object, closed area.',
        ],
        [
          'Polar array is typical for:',
          ['Grids of rectangles only', 'Bolt circles and radial patterns', 'Text styles', 'Layers'],
          1,
          'Items on a circle at equal angles.',
        ],
      ]
    ),
  ],
};
