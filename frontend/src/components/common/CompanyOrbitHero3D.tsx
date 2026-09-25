import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface CompanyOrbitProps {
  companies?: { name: string }[];
}

const DEFAULT_COMPANIES = [
  { name: 'Zscaler' },
  { name: 'Palo Alto Networks' },
  { name: 'Razorpay' },
  { name: 'TCS' },
  { name: 'Infosys' },
  { name: 'Google' },
  { name: 'Microsoft' },
  { name: 'Amazon' },
  { name: 'Adobe' },
  { name: 'Capgemini' },
];

export const CompanyOrbitHero3D: React.FC<CompanyOrbitProps> = ({ companies = DEFAULT_COMPANIES }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode) return;

    const width = mountNode.clientWidth || 450;
    const height = mountNode.clientHeight || 360;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 2, 9);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountNode.appendChild(renderer.domElement);

    // 2. Lighting (Warm ambient & directional)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xe8a33d, 1.5);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // 3. Central TiEedu Glowing Core (3D Sphere + Ring)
    const coreGroup = new THREE.Group();

    // Central Sphere
    const sphereGeo = new THREE.SphereGeometry(0.9, 32, 32);
    const sphereMat = new THREE.MeshPhongMaterial({
      color: 0x1f3a5f,
      emissive: 0x0f2440,
      shininess: 90,
    });
    const coreMesh = new THREE.Mesh(sphereGeo, sphereMat);
    coreGroup.add(coreMesh);

    // Core Outer Golden Halo Ring
    const haloGeo = new THREE.TorusGeometry(1.25, 0.04, 16, 100);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xe8a33d });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.rotation.x = Math.PI / 3;
    coreGroup.add(haloMesh);

    scene.add(coreGroup);

    // 4. Orbiting Rings
    const orbitGroup = new THREE.Group();

    // Outer Orbit 1 Ring
    const orbitRing1Geo = new THREE.RingGeometry(3.1, 3.14, 64);
    const orbitRing1Mat = new THREE.MeshBasicMaterial({ color: 0xd97706, side: THREE.DoubleSide, transparent: true, opacity: 0.3 });
    const orbitRing1 = new THREE.Mesh(orbitRing1Geo, orbitRing1Mat);
    orbitRing1.rotation.x = Math.PI / 2.4;
    orbitGroup.add(orbitRing1);

    // Inner Orbit 2 Ring
    const orbitRing2Geo = new THREE.RingGeometry(2.2, 2.23, 64);
    const orbitRing2Mat = new THREE.MeshBasicMaterial({ color: 0x1f3a5f, side: THREE.DoubleSide, transparent: true, opacity: 0.25 });
    const orbitRing2 = new THREE.Mesh(orbitRing2Geo, orbitRing2Mat);
    orbitRing2.rotation.x = Math.PI / 2.8;
    orbitRing2.rotation.y = Math.PI / 6;
    orbitGroup.add(orbitRing2);

    scene.add(orbitGroup);

    // 5. Create 3D Orbiting Company Cards with Textures
    const cardMeshes: { mesh: THREE.Mesh; angle: number; radius: number; speed: number; orbitY: number }[] = [];

    companies.forEach((comp, idx) => {
      // Create sprite canvas texture for company card
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Card background (Rounded white box with subtle shadow)
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(8, 8, 240, 112, 16);
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#EDEDEB';
        ctx.stroke();

        // Left accent indicator bar
        ctx.fillStyle = '#1F3A5F';
        ctx.fillRect(16, 24, 8, 80);

        // Text
        ctx.fillStyle = '#1A1A1A';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText(comp.name, 36, 68);

        ctx.fillStyle = '#D97706';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('✓ Vault', 36, 96);
      }

      const texture = new THREE.CanvasTexture(canvas);
      const cardGeo = new THREE.PlaneGeometry(1.2, 0.6);
      const cardMat = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
      });

      const cardMesh = new THREE.Mesh(cardGeo, cardMat);
      const isOuter = idx % 2 === 0;
      const radius = isOuter ? 3.1 : 2.2;
      const angle = (idx / companies.length) * Math.PI * 2;
      const speed = isOuter ? 0.006 : -0.008;

      cardMeshes.push({ mesh: cardMesh, angle, radius, speed, orbitY: isOuter ? 0.4 : -0.2 });
      scene.add(cardMesh);
    });

    // 6. Mouse Interactive Parallax
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = mountNode.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // 7. Animation Loop
    let reqId: number;
    const animate = () => {
      reqId = requestAnimationFrame(animate);

      // Core rotation
      coreGroup.rotation.y += 0.01;
      haloMesh.rotation.z += 0.015;

      // Mouse parallax tilt
      scene.rotation.y = THREE.MathUtils.lerp(scene.rotation.y, mouseX * 0.3, 0.05);
      scene.rotation.x = THREE.MathUtils.lerp(scene.rotation.x, mouseY * 0.2, 0.05);

      // Orbit cards position update
      cardMeshes.forEach((item) => {
        item.angle += item.speed;
        const x = Math.cos(item.angle) * item.radius;
        const z = Math.sin(item.angle) * item.radius;
        const y = Math.sin(item.angle * 2) * 0.3 + item.orbitY;

        item.mesh.position.set(x, y, z);
        item.mesh.lookAt(camera.position); // Always face camera for crisp readability
      });

      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!mountNode) return;
      const w = mountNode.clientWidth;
      const h = mountNode.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (mountNode && renderer.domElement) {
        mountNode.removeChild(renderer.domElement);
      }
    };
  }, [companies]);

  return (
    <div className="relative w-full h-[360px] flex items-center justify-center">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      <div className="absolute bottom-2 text-[10px] font-mono font-semibold text-[#1F3A5F] bg-white/80 backdrop-blur-md px-3 py-1 rounded-full border border-[#EDEDEB] shadow-2xs">
        ✨ Interactive 3D Company Vault Orbits • Move Cursor to Tilt
      </div>
    </div>
  );
};

export default CompanyOrbitHero3D;

