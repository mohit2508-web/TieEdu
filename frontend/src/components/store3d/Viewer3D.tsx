import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildModel, type ModelKey } from './models';

/**
 * Turntable 3D viewer for TiEEdu swag (STORE_3D_SHOWCASE_AND_SPEED_PLAN.md §B2, §E).
 * Load it with next/dynamic (ssr: false) so three.js only downloads when a viewer
 * is shown. Drag or swipe to turn, scroll or pinch to zoom, arrow keys and +/- on
 * the keyboard, double-click to reset. It spins by itself until touched, pauses
 * when off screen or the tab is hidden, and keeps still for reduced motion.
 */
export type CameraView = 'front' | 'side' | 'back' | 'top';
export interface Viewer3DProps {
  model: ModelKey;
  color?: string;
  printFront?: string | null;
  printBack?: string | null;
  name?: string;
  view?: CameraView;
  /** Changes every time a view button is pressed, so the same view can be asked twice. */
  viewNonce?: number;
  open?: boolean;
  autoSpin?: boolean;
  /** Allow zoom (off in small stages so page scroll is not captured). */
  zoom?: boolean;
  className?: string;
  label: string;
  onFail?: () => void;
}

const ANGLES: Record<CameraView, { az: number; polar: number }> = {
  front: { az: 0, polar: Math.PI * 0.46 },
  side: { az: Math.PI / 2, polar: Math.PI * 0.46 },
  back: { az: Math.PI, polar: Math.PI * 0.46 },
  top: { az: 0.35, polar: Math.PI * 0.14 },
};

const loadImage = (src: string, cors = false) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image();
  if (cors) img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});
let logoPromise: Promise<HTMLImageElement> | null = null;
const logo = () => (logoPromise ||= loadImage('/logo.svg?v=3'));

/** A soft round shadow under the item. */
function contactShadow() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(0,0,0,0.45)'); grad.addColorStop(0.5, 'rgba(0,0,0,0.18)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

export default function Viewer3D({ model, color, printFront, printBack, name, view = 'front', viewNonce = 0, open = false, autoSpin = true, zoom = true, className, label, onFail }: Viewer3DProps) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ goTo: (v: CameraView) => void; setOpen?: (o: boolean) => void; stopSpin: () => void } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let raf = 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lite = window.matchMedia('(max-width: 640px)').matches || (navigator as any).deviceMemory <= 4;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch { onFail?.(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.style.touchAction = zoom ? 'none' : 'pan-y';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    const key = new THREE.DirectionalLight('#fff4e6', 1.4); key.position.set(3, 5, 4); scene.add(key);
    const rim = new THREE.DirectionalLight('#cfe0ff', 0.8); rim.position.set(-4, 3, -3); scene.add(rim);

    const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.enableZoom = zoom;
    controls.autoRotate = autoSpin && !reduced;
    controls.autoRotateSpeed = 1.6;
    controls.rotateSpeed = 0.8;
    controls.minPolarAngle = 0.05;
    controls.maxPolarAngle = Math.PI * 0.62;

    const shadow = contactShadow();
    scene.add(shadow);

    let built: ReturnType<typeof buildModel> | null = null;
    let radius = 1.5;
    const center = new THREE.Vector3(0, 1, 0);
    let tween: { from: THREE.Spherical; to: THREE.Spherical; t: number } | null = null;

    const placeCamera = (az: number, polar: number, r: number) => {
      const s = new THREE.Spherical(r, polar, az);
      camera.position.setFromSpherical(s).add(center);
      camera.lookAt(center);
    };
    const goTo = (v: CameraView) => {
      const a = ANGLES[v];
      const offset = camera.position.clone().sub(center);
      const from = new THREE.Spherical().setFromVector3(offset);
      const to = new THREE.Spherical(from.radius, a.polar, a.az);
      // Turn the short way round.
      while (to.theta - from.theta > Math.PI) to.theta -= Math.PI * 2;
      while (from.theta - to.theta > Math.PI) to.theta += Math.PI * 2;
      if (reduced) { placeCamera(to.theta, to.phi, to.radius); return; }
      tween = { from, to, t: 0 };
    };
    const stopSpin = () => { controls.autoRotate = false; };
    controls.addEventListener('start', () => { stopSpin(); tween = null; });

    const resize = () => {
      const w = el.clientWidth || 1, h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      // Absolutely placed so the canvas's pixel size never widens its layout parent.
      Object.assign(renderer.domElement.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' });
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.01 });
    io.observe(el);

    const clock = new THREE.Clock();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden) { clock.getDelta(); return; }
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      if (tween) {
        tween.t = Math.min(1, tween.t + dt * 1.6);
        const k = 1 - Math.pow(1 - tween.t, 3);
        placeCamera(tween.from.theta + (tween.to.theta - tween.from.theta) * k, tween.from.phi + (tween.to.phi - tween.from.phi) * k, tween.from.radius);
        if (tween.t >= 1) tween = null;
      }
      built?.animate?.(t, dt);
      controls.update();
      renderer.render(scene, camera);
    };

    const onKey = (e: KeyboardEvent) => {
      const off = camera.position.clone().sub(center);
      const s = new THREE.Spherical().setFromVector3(off);
      if (e.key === 'ArrowLeft') s.theta -= 0.25; else if (e.key === 'ArrowRight') s.theta += 0.25;
      else if (e.key === 'ArrowUp') s.phi = Math.max(0.05, s.phi - 0.15); else if (e.key === 'ArrowDown') s.phi = Math.min(Math.PI * 0.62, s.phi + 0.15);
      else if ((e.key === '+' || e.key === '=') && zoom) s.radius = Math.max(controls.minDistance, s.radius * 0.88);
      else if (e.key === '-' && zoom) s.radius = Math.min(controls.maxDistance, s.radius * 1.12);
      else return;
      e.preventDefault(); stopSpin(); tween = null;
      placeCamera(s.theta, s.phi, s.radius);
    };
    const onDbl = () => { const s = new THREE.Spherical().setFromVector3(camera.position.clone().sub(center)); placeCamera(s.theta, ANGLES.front.polar, radius * 2.4); goTo('front'); };
    el.addEventListener('keydown', onKey);
    renderer.domElement.addEventListener('dblclick', onDbl);

    (async () => {
      try {
        const [lg, pf, pb] = await Promise.all([
          logo(),
          printFront ? loadImage(printFront, true).catch(() => null) : Promise.resolve(null),
          printBack ? loadImage(printBack, true).catch(() => null) : Promise.resolve(null),
        ]);
        if (disposed) return;
        built = buildModel(model, { logo: lg, color, printFront: pf, printBack: pb, name, lite });
        scene.add(built.root);
        const box = new THREE.Box3().setFromObject(built.root);
        const sphere = box.getBoundingSphere(new THREE.Sphere());
        radius = sphere.radius;
        center.set(0, (box.min.y + box.max.y) / 2, 0);
        controls.target.copy(center);
        // Fit the whole item in whichever field of view is narrower (portrait stages are narrow).
        const vfov = THREE.MathUtils.degToRad(camera.fov);
        const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
        const dist = (radius / Math.sin(Math.min(vfov, hfov) / 2)) * 1.08;
        controls.minDistance = dist * 0.55;
        controls.maxDistance = dist * 1.8;
        shadow.scale.setScalar(Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * 1.5);
        shadow.position.y = box.min.y + 0.002;
        placeCamera(ANGLES[view].az + (autoSpin && !reduced ? -0.6 : 0), ANGLES[view].polar, dist);
        built.setOpen?.(open);
        api.current = { goTo, setOpen: built.setOpen, stopSpin };
        setReady(true);
        loop();
      } catch {
        onFail?.();
      }
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      el.removeEventListener('keydown', onKey);
      controls.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mats = (Array.isArray(m.material) ? m.material : m.material ? [m.material] : []) as THREE.Material[];
        for (const mat of mats) {
          for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose();
          mat.dispose();
        }
      });
      envRT.dispose(); pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      api.current = null;
    };
    // The scene is rebuilt only when what is drawn changes.
  }, [model, color, printFront, printBack, name]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (viewNonce) { api.current?.stopSpin(); api.current?.goTo(view); } }, [view, viewNonce]);
  useEffect(() => { api.current?.setOpen?.(open); if (open) api.current?.stopSpin(); }, [open]);

  return (
    <div ref={host} tabIndex={0} role="img" aria-label={`${label}. 3D view: drag to turn${zoom ? ', scroll to zoom' : ''}, or use the arrow keys.`}
      className={`relative h-full w-full cursor-grab outline-none focus-visible:ring-2 focus-visible:ring-signal active:cursor-grabbing ${className || ''}`}>
      {!ready && <div className="absolute inset-0 grid place-items-center"><span className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-signal" aria-hidden /></div>}
    </div>
  );
}
