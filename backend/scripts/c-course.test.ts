import { M1 } from '../src/data/cCourse/modules/m01';
import { M2 } from '../src/data/cCourse/modules/m02';
import { M3 } from '../src/data/cCourse/modules/m03';
import { M4 } from '../src/data/cCourse/modules/m04';
import { M5 } from '../src/data/cCourse/modules/m05';
import { M6 } from '../src/data/cCourse/modules/m06';
import { M7 } from '../src/data/cCourse/modules/m07';
import { M8 } from '../src/data/cCourse/modules/m08';
import { M9 } from '../src/data/cCourse/modules/m09';
import { M10 } from '../src/data/cCourse/modules/m10';
import { M11 } from '../src/data/cCourse/modules/m11';
import { M12 } from '../src/data/cCourse/modules/m12';
import { M13 } from '../src/data/cCourse/modules/m13';
import { M14 } from '../src/data/cCourse/modules/m14';
import { M15 } from '../src/data/cCourse/modules/m15';

const mods = [M1, M2, M3, M4, M5, M6, M7, M8, M9, M10, M11, M12, M13, M14, M15];
const errs: string[] = [];
const seenIds = new Set<string>();

function fail(where: string, msg: string) {
  errs.push(`${where}: ${msg}`);
}
function isArr(v: any) { return Array.isArray(v); }

for (const m of mods) {
  const mids = new Set<string>();
  if (mids.has(m.id)) fail(m.id, 'duplicate module id');
  mids.add(m.id);
  let lessonOrder = new Set<number>();
  for (const les of m.lessons) {
    if (seenIds.has(les.id)) fail(m.id, `duplicate lesson id ${les.id}`);
    seenIds.add(les.id);
    if (lessonOrder.has(les.sort_order)) fail(les.id, `duplicate lesson sort_order ${les.sort_order}`);
    lessonOrder.add(les.sort_order);
    if (!les.quiz && (!les.blocks || les.blocks.length === 0)) fail(les.id, 'lesson has no content');

    const blockIds = new Set<string>();
    let order = 0;
    for (const b of les.blocks) {
      order += 1;
      if (blockIds.has(b.id)) fail(les.id, `duplicate block id ${b.id}`);
      blockIds.add(b.id);
      if (b.block_order !== order) fail(b.id, `block_order ${b.block_order} != position ${order}`);
      if (b.block_type !== 'animation') continue;

      const kind = b.payload?.kind;
      const where = `${les.id}/${b.id} [${kind}]`;

      if (kind === 'types') {
        if (!isArr(b.payload.types) || b.payload.types.length === 0) fail(where, 'types array required');
        else b.payload.types.forEach((t: any, j: number) => {
          if (typeof t.name !== 'string' || !(typeof t.bytes === 'number' || typeof t.bytes === 'string')) {
            fail(where, `types[${j}] needs a name and bytes (number or string)`);
          }
          if (typeof t.signed !== 'string' || typeof t.unsigned !== 'string') fail(where, `types[${j}] needs signed/unsigned strings`);
        });
        if (!isArr(b.payload.demos) || b.payload.demos.length === 0) fail(where, 'demos array required');
        else b.payload.demos.forEach((d: any, j: number) => {
          if (typeof d.width !== 'number' || typeof d.signed !== 'boolean' || typeof d.start !== 'number') {
            fail(where, `demos[${j}] needs width/signed/start`);
          }
        });
        continue;
      }
      if (kind === 'pipeline') {
        if (!isArr(b.payload.stages) || b.payload.stages.length === 0) fail(where, 'stages array required');
        else b.payload.stages.forEach((st: any, j: number) => {
          if (typeof st.name !== 'string') fail(where, `stages[${j}] needs a name`);
        });
        continue;
      }

      const steps = b.payload?.steps;
      if (!isArr(steps) || steps.length === 0) { fail(where, 'no steps array'); continue; }

      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        const at = `${where} step ${i}`;
        if (typeof s?.caption !== 'string' || !s.caption.trim()) fail(at, 'missing caption');
        switch (kind) {
          case 'memory': {
            if (i === 0) {
              if (!isArr(b.payload.cells) || b.payload.cells.length === 0) fail(where, 'no initial cells');
              else b.payload.cells.forEach((c: any, j: number) => {
                if (!isArr(c.bytes) || c.bytes.length === 0) fail(`${where} cell ${j}`, 'bytes must be a non-empty array');
                if (c.bytes && c.bytes.some((x: any) => typeof x !== 'string')) fail(`${where} cell ${j}`, 'bytes must be strings');
              });
            }
            if (s.cells != null) {
              if (typeof s.cells !== 'object' || isArr(s.cells)) fail(at, 'cells patch must be an object keyed by index');
              else for (const k of Object.keys(s.cells)) {
                const idx = Number(k);
                const max = isArr(b.payload.cells) ? b.payload.cells.length : 0;
                if (!Number.isInteger(idx) || idx < 0 || idx >= max) fail(at, `cells patch index ${k} out of range (0..${max - 1})`);
              }
            }
            if (s.vars != null && !isArr(s.vars)) fail(at, 'vars must be an array');
            if (isArr(s.vars)) s.vars.forEach((v: any, j: number) => {
              if (typeof v.name !== 'string' || typeof v.value !== 'string') fail(at, `vars[${j}] needs name and value strings`);
              if (v.pointsTo != null && !Number.isInteger(v.pointsTo)) fail(at, `vars[${j}].pointsTo must be an integer`);
            });
            if (s.highlight != null && !isArr(s.highlight)) fail(at, 'highlight must be an array');
            break;
          }
          case 'passing': {
            if (!isArr(s.panes) || s.panes.length < 2) fail(at, 'needs at least two panes');
            else s.panes.forEach((p: any, j: number) => {
              if (typeof p.title !== 'string') fail(at, `panes[${j}] needs a title`);
              if (p.cells != null && !isArr(p.cells)) fail(at, `panes[${j}].cells must be an array`);
              if (isArr(p.cells)) p.cells.forEach((c: any, k: number) => {
                if (c.value == null) fail(at, `panes[${j}].cells[${k}] needs a value`);
              });
            });
            break;
          }
          case 'callstack': {
            if (!isArr(s.frames)) fail(at, 'frames must be an array');
            else s.frames.forEach((f: any, j: number) => {
              if (typeof f.fn !== 'string') fail(at, `frames[${j}] needs fn`);
            });
            break;
          }
          case 'trace': {
            if (s.vars != null && !isArr(s.vars)) fail(at, 'vars must be an array');
            if (isArr(s.vars)) s.vars.forEach((v: any, j: number) => {
              if (typeof v.name !== 'string' || typeof v.value !== 'string') fail(at, `vars[${j}] needs name and value`);
            });
            break;
          }
          case 'types': {
            if (i === 0) {
              if (!isArr(b.payload.types) || b.payload.types.length === 0) fail(where, 'types array required');
              if (!isArr(b.payload.demos) || b.payload.demos.length === 0) fail(where, 'demos array required');
              else b.payload.demos.forEach((d: any, j: number) => {
                if (typeof d.width !== 'number' || typeof d.signed !== 'boolean' || typeof d.start !== 'number') {
                  fail(where, `demos[${j}] needs width/signed/start`);
                }
              });
            }
            break;
          }
          case 'bits': {
            if (!isArr(s.fields) || s.fields.length === 0) fail(at, 'fields must be a non-empty array');
            else s.fields.forEach((f: any, j: number) => {
              if (typeof f.label !== 'string' || typeof f.bits !== 'number') fail(at, `fields[${j}] needs label and numeric bits`);
            });
            break;
          }
          case 'expression': {
            if (!s.node || typeof s.node.label !== 'string') fail(at, 'node with a label is required');
            break;
          }
          case 'pipeline': {
            if (i === 0 && (!isArr(b.payload.stages) || b.payload.stages.length === 0)) fail(where, 'stages array required');
            break;
          }
          case 'stackheap': {
            if (s.heap != null && !isArr(s.heap)) fail(at, 'heap must be an array');
            if (s.stack != null && !isArr(s.stack)) fail(at, 'stack must be an array');
            break;
          }
          case 'nodes': {
            if (!isArr(s.nodes)) fail(at, 'nodes must be an array');
            else {
              const ids = new Set<string>();
              s.nodes.forEach((n: any, j: number) => {
                if (typeof n.id !== 'string' || typeof n.data !== 'string') fail(at, `nodes[${j}] needs id and data`);
                if (ids.has(n.id)) fail(at, `duplicate node id ${n.id}`);
                ids.add(n.id);
              });
              s.nodes.forEach((n: any, j: number) => {
                if (n.pointsTo != null && !ids.has(n.pointsTo)) fail(at, `nodes[${j}].pointsTo "${n.pointsTo}" has no matching node`);
              });
            }
            break;
          }
          case 'step': {
            if (typeof s.title !== 'string' || typeof s.desc !== 'string') fail(at, 'step kind needs title and desc');
            break;
          }
          default:
            fail(where, `unknown animation kind "${kind}"`);
        }
      }
    }
  }
}

if (errs.length) {
  console.error(`FAIL: ${errs.length} animation/content problem(s):\n`);
  for (const e of errs) console.error('  - ' + e);
  process.exit(1);
}
console.log(`OK: ${mods.length} modules, ${mods.reduce((n, m) => n + m.lessons.length, 0)} lessons — animation schemas valid.`);
