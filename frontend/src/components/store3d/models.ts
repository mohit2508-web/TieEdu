/**
 * TiEEdu swag as real-time 3D models (STORE_3D_SHOWCASE_AND_SPEED_PLAN.md §B3).
 * Built in code with three.js: no downloaded models, so nothing to license.
 * Prints are drawn on canvases from public/logo.svg; the logo is drawn as it is
 * and its colours are never changed. An admin's uploaded artwork, when present,
 * replaces the default print.
 *
 * Every builder returns a group standing on y = 0, about 2 units tall, facing +z.
 */
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type ModelKey = 'bottle' | 'mug' | 'tshirt' | 'hoodie' | 'cap' | 'stickers' | 'keychain' | 'notebook' | 'kit';
export const MODEL_KEYS: ModelKey[] = ['bottle', 'mug', 'tshirt', 'hoodie', 'cap', 'stickers', 'keychain', 'notebook', 'kit'];

export interface ModelOpts {
  logo: HTMLImageElement;
  /** Main colour (hex), for items that come in colours. */
  color?: string;
  printFront?: HTMLImageElement | null;
  printBack?: HTMLImageElement | null;
  /** Shown on the welcome card in the kit box. */
  name?: string;
  /** Fewer segments for phones. */
  lite?: boolean;
}
export interface Built {
  root: THREE.Group;
  /** Called every frame with elapsed seconds. */
  animate?: (t: number, dt: number) => void;
  /** The kit box: open (true) or close the lid. */
  setOpen?: (open: boolean) => void;
}

export const BRAND_ORANGE = '#F84109';
const LOGO_RATIO = 2590 / 1664;
const INK = '#141414';
const BONE = '#ECE6DA';
const isLight = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 > 150;
};

// ---------------------------------------------------------------------------
// Canvas helpers
// ---------------------------------------------------------------------------
function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { c, g: c.getContext('2d')! };
}
function tex(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}
/** The logo at width w, centred on (cx, cy). Colours untouched. */
function drawLogo(g: CanvasRenderingContext2D, logo: HTMLImageElement, cx: number, cy: number, w: number) {
  const h = w / LOGO_RATIO;
  g.drawImage(logo, cx - w / 2, cy - h / 2, w, h);
}
/** An uploaded artwork, fitted inside a box centred on (cx, cy). */
function drawFit(g: CanvasRenderingContext2D, img: HTMLImageElement, cx: number, cy: number, bw: number, bh: number) {
  const r = Math.min(bw / img.naturalWidth, bh / img.naturalHeight);
  const w = img.naturalWidth * r, h = img.naturalHeight * r;
  g.drawImage(img, cx - w / 2, cy - h / 2, w, h);
}
function text(g: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, opts: { weight?: number; font?: string; align?: CanvasTextAlign; spacing?: number } = {}) {
  g.save();
  g.fillStyle = color;
  g.textAlign = opts.align || 'center';
  g.textBaseline = 'middle';
  g.font = `${opts.weight || 800} ${size}px ${opts.font || '"Barlow", "Inter", "Segoe UI", Arial, sans-serif'}`;
  if (opts.spacing && 'letterSpacing' in g) (g as any).letterSpacing = `${opts.spacing}px`;
  g.fillText(s, x, y);
  g.restore();
}
function rrect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
/** Fine knit for fabric bump maps. */
function knitBump(seed = 1) {
  const { c, g } = canvas(256, 256);
  g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < 256; y += 4) {
    for (let x = 0; x < 256; x += 4) {
      const v = 110 + rnd() * 50 + ((x / 4 + y / 4) % 2 ? 18 : -18);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(x, y, 4, 2);
    }
  }
  const t = tex(c, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 10);
  return t;
}
/** Vertical brushed-metal streaks. */
function brushed(vertical = true) {
  const { c, g } = canvas(512, 64);
  g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, 512, 64);
  for (let i = 0; i < 900; i++) {
    const v = 90 + Math.random() * 90;
    g.fillStyle = `rgba(${v},${v},${v},0.5)`;
    vertical ? g.fillRect(Math.random() * 512, 0, 1, 64) : g.fillRect(0, Math.random() * 64, 512, 1);
  }
  const t = tex(c, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------
const steel = () => new THREE.MeshPhysicalMaterial({ color: '#c9ccd1', metalness: 1, roughness: 0.32, bumpMap: brushed(), bumpScale: 0.6, clearcoat: 0.2 });
const fabric = (map: THREE.Texture, bump: THREE.Texture, light: boolean) =>
  new THREE.MeshPhysicalMaterial({ map, bumpMap: bump, bumpScale: 1.2, roughness: light ? 0.86 : 0.93, metalness: 0, sheen: 0.6, sheenRoughness: 0.8, sheenColor: new THREE.Color(light ? '#ffffff' : '#555555') });

// ---------------------------------------------------------------------------
// Inflated garments: an extruded silhouette, puffed in the middle like real fabric.
// Front, back and edge get their own materials, so front and back prints differ.
// ---------------------------------------------------------------------------
interface GarmentSpec { right: Array<[number, number]>; depth: number; puff: number }
function silhouette(spec: GarmentSpec) {
  const pts = spec.right;
  const left = [...pts].reverse().map(([x, y]) => [-x, y] as [number, number]).filter(([x]) => x !== 0);
  const all = [...pts, ...left];
  const shape = new THREE.Shape();
  // Smooth outline through the points (Catmull-Rom, closed).
  const curve = new THREE.CatmullRomCurve3(all.map(([x, y]) => new THREE.Vector3(x, y, 0)), true, 'centripetal');
  const sm = curve.getPoints(220);
  shape.moveTo(sm[0].x, sm[0].y);
  for (const p of sm.slice(1)) shape.lineTo(p.x, p.y);
  return shape;
}
function garmentGeometry(spec: GarmentSpec, lite?: boolean) {
  const shape = silhouette(spec);
  let geo: THREE.BufferGeometry = new THREE.ExtrudeGeometry(shape, {
    depth: spec.depth, bevelEnabled: true, bevelThickness: spec.depth * 0.55, bevelSize: 0.05, bevelSegments: lite ? 4 : 8, curveSegments: 1, steps: 1,
  });
  geo.translate(0, 0, -spec.depth / 2);
  geo.deleteAttribute('normal');
  geo.deleteAttribute('uv');
  geo = mergeVertices(geo, 1e-4);
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const w = bb.max.x - bb.min.x, h = bb.max.y - bb.min.y, cx = (bb.max.x + bb.min.x) / 2, cy = (bb.max.y + bb.min.y) / 2;
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    uv[i * 2] = (x - bb.min.x) / w;
    uv[i * 2 + 1] = (y - bb.min.y) / h;
    // Puff: thicker in the middle, thin at the edges.
    const nx = (x - cx) / (w / 2), ny = (y - cy) / (h / 2);
    const f = Math.max(0, 1 - nx * nx * 0.9 - ny * ny * 0.55);
    pos.setZ(i, z * (1 + spec.puff * f));
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  // Re-order triangles: front (+z), back (-z), edges.
  const idx = geo.index!.array;
  const front: number[] = [], back: number[] = [], side: number[] = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < idx.length; i += 3) {
    a.fromBufferAttribute(pos, idx[i]); b.fromBufferAttribute(pos, idx[i + 1]); c.fromBufferAttribute(pos, idx[i + 2]);
    n.subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b)).normalize();
    const tri = [idx[i], idx[i + 1], idx[i + 2]];
    (n.z > 0.55 ? front : n.z < -0.55 ? back : side).push(...tri);
  }
  geo.setIndex([...front, ...back, ...side]);
  geo.clearGroups();
  geo.addGroup(0, front.length, 0);
  geo.addGroup(front.length, back.length, 1);
  geo.addGroup(front.length + back.length, side.length, 2);
  return { geo, bb, w, h, surfaceZ: (x: number, y: number) => {
    const nx = (x - cx) / (w / 2), ny = (y - cy) / (h / 2);
    return (spec.depth / 2 + spec.depth * 0.55) * (1 + spec.puff * Math.max(0, 1 - nx * nx * 0.9 - ny * ny * 0.55));
  } };
}
/** Canvas mapped to the garment's front or back: draw(g, toPx) with garment coords. */
function garmentCanvas(bb: THREE.Box3, w: number, h: number, base: string, draw: (g: CanvasRenderingContext2D, px: (x: number, y: number) => [number, number], s: number) => void, mirror = false) {
  const cw = 1024, ch = Math.round(1024 * (h / w));
  const { c, g } = canvas(cw, ch);
  g.fillStyle = base; g.fillRect(0, 0, cw, ch);
  const px = (x: number, y: number): [number, number] => [(x - bb.min.x) / w * cw, (1 - (y - bb.min.y) / h) * ch];
  draw(g, px, cw / w);
  const t = tex(c);
  if (mirror) { t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1; }
  return t;
}
const seam = (g: CanvasRenderingContext2D, light: boolean) => { g.strokeStyle = light ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.07)'; g.lineWidth = 3; g.setLineDash([8, 6]); };
const rib = (g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, light: boolean) => {
  g.save(); g.strokeStyle = light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'; g.lineWidth = 2;
  for (let x = x0; x < x1; x += 7) { g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.stroke(); }
  g.restore();
};

function tshirt(o: ModelOpts): Built {
  const color = o.color || INK, light = isLight(color);
  const spec: GarmentSpec = {
    depth: 0.16, puff: 1.1,
    right: [[0, 0], [0.48, 0.0], [0.52, 0.04], [0.53, 0.5], [0.54, 1.0], [0.88, 0.8], [1.03, 1.1], [0.66, 1.47], [0.27, 1.56], [0.19, 1.5], [0.1, 1.44], [0, 1.42]],
  };
  const { geo, bb, w, h, surfaceZ } = garmentGeometry(spec, o.lite);
  const front = garmentCanvas(bb, w, h, color, (g, px, s) => {
    seam(g, light);
    for (const sx of [-1, 1]) { const [a, b] = px(0.54 * sx, 1.0), [c, d] = px(0.66 * sx, 1.46); g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); }
    g.setLineDash([]);
    rib(g, px(-0.5, 0)[0], px(0, 0.06)[1], px(0.5, 0)[0], px(0, 0)[1], light);
    const [cx, cy] = px(0, 1.08);
    if (o.printFront) drawFit(g, o.printFront, cx, cy, 0.62 * s, 0.5 * s);
    else drawLogo(g, o.logo, cx, cy, 0.52 * s);
  });
  const back = garmentCanvas(bb, w, h, color, (g, px, s) => {
    const ink = light ? INK : '#F4EFE6';
    if (o.printBack) { const [cx, cy] = px(0, 0.9); drawFit(g, o.printBack, cx, cy, 0.8 * s, 0.75 * s); return; }
    const [lx, ly] = px(0, 1.3); drawLogo(g, o.logo, lx, ly, 0.2 * s);
    const [tx, ty] = px(0, 0.95);
    text(g, 'CODE.', tx, ty - 0.13 * s, 0.13 * s, ink, { spacing: 6 });
    text(g, 'CRACK.', tx, ty, 0.13 * s, BRAND_ORANGE, { spacing: 6 });
    text(g, 'REPEAT.', tx, ty + 0.13 * s, 0.13 * s, ink, { spacing: 6 });
    text(g, 'PRACTISE DAILY · TIEEDU.IN', tx, ty + 0.27 * s, 0.035 * s, ink, { weight: 600, spacing: 4 });
  }, true);
  const bump = knitBump(3);
  const edge = new THREE.MeshStandardMaterial({ color, roughness: 0.95, bumpMap: bump, bumpScale: 1 });
  const mesh = new THREE.Mesh(geo, [fabric(front, bump, light), fabric(back, bump, light), edge]);
  const root = new THREE.Group();
  root.add(mesh);
  // Ribbed collar.
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.028, 12, 64, Math.PI), new THREE.MeshStandardMaterial({ color, roughness: 0.9, bumpMap: bump, bumpScale: 2 }));
  collar.rotation.z = Math.PI; collar.scale.set(1.25, 0.65, 1);
  collar.position.set(0, 1.56, surfaceZ(0, 1.44) - 0.04);
  collar.rotation.x = -0.25;
  root.add(collar);
  root.position.y = 0.05;
  return { root };
}

function hoodie(o: ModelOpts): Built {
  const color = o.color || INK, light = isLight(color);
  const spec: GarmentSpec = {
    depth: 0.24, puff: 1.0,
    right: [[0, 0], [0.54, 0.0], [0.57, 0.1], [0.58, 0.55], [0.6, 0.98], [0.7, 0.16], [0.74, 0.06], [0.94, 0.08], [0.97, 0.2], [0.9, 0.86], [0.78, 1.28], [0.6, 1.46], [0.44, 1.56], [0.4, 1.78], [0.3, 1.98], [0.14, 2.07], [0, 2.09]],
  };
  const { geo, bb, w, h, surfaceZ } = garmentGeometry(spec, o.lite);
  const shade = light ? 'rgba(60,45,30,0.22)' : 'rgba(0,0,0,0.55)';
  const front = garmentCanvas(bb, w, h, color, (g, px, s) => {
    // Hood opening.
    const [hx, hy] = px(0, 1.68);
    const grad = g.createRadialGradient(hx, hy, 0.05 * s, hx, hy, 0.34 * s);
    grad.addColorStop(0, light ? 'rgba(40,30,20,0.55)' : 'rgba(0,0,0,0.85)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.beginPath(); g.ellipse(hx, hy, 0.27 * s, 0.33 * s, 0, 0, Math.PI * 2); g.fill();
    // Kangaroo pocket.
    const [p1x, p1y] = px(-0.36, 0.62), [p2x, p2y] = px(0.36, 0.62), [p3x, p3y] = px(0.44, 0.2), [p4x, p4y] = px(-0.44, 0.2);
    g.fillStyle = shade; g.globalAlpha = 0.35;
    g.beginPath(); g.moveTo(p1x, p1y); g.lineTo(p2x, p2y); g.lineTo(p3x, p3y); g.lineTo(p4x, p4y); g.closePath(); g.fill();
    g.globalAlpha = 1; seam(g, light); g.stroke(); g.setLineDash([]);
    // Ribbed cuffs and waistband.
    rib(g, px(-0.57, 0)[0], px(0, 0.12)[1], px(0.57, 0)[0], px(0, 0)[1], light);
    for (const sx of [-1, 1]) rib(g, px(sx < 0 ? -1 : 0.72, 0)[0], px(0, 0.24)[1], px(sx < 0 ? -0.72 : 1, 0)[0], px(0, 0.08)[1], light);
    // Chest print.
    const [cx, cy] = px(0, 1.1);
    if (o.printFront) drawFit(g, o.printFront, cx, cy, 0.6 * s, 0.4 * s);
    else drawLogo(g, o.logo, cx, cy, 0.46 * s);
    // Sleeve print.
    text(g, 'EST. 2026', ...px(-0.83, 0.62), 0.045 * s, light ? INK : '#F4EFE6', { weight: 700, spacing: 5 });
  });
  const back = garmentCanvas(bb, w, h, color, (g, px, s) => {
    const ink = light ? INK : '#F4EFE6';
    if (o.printBack) { const [cx, cy] = px(0, 0.85); drawFit(g, o.printBack, cx, cy, 0.85 * s, 0.75 * s); return; }
    seam(g, light); const [a, b] = px(0, 2.05), [c, d] = px(0, 1.45); g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); g.setLineDash([]);
    const [tx, ty] = px(0, 0.95);
    drawLogo(g, o.logo, tx, ty - 0.26 * s, 0.36 * s);
    text(g, 'TRAIN · TEST · TRACK', tx, ty + 0.02 * s, 0.07 * s, ink, { spacing: 6 });
    text(g, 'one problem a day', tx, ty + 0.13 * s, 0.05 * s, BRAND_ORANGE, { weight: 600, font: '"JetBrains Mono", Consolas, monospace' });
  }, true);
  const bump = knitBump(7);
  bump.repeat.set(7, 7);
  const edge = new THREE.MeshStandardMaterial({ color, roughness: 0.95, bumpMap: bump, bumpScale: 1.4 });
  const root = new THREE.Group();
  root.add(new THREE.Mesh(geo, [fabric(front, bump, light), fabric(back, bump, light), edge]));
  // Drawstrings with metal tips.
  const cord = new THREE.MeshStandardMaterial({ color: light ? '#d9d2c4' : '#2a2a2a', roughness: 0.7 });
  const tip = new THREE.MeshPhysicalMaterial({ color: '#c9ccd1', metalness: 1, roughness: 0.25 });
  for (const sx of [-1, 1]) {
    const x0 = 0.11 * sx;
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x0, 1.46, surfaceZ(x0, 1.46) + 0.01),
      new THREE.Vector3(x0 * 1.1, 1.22, surfaceZ(x0, 1.22) + 0.03),
      new THREE.Vector3(x0 * 1.25, 1.0, surfaceZ(x0, 1.0) + 0.03),
    ]);
    root.add(new THREE.Mesh(new THREE.TubeGeometry(path, 24, 0.012, 8), cord));
    const aglet = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.07, 12), tip);
    aglet.position.copy(path.getPoint(1)).add(new THREE.Vector3(0, -0.03, 0));
    root.add(aglet);
  }
  root.position.y = 0.04;
  return { root };
}

// ---------------------------------------------------------------------------
// Lathe items: bottle and mug. Lathe UV u runs round the item; the mesh is
// turned half a turn so u = 0.5 faces the viewer (where the logo goes).
// ---------------------------------------------------------------------------
function profile(rAt: (y: number) => number, y0: number, y1: number, n: number, openTop = false) {
  const pts: THREE.Vector2[] = [new THREE.Vector2(0.0001, y0)];
  for (let i = 0; i <= n; i++) { const y = y0 + ((y1 - y0) * i) / n; pts.push(new THREE.Vector2(rAt(y), y)); }
  // An open top (a mug) keeps the same point count so texture v stays aligned.
  pts.push(openTop ? new THREE.Vector2(rAt(y1) - 0.0001, y1) : new THREE.Vector2(0.0001, y1));
  return pts;
}
function wrapCanvas(base: string, draw: (g: CanvasRenderingContext2D, W: number, H: number) => void, W = 2048, H = 1024) {
  const { c, g } = canvas(W, H);
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  draw(g, W, H);
  return tex(c);
}

function bottle(o: ModelOpts): Built {
  const color = o.color || '#17181A', light = isLight(color), isSteel = color.toLowerCase() === '#c9ccd1';
  const seg = o.lite ? 48 : 96;
  const H0 = 0.06, H1 = 1.78;
  const r = (y: number) => {
    if (y < 0.1) return 0.33 + 0.02 * Math.sin((y / 0.1) * Math.PI / 2);
    if (y < 1.45) return 0.35;
    if (y < 1.7) { const t = (y - 1.45) / 0.25; return 0.35 - 0.13 * (1 - Math.cos(t * Math.PI)) / 2 * 1.0; }
    return 0.22;
  };
  // v runs from the bottom point to the top point; profile has n+3 points.
  const n = 80;
  const map = wrapCanvas(color, (g, W, H) => {
    const vAt = (y: number) => H - ((1 + ((y - H0) / (H1 - H0)) * n) / (n + 2)) * H;
    const ink = light || isSteel ? INK : '#F4EFE6';
    if (o.printFront) drawFit(g, o.printFront, W * 0.5, vAt(0.8), W * 0.2, H * 0.45);
    else drawLogo(g, o.logo, W * 0.5, vAt(0.82), W * 0.17);
    // Up the back: centred on the seam (u = 0 / 1), drawn at both edges so the halves meet.
    for (const x of [0, W]) {
      g.save(); g.translate(x, vAt(0.8)); g.rotate(-Math.PI / 2);
      text(g, 'PRACTISE DAILY.', 0, 0, H * 0.05, ink, { spacing: 10 });
      g.restore();
    }
    text(g, '750 ML · KEEPS COLD 24 H · HOT 12 H', W * 0.5, vAt(0.22), H * 0.022, ink, { weight: 600, spacing: 5 });
  });
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile(r, H0, H1, n), seg),
    isSteel ? new THREE.MeshPhysicalMaterial({ map, color: '#ffffff', metalness: 0.95, roughness: 0.3, bumpMap: brushed(false), bumpScale: 0.4 })
      : new THREE.MeshPhysicalMaterial({ map, metalness: 0.15, roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.6 }));
  body.rotation.y = Math.PI;
  const root = new THREE.Group();
  root.add(body);
  const st = steel();
  const base = new THREE.Mesh(new THREE.LatheGeometry(profile((y) => 0.33 + 0.02 * Math.sin((y / 0.06) * Math.PI / 2), 0, H0, 6), seg), st);
  root.add(base);
  // Knurled cap and carry loop.
  const capGeo = new THREE.CylinderGeometry(0.215, 0.215, 0.26, seg, 1);
  const cp = capGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < cp.count; i++) {
    const x = cp.getX(i), z = cp.getZ(i), a = Math.atan2(z, x), rr = Math.hypot(x, z);
    if (rr > 0.2) { const k = 1 + 0.015 * Math.sign(Math.sin(a * 24)); cp.setX(i, x * k); cp.setZ(i, z * k); }
  }
  capGeo.computeVertexNormals();
  const cap = new THREE.Mesh(capGeo, isSteel ? new THREE.MeshStandardMaterial({ color: INK, roughness: 0.5 }) : st);
  cap.position.y = H1 + 0.13;
  root.add(cap);
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 14, 48, Math.PI), st);
  loop.position.y = H1 + 0.26;
  root.add(loop);
  return { root };
}

function mug(o: ModelOpts): Built {
  const color = o.color || INK, light = isLight(color);
  const seg = o.lite ? 48 : 96;
  const n = 40, H = 0.95;
  const map = wrapCanvas(color, (g, W, Hc) => {
    const ink = light ? INK : '#F4EFE6';
    const vy = (y: number) => Hc - ((1 + (y / H) * n) / (n + 2)) * Hc;
    if (o.printFront) drawFit(g, o.printFront, W * 0.5, vy(0.48), W * 0.24, Hc * 0.6);
    else drawLogo(g, o.logo, W * 0.5, vy(0.5), W * 0.2);
    // Back (opposite the logo): the line every student knows.
    // Centred on the seam (u = 0 / 1): drawn at both edges so the halves meet at the back.
    for (const x of [0, W]) {
      text(g, '// compiled at 2 AM', x, vy(0.54), Hc * 0.07, ink, { weight: 600, font: '"JetBrains Mono", Consolas, monospace' });
      text(g, '0 errors, 0 warnings', x, vy(0.38), Hc * 0.045, BRAND_ORANGE, { weight: 600, font: '"JetBrains Mono", Consolas, monospace' });
    }
  });
  const outerR = (y: number) => 0.42 + 0.01 * Math.sin((y / H) * Math.PI);
  const outer = new THREE.Mesh(new THREE.LatheGeometry(profile(outerR, 0, H, n, true), seg), new THREE.MeshPhysicalMaterial({ map, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 }));
  outer.rotation.y = Math.PI;
  const inner = new THREE.Mesh(new THREE.LatheGeometry(profile(() => 0.385, 0.08, H, 6, true), seg), new THREE.MeshPhysicalMaterial({ color: BRAND_ORANGE, roughness: 0.2, clearcoat: 1, side: THREE.DoubleSide }));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.402, 0.019, 12, seg), new THREE.MeshPhysicalMaterial({ color: light ? '#f2eee6' : '#1d1d1d', roughness: 0.25, clearcoat: 1 }));
  rim.rotation.x = Math.PI / 2; rim.position.y = H;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.055, 20, 48, Math.PI * 1.15), new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 }));
  handle.rotation.z = -Math.PI / 2 - Math.PI * 0.075;
  handle.position.set(0.44, 0.48, 0);
  handle.scale.set(1, 1.15, 1);
  const root = new THREE.Group();
  root.add(outer, inner, rim, handle);
  root.scale.setScalar(1.6);
  return { root };
}

// ---------------------------------------------------------------------------
// Cap
// ---------------------------------------------------------------------------
function cap(o: ModelOpts): Built {
  const color = o.color || INK, light = isLight(color);
  const W = 2048, Hc = 512;
  const map = wrapCanvas(color, (g) => {
    // SphereGeometry: u = 0.25 faces +z; v = 1 at the top, 0 at the band.
    g.strokeStyle = light ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)'; g.lineWidth = 4; g.setLineDash([10, 8]);
    for (let k = 0; k < 6; k++) { const x = ((k + 0.5) / 6) * W; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, Hc); g.stroke(); }
    g.setLineDash([]);
    if (o.printFront) drawFit(g, o.printFront, W * 0.25, Hc * 0.62, W * 0.13, Hc * 0.42);
    else drawLogo(g, o.logo, W * 0.25, Hc * 0.62, W * 0.12);
    text(g, 'TIEEDU', W * 0.75, Hc * 0.8, Hc * 0.08, light ? INK : '#F4EFE6', { spacing: 8 });
  }, W, Hc);
  const bump = knitBump(11); bump.repeat.set(16, 4);
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.62, o.lite ? 40 : 72, 32, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 1.2, roughness: 0.9, side: THREE.DoubleSide }));
  crown.scale.set(1, 0.82, 1.05);
  // Brim: a crescent, bent down at the front.
  const s = new THREE.Shape();
  // Outer edge sweeps out to the front (0, 1.25); inner edge follows the crown back.
  s.absellipse(0, 0, 0.6, 1.02, Math.PI, 0, true, 0);
  s.absellipse(0, 0, 0.62, 0.65, 0, Math.PI, false, 0);
  const brimGeo = new THREE.ExtrudeGeometry(s, { depth: 0.025, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 3, curveSegments: 64 });
  brimGeo.rotateX(Math.PI / 2);
  const bp = brimGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < bp.count; i++) { const z = bp.getZ(i); if (z > 0.55) bp.setY(i, bp.getY(i) - 0.1 * Math.pow((z - 0.55) / 0.47, 2)); }
  brimGeo.computeVertexNormals();
  const brim = new THREE.Mesh(brimGeo, new THREE.MeshStandardMaterial({ color, roughness: 0.88, bumpMap: bump, bumpScale: 1 }));
  brim.position.y = 0.02;
  const button = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
  button.position.y = 0.51; button.scale.y = 0.5;
  const root = new THREE.Group();
  root.add(crown, brim, button);
  root.scale.setScalar(1.5);
  root.position.y = 0.1;
  return { root };
}

// ---------------------------------------------------------------------------
// Stickers: die-cut, glossy, with a white border and a paper back.
// ---------------------------------------------------------------------------
type StickerDraw = (g: CanvasRenderingContext2D, S: number, logo: HTMLImageElement) => void;
const STICKERS: Array<{ w: number; h: number; draw: StickerDraw }> = [
  { w: 1.5, h: 1, draw: (g, S, logo) => { rrect(g, 30, 30, S * 1.5 - 60, S - 60, 60); g.fillStyle = '#FFF8EE'; g.fill(); drawLogo(g, logo, S * 0.75, S * 0.5, S * 1.2); } },
  { w: 1, h: 1, draw: (g, S) => { g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 30, 0, Math.PI * 2); g.fillStyle = BRAND_ORANGE; g.fill(); text(g, 'BRAIN', S / 2, S * 0.42, S * 0.17, '#FFFFFF'); text(g, 'ON', S / 2, S * 0.6, S * 0.17, '#141414'); } },
  { w: 1.6, h: 0.7, draw: (g, S) => { rrect(g, 30, 30, S * 1.6 - 60, S * 0.7 - 60, (S * 0.7 - 60) / 2); g.fillStyle = '#1F8F4E'; g.fill(); text(g, 'Accepted ✓', S * 0.8, S * 0.35, S * 0.16, '#FFFFFF'); } },
  { w: 1.6, h: 0.8, draw: (g, S) => {
    rrect(g, 30, 30, S * 1.6 - 60, S * 0.8 - 60, 40); g.fillStyle = '#1E1E1E'; g.fill();
    for (const [i, c] of ['#FF5F57', '#FEBC2E', '#28C840'].entries()) { g.beginPath(); g.arc(90 + i * 46, 90, 14, 0, Math.PI * 2); g.fillStyle = c; g.fill(); }
    text(g, '// compiled at 2 AM', S * 0.8, S * 0.42, S * 0.1, '#9CDCFE', { weight: 600, font: '"JetBrains Mono", Consolas, monospace' });
    text(g, '✔ 0 errors', S * 0.8, S * 0.58, S * 0.08, '#28C840', { weight: 600, font: '"JetBrains Mono", Consolas, monospace' });
  } },
  { w: 1, h: 1.2, draw: (g, S) => {
    rrect(g, 30, 30, S - 60, S * 1.2 - 60, 70); g.fillStyle = '#141414'; g.fill();
    g.beginPath(); const cx = S / 2, cy = S * 0.48;
    g.moveTo(cx, cy - S * 0.28); g.bezierCurveTo(cx + S * 0.26, cy - S * 0.02, cx + S * 0.2, cy + S * 0.22, cx, cy + S * 0.24); g.bezierCurveTo(cx - S * 0.2, cy + S * 0.22, cx - S * 0.26, cy - S * 0.02, cx, cy - S * 0.28);
    g.fillStyle = BRAND_ORANGE; g.fill();
    g.beginPath(); g.moveTo(cx, cy - S * 0.06); g.bezierCurveTo(cx + S * 0.12, cy + S * 0.06, cx + S * 0.08, cy + S * 0.2, cx, cy + S * 0.21); g.bezierCurveTo(cx - S * 0.08, cy + S * 0.2, cx - S * 0.12, cy + S * 0.06, cx, cy - S * 0.06); g.fillStyle = '#FEBC2E'; g.fill();
    text(g, '100', S / 2, S * 0.88, S * 0.16, '#FFFFFF'); text(g, 'DAY STREAK', S / 2, S * 1.02, S * 0.08, '#FFFFFF', { spacing: 3 });
  } },
  { w: 1.5, h: 0.75, draw: (g, S) => {
    rrect(g, 30, 30, S * 1.5 - 60, S * 0.75 - 60, 30); g.fillStyle = '#0F766E'; g.fill();
    g.strokeStyle = '#FFFFFF'; g.lineWidth = 18; g.lineCap = 'round'; g.beginPath(); g.moveTo(S * 0.2, S * 0.38); g.lineTo(S * 0.28, S * 0.46); g.lineTo(S * 0.42, S * 0.28); g.stroke();
    text(g, 'DRY RUN', S * 0.9, S * 0.3, S * 0.12, '#FFFFFF'); text(g, 'PASSED', S * 0.9, S * 0.46, S * 0.12, '#FEBC2E');
  } },
];
function stickerMesh(def: (typeof STICKERS)[number], logo: HTMLImageElement) {
  const S = 512;
  const W = Math.round(def.w * S), H = Math.round(def.h * S);
  const col = canvas(W, H), mask = canvas(W, H);
  def.draw(col.g, S, logo);
  // White die-cut border: the design's own outline, grown.
  const border = canvas(W, H);
  border.g.filter = 'blur(0px)';
  for (let a = 0; a < 16; a++) border.g.drawImage(col.c, Math.cos((a / 16) * Math.PI * 2) * 22, Math.sin((a / 16) * Math.PI * 2) * 22);
  border.g.globalCompositeOperation = 'source-in'; border.g.fillStyle = '#FFFFFF'; border.g.fillRect(0, 0, W, H);
  border.g.globalCompositeOperation = 'source-over'; border.g.drawImage(col.c, 0, 0);
  mask.g.drawImage(border.c, 0, 0); mask.g.globalCompositeOperation = 'source-in'; mask.g.fillStyle = '#FFFFFF'; mask.g.fillRect(0, 0, W, H);
  mask.g.globalCompositeOperation = 'destination-over'; mask.g.fillStyle = '#000000'; mask.g.fillRect(0, 0, W, H);
  const geo = new THREE.PlaneGeometry(def.w * 0.62, def.h * 0.62);
  const front = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map: tex(border.c), transparent: true, alphaTest: 0.5, clearcoat: 1, clearcoatRoughness: 0.05, roughness: 0.35 }));
  const back = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#E9E3D8', alphaMap: tex(mask.c, false), alphaTest: 0.5, roughness: 0.9 }));
  back.rotation.y = Math.PI; back.position.z = -0.004;
  const g = new THREE.Group(); g.add(front, back);
  return g;
}
function stickers(o: ModelOpts): Built {
  const root = new THREE.Group();
  const spots: Array<[number, number, number, number]> = [[-0.55, 1.45, 0.1, 0.08], [0.55, 1.5, -0.05, -0.12], [-0.62, 0.85, 0.05, -0.06], [0.6, 0.86, 0.12, 0.1], [-0.05, 0.3, 0.0, 0.05], [0.0, 1.1, 0.25, -0.03]];
  const items = STICKERS.map((d, i) => {
    const m = stickerMesh(d, o.logo);
    const [x, y, z, rz] = spots[i];
    m.position.set(x, y, z); m.rotation.z = rz; m.rotation.y = (i % 2 ? -1 : 1) * 0.15;
    root.add(m);
    return { m, y, phase: i * 1.3 };
  });
  return { root, animate: (t) => { for (const s of items) { s.m.position.y = s.y + Math.sin(t * 1.2 + s.phase) * 0.03; s.m.rotation.x = Math.sin(t * 0.8 + s.phase) * 0.08; } } };
}

// ---------------------------------------------------------------------------
// Notebook and keychain
// ---------------------------------------------------------------------------
function notebook(o: ModelOpts): Built {
  const W = 1.0, H = 1.4, D = 0.13;
  const cover = (front: boolean) => {
    const { c, g } = canvas(720, 1008);
    g.fillStyle = '#18181A'; g.fillRect(0, 0, 720, 1008);
    if (front) {
      drawLogo(g, o.logo, 360, 420, 360);
      text(g, 'PLACEMENT NOTEBOOK', 360, 640, 30, '#C8BFAF', { weight: 600, spacing: 8 });
    } else {
      text(g, 'O(1)  O(log n)  O(n)  O(n log n)  O(n²)', 360, 880, 22, '#8a8478', { weight: 600, font: '"JetBrains Mono", Consolas, monospace' });
    }
    return tex(c);
  };
  const pages = (() => { const { c, g } = canvas(64, 256); g.fillStyle = '#F4EEE2'; g.fillRect(0, 0, 64, 256); for (let y = 0; y < 256; y += 3) { g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(0, y, 64, 1); } return tex(c); })();
  const pageMat = new THREE.MeshStandardMaterial({ map: pages, roughness: 0.95 });
  const black = new THREE.MeshStandardMaterial({ color: '#18181A', roughness: 0.8 });
  const book = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [pageMat, black, pageMat, pageMat,
    new THREE.MeshStandardMaterial({ map: cover(true), roughness: 0.75 }), new THREE.MeshStandardMaterial({ map: cover(false), roughness: 0.75 })]);
  book.position.y = H / 2;
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.05, H + 0.004, D + 0.012), new THREE.MeshStandardMaterial({ color: BRAND_ORANGE, roughness: 0.6 }));
  band.position.set(W * 0.36, H / 2, 0);
  const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.3), new THREE.MeshStandardMaterial({ color: BRAND_ORANGE, side: THREE.DoubleSide, roughness: 0.5 }));
  ribbon.position.set(-0.2, -0.12, 0); ribbon.rotation.z = 0.12;
  const root = new THREE.Group();
  root.add(book, band, ribbon);
  root.position.y = 0.17;
  root.rotation.y = -0.25;
  return { root };
}

function keychain(o: ModelOpts): Built {
  // A rounded brushed-metal tag with the logo printed on and a line engraved under it.
  const W = 1.0, H = 0.64, R = 0.16;
  const shape = new THREE.Shape();
  shape.moveTo(-W / 2 + R, -H / 2);
  shape.lineTo(W / 2 - R, -H / 2); shape.quadraticCurveTo(W / 2, -H / 2, W / 2, -H / 2 + R);
  shape.lineTo(W / 2, H / 2 - R); shape.quadraticCurveTo(W / 2, H / 2, W / 2 - R, H / 2);
  shape.lineTo(-W / 2 + R, H / 2); shape.quadraticCurveTo(-W / 2, H / 2, -W / 2, H / 2 - R);
  shape.lineTo(-W / 2, -H / 2 + R); shape.quadraticCurveTo(-W / 2, -H / 2, -W / 2 + R, -H / 2);
  const hole = new THREE.Path(); hole.absarc(-W / 2 + 0.14, H / 2 - 0.14, 0.055, 0, Math.PI * 2, true); shape.holes.push(hole);
  const face = canvas(1000, 640);
  face.g.fillStyle = '#c3c7cd'; face.g.fillRect(0, 0, 1000, 640);
  drawLogo(face.g, o.logo, 540, 270, 520);
  text(face.g, 'ONE PROBLEM A DAY', 540, 520, 46, '#5b5f66', { weight: 700, spacing: 10 });
  const map = tex(face.c);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 4, curveSegments: 24 });
  geo.translate(0, 0, -0.025);
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / W + 0.5, uv.getY(i) / H + 0.5);
  const tag = new THREE.Mesh(geo, [new THREE.MeshPhysicalMaterial({ map, metalness: 0.9, roughness: 0.3, bumpMap: brushed(false), bumpScale: 0.3 }), steel()]);
  tag.position.y = 0.75; tag.rotation.z = -0.5;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.022, 16, 64), steel());
  ring.position.set(-0.62, 1.35, 0); ring.rotation.y = Math.PI / 2;
  const link = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 12, 32), steel());
  link.position.set(-0.46, 1.1, 0); link.rotation.z = 0.6;
  const root = new THREE.Group();
  root.add(tag, ring, link);
  root.scale.setScalar(1.3);
  return { root, animate: (t) => { root.rotation.z = Math.sin(t * 1.1) * 0.05; } };
}

// ---------------------------------------------------------------------------
// Welcome kit: a rigid black box; the lid lifts, tissue slides, contents rise.
// ---------------------------------------------------------------------------
function kit(o: ModelOpts): Built {
  const W = 2.0, H = 0.55, D = 1.4, T = 0.04;
  const soft = new THREE.MeshPhysicalMaterial({ color: '#141414', roughness: 0.82, sheen: 0.4, sheenColor: new THREE.Color('#444444') });
  const lining = new THREE.MeshStandardMaterial({ color: BRAND_ORANGE, roughness: 0.75 });
  const box = new THREE.Group();
  const wall = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [soft, soft, lining, soft, soft, soft]);
    m.position.set(x, y, z); return m;
  };
  box.add(wall(W, T, D, 0, T / 2, 0));
  const fr = new THREE.Mesh(new THREE.BoxGeometry(W, H, T), [soft, soft, soft, soft, soft, lining]); fr.position.set(0, H / 2, D / 2 - T / 2);
  const bk = new THREE.Mesh(new THREE.BoxGeometry(W, H, T), [soft, soft, soft, soft, lining, soft]); bk.position.set(0, H / 2, -D / 2 + T / 2);
  const lf = new THREE.Mesh(new THREE.BoxGeometry(T, H, D), [lining, soft, soft, soft, soft, soft]); lf.position.set(-W / 2 + T / 2, H / 2, 0);
  const rt = new THREE.Mesh(new THREE.BoxGeometry(T, H, D), [soft, lining, soft, soft, soft, soft]); rt.position.set(W / 2 - T / 2, H / 2, 0);
  box.add(fr, bk, lf, rt);
  // Front label on the box.
  const label = canvas(1024, 256);
  label.g.fillStyle = '#141414'; label.g.fillRect(0, 0, 1024, 256);
  text(label.g, 'WELCOME KIT', 512, 128, 64, '#C9A86A', { spacing: 18 });
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), new THREE.MeshPhysicalMaterial({ map: tex(label.c), metalness: 0.5, roughness: 0.4 }));
  lab.position.set(0, H * 0.5, D / 2 + 0.001);
  box.add(lab);
  // Lid with the foil logo.
  const top = canvas(1400, 980);
  top.g.fillStyle = '#141414'; top.g.fillRect(0, 0, 1400, 980);
  if (o.printFront) drawFit(top.g, o.printFront, 700, 490, 900, 600); else drawLogo(top.g, o.logo, 700, 460, 760);
  text(top.g, 'TRAIN · TEST · TRACK', 700, 800, 40, '#C9A86A', { spacing: 14, weight: 600 });
  const lidTop = new THREE.MeshPhysicalMaterial({ map: tex(top.c), roughness: 0.6, clearcoat: 0.3 });
  const lid = new THREE.Mesh(new THREE.BoxGeometry(W + 0.05, 0.2, D + 0.05), [soft, soft, lidTop, lining, soft, soft]);
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, H, -D / 2);
  lid.position.set(0, 0.02, D / 2);
  lidPivot.add(lid);
  // Contents on a raised tray.
  const contents = new THREE.Group();
  const add = (b: Built, s: number, x: number, z: number, ry = 0, rx = 0) => {
    const g = new THREE.Group(); g.add(b.root); g.scale.setScalar(s); g.position.set(x, T, z); g.rotation.set(rx, ry, 0); contents.add(g); return g;
  };
  const items = [
    add(bottle({ ...o, color: undefined, printFront: null }), 0.24, -0.62, 0.05, 0, 0),
    add(notebook({ ...o }), 0.42, 0.05, -0.05, 0.1, -Math.PI / 2 + 0.05),
    add(stickers({ ...o }), 0.22, 0.62, 0.15, 0, -Math.PI / 2 + 0.25),
    add(keychain({ ...o }), 0.2, 0.62, -0.38, 0.3, -Math.PI / 2 + 0.3),
  ];
  const card = canvas(800, 520);
  card.g.fillStyle = '#FFF8EE'; card.g.fillRect(0, 0, 800, 520);
  drawLogo(card.g, o.logo, 400, 150, 280);
  text(card.g, `Welcome to TiEEdu${o.name ? `, ${o.name.split(' ')[0]}` : ''}!`, 400, 320, 44, '#141414', { weight: 700 });
  text(card.g, 'One problem a day. See you at the top.', 400, 400, 28, '#5a534a', { weight: 500 });
  const cardMesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.01, 0.455), [lining, lining, new THREE.MeshStandardMaterial({ map: tex(card.c), roughness: 0.8 }), lining, lining, lining]);
  cardMesh.position.set(0.05, T + 0.24, 0.42); cardMesh.rotation.x = -0.15;
  contents.add(cardMesh);
  // Tissue paper over the contents.
  const tissue = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.12, D - 0.12, 8, 8), new THREE.MeshStandardMaterial({ color: '#F6F1E7', roughness: 1, transparent: true, opacity: 0.94, side: THREE.DoubleSide }));
  tissue.rotation.x = -Math.PI / 2; tissue.position.y = H - 0.05;
  const tp = tissue.geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < tp.count; i++) tp.setZ(i, Math.sin(tp.getX(i) * 9) * 0.012 + Math.cos(tp.getY(i) * 7) * 0.01);
  tissue.geometry.computeVertexNormals();
  const root = new THREE.Group();
  root.add(box, contents, tissue, lidPivot);
  root.scale.setScalar(1.05);
  contents.position.y = -0.15;
  let target = 0, p = 0;
  const ease = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x));
  return {
    root,
    setOpen: (on) => { target = on ? 1 : 0; },
    animate: (t, dt) => {
      p += Math.sign(target - p) * Math.min(Math.abs(target - p), dt * 0.55);
      const lidP = ease(p / 0.45);
      lidPivot.rotation.x = -lidP * 1.95;
      lidPivot.position.y = H + lidP * 0.05;
      const tisP = ease((p - 0.35) / 0.3);
      tissue.position.z = -tisP * 0.4; tissue.position.y = H - 0.05 + tisP * 0.25; tissue.rotation.x = -Math.PI / 2 - tisP * 1.1;
      (tissue.material as THREE.MeshStandardMaterial).opacity = 0.94 * (1 - tisP);
      tissue.visible = tisP < 0.99;
      items.forEach((g, i) => { const q = ease((p - 0.55 - i * 0.08) / 0.3); g.position.y = T + q * (0.5 + (i === 0 ? 0.1 : 0)) + Math.sin(t * 1.5 + i) * 0.015 * q; });
      cardMesh.position.y = T + 0.24 + ease((p - 0.85) / 0.15) * 0.35;
    },
  };
}

const BUILDERS: Record<ModelKey, (o: ModelOpts) => Built> = { bottle, mug, tshirt, hoodie, cap, stickers, keychain, notebook, kit };
export function buildModel(key: ModelKey, o: ModelOpts): Built {
  const b = BUILDERS[key](o);
  const out = new THREE.Group();
  out.add(b.root);
  // Animate any child that has its own motion (kit contents).
  return { root: out, animate: b.animate, setOpen: b.setOpen };
}
