// ============================================================================
// AUTOCAD FUNDAMENTALS — flagship paid course (Phase 4 course 10).
//
// Interface and precision drawing, layers/blocks/annotation, drafting
// workflows and paper-space plotting, plus collaboration and portfolio.
// Four modules, eight lessons on the 9-block standard, 30-question exam bank.
// Priced at ₹999.
// ============================================================================

import type { Course, ExamQuestion } from '../db';
import { module1 } from './module1';
import { module2 } from './module2';
import { module3 } from './module3';
import { module4 } from './module4';

const examBank: ExamQuestion[] = [
  {
    id: 'cad-exam-01',
    prompt: 'Relative polar input @100<45 means:',
    options: ['Absolute point 100,45', '100 units at 45° from the last point', 'Grid snap 100', 'Scale 45%'],
    correct_index: 1,
    explanation: '@ = relative to last point; < introduces the angle.',
    difficulty: 'easy',
    topic: 'Input',
  },
  {
    id: 'cad-exam-02',
    prompt: 'OSNAP endpoint snaps to:',
    options: ['Midpoint of a line', 'The end of a line or arc', 'Circle center', 'Grid intersection'],
    correct_index: 1,
    explanation: 'Endpoint geometry.',
    difficulty: 'easy',
    topic: 'OSNAP',
  },
  {
    id: 'cad-exam-03',
    prompt: 'Drawing units are configured with:',
    options: ['GRID', 'SNAP', 'UNITS', 'LIMITS only'],
    correct_index: 2,
    explanation: 'UNITS sets type and precision.',
    difficulty: 'easy',
    topic: 'Setup',
  },
  {
    id: 'cad-exam-04',
    prompt: 'Without the @ prefix, coordinate input is:',
    options: ['Relative', 'Absolute', 'Polar only', 'Ignored'],
    correct_index: 1,
    explanation: 'Typed coordinates are absolute from the origin.',
    difficulty: 'easy',
    topic: 'Input',
  },
  {
    id: 'cad-exam-05',
    prompt: 'FILLET with radius 0 between two lines:',
    options: ['Creates a round', 'Joins them into a sharp corner', 'Deletes both', 'Offsets them'],
    correct_index: 1,
    explanation: 'Common corner-join shortcut.',
    difficulty: 'easy',
    topic: 'Modify',
  },
  {
    id: 'cad-exam-06',
    prompt: 'Best entity type for a wall outline to offset and hatch:',
    options: ['Separate LINE entities', 'One POLYLINE', 'SPLINE', 'TEXT'],
    correct_index: 1,
    explanation: 'Single object with a closed area.',
    difficulty: 'easy',
    topic: 'Modify',
  },
  {
    id: 'cad-exam-07',
    prompt: 'Polar ARRAY is typical for:',
    options: ['Text styles only', 'Bolt circles and radial patterns', 'Layer management', 'Plotting'],
    correct_index: 1,
    explanation: 'Equal angular spacing on a circle.',
    difficulty: 'easy',
    topic: 'Modify',
  },
  {
    id: 'cad-exam-08',
    prompt: 'Production best practice for object color is:',
    options: ['Hard-code every color', 'ByLayer', 'ByBlock always', 'Random'],
    correct_index: 1,
    explanation: 'Layer owns appearance for CTB control.',
    difficulty: 'easy',
    topic: 'Layers',
  },
  {
    id: 'cad-exam-09',
    prompt: 'Layer 0 should mainly contain:',
    options: ['All project walls', 'Block definition internals', 'Dimensions only', 'Hatch only'],
    correct_index: 1,
    explanation: 'Block base convention.',
    difficulty: 'easy',
    topic: 'Layers',
  },
  {
    id: 'cad-exam-10',
    prompt: 'Freeze differs from layer Off mainly by:',
    options: ['Nothing', 'Unloading from display cache / regen impact', 'Deleting objects', 'Changing lineweight'],
    correct_index: 1,
    explanation: 'Performance and xref behavior.',
    difficulty: 'medium',
    topic: 'Layers',
  },
  {
    id: 'cad-exam-11',
    prompt: 'Block base point is:',
    options: ['Always the bounding-box center', 'The insertion reference point', 'The first layer used', 'Unused'],
    correct_index: 1,
    explanation: 'Aligns to the cursor on insert.',
    difficulty: 'easy',
    topic: 'Blocks',
  },
  {
    id: 'cad-exam-12',
    prompt: 'Title-block project name is best stored as:',
    options: ['Hardcoded TEXT per sheet', 'An ATTRIB value in the block', 'A hatch', 'An xline'],
    correct_index: 1,
    explanation: 'Editable per insert.',
    difficulty: 'easy',
    topic: 'Blocks',
  },
  {
    id: 'cad-exam-13',
    prompt: 'Associative hatch means:',
    options: ['It cannot be edited', 'It updates when its boundary changes', 'It is non-plotting', 'It is a block'],
    correct_index: 1,
    explanation: 'Boundary-linked fill.',
    difficulty: 'easy',
    topic: 'Hatch',
  },
  {
    id: 'cad-exam-14',
    prompt: 'Poché in a section represents:',
    options: ['Furniture only', 'Materials cut by the section plane', 'Grid bubbles', 'Text styles'],
    correct_index: 1,
    explanation: 'Cut material fill.',
    difficulty: 'easy',
    topic: 'Drafting',
  },
  {
    id: 'cad-exam-15',
    prompt: 'A section view is located from:',
    options: ['The elevation only', 'The section cut line on the plan', 'The CTB file', 'Layer names'],
    correct_index: 1,
    explanation: 'Marker links plan to view.',
    difficulty: 'easy',
    topic: 'Drafting',
  },
  {
    id: 'cad-exam-16',
    prompt: 'Professional drawings are typically composed in:',
    options: ['Model space fit-to-page', 'Paper space viewports at defined scales', 'Word', 'Excel only'],
    correct_index: 1,
    explanation: 'Layouts with scaled viewports.',
    difficulty: 'easy',
    topic: 'Plot',
  },
  {
    id: 'cad-exam-17',
    prompt: 'ZOOM 1/100xp inside a viewport sets the view scale to:',
    options: ['1:1', '1:100', '100:1', 'Paper space only'],
    correct_index: 1,
    explanation: 'xp = times paper scale.',
    difficulty: 'medium',
    topic: 'Plot',
  },
  {
    id: 'cad-exam-18',
    prompt: 'After setting viewport scale you should:',
    options: ['Leave it unlocked', 'Lock the viewport', 'Explode it', 'Purge it'],
    correct_index: 1,
    explanation: 'Prevents accidental zoom/pan from breaking scale.',
    difficulty: 'easy',
    topic: 'Plot',
  },
  {
    id: 'cad-exam-19',
    prompt: 'A missing CTB at plot time causes:',
    options: ['Faster plot', 'Lineweights/colors not mapping to print as intended', 'Lost xrefs', 'Unit change'],
    correct_index: 1,
    explanation: 'CTB maps screen color to plot properties.',
    difficulty: 'medium',
    topic: 'Plot',
  },
  {
    id: 'cad-exam-20',
    prompt: 'Xref overlay vs attach: overlay will:',
    options: ['Always explode', 'Not be nested when the host is xrefed elsewhere', 'Plot doubled', 'Change units'],
    correct_index: 1,
    explanation: 'Avoids unwanted nested references.',
    difficulty: 'medium',
    topic: 'Xrefs',
  },
  {
    id: 'cad-exam-21',
    prompt: 'Broken xref paths after moving folders are best fixed with:',
    options: ['Purge', 'Relative paths / project search paths', 'Overkill', 'Explode'],
    correct_index: 1,
    explanation: 'Path management.',
    difficulty: 'easy',
    topic: 'Xrefs',
  },
  {
    id: 'cad-exam-22',
    prompt: 'Command to remove duplicate overlapping linework:',
    options: ['PURGE', 'OVERKILL', 'AUDIT', 'RENAME'],
    correct_index: 1,
    explanation: 'Deletes duplicate/short segments.',
    difficulty: 'easy',
    topic: 'Hygiene',
  },
  {
    id: 'cad-exam-23',
    prompt: 'AUDIT is used to:',
    options: ['Create attributes', 'Detect and fix drawing errors', 'Plot layouts', 'Make blocks'],
    correct_index: 1,
    explanation: 'Drawing integrity check.',
    difficulty: 'easy',
    topic: 'Hygiene',
  },
  {
    id: 'cad-exam-24',
    prompt: 'External issue of a multi-xref project should use:',
    options: ['Email one host DWG', 'eTransmit', 'Screenshot', 'Print only'],
    correct_index: 1,
    explanation: 'Packages dependencies.',
    difficulty: 'easy',
    topic: 'Xrefs',
  },
  {
    id: 'cad-exam-25',
    prompt: 'DesignCenter is primarily for:',
    options: ['Rendering', 'Reusing layers/blocks/styles across drawings', 'Email', 'Scanning'],
    correct_index: 1,
    explanation: 'Content reuse browser.',
    difficulty: 'easy',
    topic: 'Tools',
  },
  {
    id: 'cad-exam-26',
    prompt: 'Sheet sets mainly help with:',
    options: ['Single part sketches', 'Multi-sheet project management and publish', 'Linetype loading', 'Hatch only'],
    correct_index: 1,
    explanation: 'Sheet set manager workflow.',
    difficulty: 'medium',
    topic: 'Tools',
  },
  {
    id: 'cad-exam-27',
    prompt: 'A strong junior CAD portfolio is:',
    options: ['100 random sketches', 'Few complete, scaled, annotated sheet sets', 'Only renders', 'Only tutorials'],
    correct_index: 1,
    explanation: 'Quality and completeness.',
    difficulty: 'easy',
    topic: 'Career',
  },
  {
    id: 'cad-exam-28',
    prompt: 'Blocks are drawn at 1:1 because:',
    options: ['Printers require half size', 'Insertion scale and office standards assume real units', 'It saves memory only', 'OSNAP requires it'],
    correct_index: 1,
    explanation: 'Real-unit libraries insert cleanly.',
    difficulty: 'easy',
    topic: 'Blocks',
  },
  {
    id: 'cad-exam-29',
    prompt: 'Annotative text helps when:',
    options: ['All plots are 1:1', 'Multiple viewport scales share one sheet', 'Hatching', 'Xref binding'],
    correct_index: 1,
    explanation: 'Text scales per viewport automatically.',
    difficulty: 'medium',
    topic: 'Annotation',
  },
  {
    id: 'cad-exam-30',
    prompt: 'Layer naming like A-WALL mainly improves:',
    options: ['File size only', 'Findability, standards and plot control', 'OSNAP speed', 'Undo depth'],
    correct_index: 1,
    explanation: 'Discipline-role naming is an industry standard.',
    difficulty: 'easy',
    topic: 'Layers',
  },
];

export function getAutoCADCourse(): Course {
  return {
    id: 'crs-autocad-fundamentals',
    slug: 'autocad-fundamentals',
    title: 'AutoCAD Fundamentals',
    subtitle:
      'Precision 2D drafting, layers and blocks, plotting and collaboration — skills architecture, civil and mechanical juniors are hired for',
    description: `AutoCAD remains the common language of 2D engineering documentation. This course takes you from a blank sheet to issued PDFs: units and coordinates, object snap, the draw/modify commands that dominate daily work, layer standards, blocks with attributes, dimensions, floor-plan and section workflows, paper-space viewports at true scale, plotting with CTB, xrefs and file hygiene, and a portfolio checklist aimed at junior drafting roles.

Four modules, eight lessons on the nine-step standard: objective, hook, concept, worked example, practice, common mistakes, exam angle, server-graded quiz and revision summary. A 30-question bank feeds the timed final; passing earns a verifiable TieEdu certificate.

**Who this is for:** students in architecture, civil, mechanical, interior design and related fields who need employable CAD habits — not just command trivia. Anyone who has "played with AutoCAD" but has never issued a correctly scaled sheet will find the missing pieces here.

**What you need:** AutoCAD, BricsCAD or a compatible 2D CAD package with a free trial or lab license. Exercises use real-unit drafting (mm).`,
    category: 'Design & CAD',
    level: 'beginner',
    is_free: false,
    price_inr: 999,
    thumbnail_url: '',
    thumbnail_alt: 'AutoCAD Fundamentals course cover',
    tags: ['autocad', 'cad', 'drafting', 'architecture', 'civil', 'mechanical', 'plotting'],
    outcomes: [
      'Set units, coordinates and object snap for accurate production drawing',
      'Use core draw and modify commands including offset, trim, fillet and array',
      'Organize drawings with disciplined layers and ByLayer properties',
      'Create reusable blocks with attributes for symbols and title blocks',
      'Draft plans and sections with correct hatch and annotation habits',
      'Compose paper-space layouts with scaled, locked viewports',
      'Plot correct PDFs with CTB and manage multi-sheet output',
      'Clean, xref and hand off files with professional hygiene practices',
    ],
    prerequisite_course_id: null,
    certificate_eligible: true,
    // Phase 4 decision: paid courses stay unpublished until payment infra lands.
    published: false,
    created_at: '2026-10-13T21:00:00.000Z',
    updated_at: '2026-10-13T21:00:00.000Z',
    instructor_id: null,
    about_course: `Most AutoCAD "crash courses" list commands and stop. Employers notice the difference between someone who can OFFSET a wall and someone who keeps layers, attributes, viewport scales and plot settings in order. This course teaches the production path from the first lesson: snap to geometry, modify with intent, annotate on layers, compose in paper space, and clean before you issue.

Architectural and civil examples drive Modules 1–3; Module 4 covers the collaboration habits (xrefs, audit, purge, eTransmit) and a portfolio structure junior drafters can finish in a weekend. The closing exam verifies both command knowledge and process judgment.`,
    prerequisites: [
      'A computer that can run AutoCAD, BricsCAD or similar',
      'Basic spatial drawing comfort (hand sketches help)',
    ],
    audience: [
      'Architecture, civil, mechanical and interior design students',
      'Junior drafters refreshing professional standards',
      'Site engineers who need to read and edit consultant DWGs',
      'Anyone preparing for a CAD-based internship or job test',
    ],
    audio_language: 'English',
    caption_language: 'English',
    branch: 'civil',
    branch_label: 'Civil/Mech/Architecture primary (open to all)',
    bucket: 'C',
    certificate_tier: 'professional',
    estimated_hours: 8,
    perks: [
      { key: 'certificate', label: 'Verifiable certificate' },
      { key: 'xp', label: 'XP on the leaderboard' },
    ],
    exam_prep: {
      target: 'Junior CAD tests, drafting interviews and software proficiency screens',
      units: [
        {
          title: 'Input, OSNAP & Draw/Modify',
          summary:
            'Absolute vs @relative vs @dist<angle. OSNAP endpoint/mid/center/int. OFFSET, TRIM, FILLET R=0, MIRROR, ARRAY. PLINE vs LINE.',
          questions: [
            'What does @100<45 mean?',
            'Why draw to osnap, not near?',
            'When is a polyline better than lines?',
          ],
          pyqs: [],
        },
        {
          title: 'Layers, Blocks & Annotation',
          summary:
            'ByLayer always; freeze vs off; block base point; ATTRIB title blocks; DIMSTYLE and association.',
          questions: [
            'Layer 0 conventions?',
            'Purpose of block base point?',
            'How do attributes differ from text?',
          ],
          pyqs: [],
        },
        {
          title: 'Drafting & Plotting',
          summary:
            'Plan → openings → hatch → annotate. Poché and section markers. Paper space viewports; zoom 1/100xp; lock; CTB plot to PDF.',
          questions: [
            'How do you set a viewport to 1:100?',
            'What is associative hatch?',
            'Why avoid model-space fit-to-page plots?',
          ],
          pyqs: [],
        },
        {
          title: 'Xrefs, Hygiene & Career',
          summary:
            'Overlay vs attach; relative paths; AUDIT, PURGE, OVERKILL, eTransmit. DesignCenter, sheet sets. Portfolio: few complete scaled annotated sets.',
          questions: [
            'When to use overlay?',
            'Name three cleanup commands.',
            'What makes a strong junior portfolio?',
          ],
          pyqs: [],
        },
      ],
      important_questions: [
        'Draw a 60-30 triangle with absolute and polar-relative coordinates.',
        'Offset a wall 230 and fillet corners to close a ring.',
        'Set up a four-layer plan and move objects ByLayer.',
        'Create a door block with a swing and insert it twelve times.',
        'Hatch a section poché with the correct pattern and scale.',
        'Compose an A3 layout at 1:100 with a locked viewport and plot PDF.',
        'Clean a bloated DWG with audit, purge and overkill; relink an xref.',
        'Produce a six-sheet portfolio PDF with title blocks filled via attributes.',
      ],
      previous_year_questions: [
        {
          year: '2024',
          question: 'Explain the difference between TRIM and EXTEND with an example.',
          solution: 'TRIM removes geometry up to a cutting edge; EXTEND lengthens to a boundary edge — dual operations.',
        },
        {
          year: '2023',
          question: 'How do you plot a plan at 1:100 on A3?',
          solution: 'Layout, page setup A3 + CTB, mview with standard scale 1:100 (or zoom 1/100xp), lock, plot layout.',
        },
        {
          year: '2025',
          question: 'What is the purpose of eTransmit?',
          solution: 'Packages the DWG with xrefs, fonts, CTB and related files so external recipients can open it correctly.',
        },
      ],
    },
    exam: {
      question_count: 15,
      duration_minutes: 30,
      passing_percent: 60,
      retake_cooldown_hours: 24,
      distinction_percent: 85,
      bank: examBank,
    },
    project: {
      title: 'Mini sheet set: plan + section + elevation to PDF',
      brief:
        'From scratch (not a tutorial copy): produce a simple enclosed space or small building bay — outer walls, one door, one window — as a three-view set. Requirements: correct units (mm); layered walls/openings/dims/text/hatch; door as a block with attribute tag; plan at 1:100 and a section at 1:50 in paper-space viewports on an A3 layout; title block with attributes (project, sheet, date, scale); associative hatch poché on cut walls; plot the layout to one multi-page PDF. Submit the PDF plus the DWG (or a zip with xrefs if any).',
      submission_hint: 'One PDF (plan + section + elevation sheets) and the source DWG/zip; title block attributes filled; scales correct on plot.',
      required_for_certificate: true,
    },
    modules: [module1, module2, module3, module4],
  };
}
