import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * NestScene — a woven 3D nest that "catches" vermilion log packets.
 *
 * - ~150 tube strands wrapped around a bowl, seeded so the shape is stable
 * - packets arc in from around the scene, land, flash the nest, then fade
 * - follows the pointer (parallax), pauses off-screen / in hidden tabs
 * - prefers-reduced-motion: renders a single still frame
 *
 * Loaded lazily (React.lazy) so three.js never weighs on the app pages.
 */

const PALETTE = {
  straw:  0xc2ac83,
  cream:  0xd8c7a6,
  teal:   0x78a39a,
  tealDk: 0x57857c,
  ink:    0x3d372e,
  ver:    0xe73213,
};

// Small deterministic PRNG so every visitor sees the same nest
function mulberry32(seed) {
  return function rand() {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Bowl profile: v = 0 bottom … 1 rim
const bowlY = (v) => -0.78 + v * 1.0;
const bowlR = (v) => 0.42 + 1.18 * Math.pow(Math.max(v, 0), 0.72);

function buildNest(rand, materials) {
  const group = new THREE.Group();
  const geometries = [];
  const pickMaterial = () => {
    const r = rand();
    if (r < 0.34) return materials.straw;
    if (r < 0.55) return materials.cream;
    if (r < 0.75) return materials.teal;
    if (r < 0.92) return materials.tealDk;
    return materials.ink;
  };

  const STRANDS = 150;
  for (let i = 0; i < STRANDS; i++) {
    const theta0 = rand() * Math.PI * 2;
    const sweep  = (0.9 + rand() * 1.9) * (rand() < 0.5 ? -1 : 1);
    const v0 = 1 - Math.pow(rand(), 1.7);                       // bias toward a thick rim
    const v1 = Math.min(1.06, Math.max(0, v0 + (rand() - 0.5) * 0.8));
    const wobble = rand() * Math.PI * 2;
    const loose  = 1 + (rand() - 0.5) * 0.14;

    const pts = [];
    for (let k = 0; k <= 9; k++) {
      const s = k / 9;
      const th = theta0 + sweep * s;
      const v  = v0 + (v1 - v0) * s + 0.05 * Math.sin(s * Math.PI * 2 + wobble);
      const r  = bowlR(v) * loose + 0.05 * Math.sin(s * 9 + wobble);
      pts.push(new THREE.Vector3(r * Math.cos(th), bowlY(v), r * Math.sin(th)));
    }
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
    const geo = new THREE.TubeGeometry(curve, 44, 0.009 + rand() * 0.017, 5, false);
    geometries.push(geo);
    group.add(new THREE.Mesh(geo, pickMaterial()));
  }

  // A few stray twigs poking out of the rim — imperfection reads as hand-made
  for (let i = 0; i < 9; i++) {
    const th = rand() * Math.PI * 2;
    const a = new THREE.Vector3(bowlR(0.9) * Math.cos(th), bowlY(0.9), bowlR(0.9) * Math.sin(th));
    const out = 1.25 + rand() * 0.25;
    const b = new THREE.Vector3(a.x * out, bowlY(1.1 + rand() * 0.25), a.z * out);
    const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, 0.08, 0));
    const geo = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 12, 0.008, 4, false);
    geometries.push(geo);
    group.add(new THREE.Mesh(geo, materials.straw));
  }

  return { group, geometries };
}

export default function NestScene({ className = '', onCatch, onReady, packets = 34 }) {
  const hostRef = useRef(null);
  const onCatchRef = useRef(onCatch);
  onCatchRef.current = onCatch;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rand = mulberry32(20261124);

    // ── Renderer / scene / camera ──────────────────────────────────
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      host.dataset.webgl = 'unavailable';
      return undefined; // CSS fallback underneath stays visible
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, { display: 'block', width: '100%', height: '100%' });

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
    const lookAt = new THREE.Vector3(0, -0.2, 0);

    scene.add(new THREE.HemisphereLight(0xf7f1e6, 0x57857c, 1.7));
    const key = new THREE.DirectionalLight(0xffffff, 1.9);
    key.position.set(3, 5, 4);
    scene.add(key);
    const glow = new THREE.PointLight(PALETTE.ver, 0, 3.2, 1.6);
    glow.position.set(0, -0.35, 0);
    scene.add(glow);

    // ── Materials & nest ───────────────────────────────────────────
    const std = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0 });
    const materials = {
      straw: std(PALETTE.straw), cream: std(PALETTE.cream), teal: std(PALETTE.teal),
      tealDk: std(PALETTE.tealDk), ink: std(PALETTE.ink),
    };
    const { group: nest, geometries } = buildNest(rand, materials);
    const rig = new THREE.Group(); // receives pointer tilt
    rig.add(nest);
    rig.rotation.x = 0.08;
    scene.add(rig);

    // ── Packets (instanced) ────────────────────────────────────────
    const packetGeo = new THREE.SphereGeometry(0.06, 18, 14);
    const packetMat = new THREE.MeshStandardMaterial({
      color: PALETTE.ver, emissive: 0x8a1606, emissiveIntensity: 0.55, roughness: 0.4,
    });
    const swarm = new THREE.InstancedMesh(packetGeo, packetMat, packets);
    swarm.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    nest.add(swarm); // packets live in nest space so they land correctly as it turns

    const dummy = new THREE.Object3D();
    const tmp = new THREE.Vector3();
    const state = Array.from({ length: packets }, () => ({}));

    const spawn = (p, now, initial = false) => {
      const th = rand() * Math.PI * 2;
      const dist = 2.6 + rand() * 1.4;
      p.from = new THREE.Vector3(Math.cos(th) * dist, 0.6 + rand() * 2.2, Math.sin(th) * dist);
      const lr = Math.sqrt(rand()) * 0.62;
      const lt = rand() * Math.PI * 2;
      p.to = new THREE.Vector3(Math.cos(lt) * lr, -0.62 + rand() * 0.16, Math.sin(lt) * lr);
      p.ctrl = p.from.clone().lerp(p.to, 0.5).add(new THREE.Vector3(0, 1.1 + rand() * 0.8, 0));
      p.duration = 1.5 + rand() * 1.2;
      p.start = now + (initial ? rand() * 6 : 0.3 + rand() * 2.5);
      p.rest = 0.9 + rand() * 0.8;
      p.landed = false;
    };

    // ── Sizing ─────────────────────────────────────────────────────
    const resize = () => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      const aspect = w / h;
      renderer.setSize(w, h, false);
      camera.aspect = aspect;
      // Keep the whole nest (+ margin) in frame at any aspect ratio
      const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
      const dist = Math.max(5.1, 2.1 / (Math.tan(halfFov) * aspect));
      camera.position.set(0, dist * 0.3, dist);
      camera.lookAt(lookAt);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    // ── Pointer parallax ───────────────────────────────────────────
    const target = { x: 0, y: 0 };
    const onPointer = (e) => {
      const r = host.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      target.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    // ── Loop ───────────────────────────────────────────────────────
    const clock = new THREE.Clock();
    let raf = 0;
    let visible = true;
    let pageVisible = !document.hidden;
    let glowLevel = 0;

    const now0 = 0;
    state.forEach((p) => spawn(p, now0, true));

    const updatePackets = (t) => {
      for (let i = 0; i < packets; i++) {
        const p = state[i];
        let scale = 0;
        if (t >= p.start) {
          const k = (t - p.start) / p.duration;
          if (k < 1) {
            // quadratic bezier flight
            const e = k * k * (3 - 2 * k);
            const a = 1 - e;
            tmp.set(
              a * a * p.from.x + 2 * a * e * p.ctrl.x + e * e * p.to.x,
              a * a * p.from.y + 2 * a * e * p.ctrl.y + e * e * p.to.y,
              a * a * p.from.z + 2 * a * e * p.ctrl.z + e * e * p.to.z,
            );
            scale = 0.35 + 0.65 * Math.min(1, k * 3);
          } else {
            if (!p.landed) {
              p.landed = true;
              glowLevel = Math.min(glowLevel + 2.6, 7);
              onCatchRef.current?.();
            }
            const r = (t - p.start - p.duration) / p.rest;
            if (r >= 1) {
              spawn(p, t);
            } else {
              tmp.copy(p.to);
              scale = 1 - r;
            }
          }
        }
        dummy.position.copy(tmp);
        dummy.scale.setScalar(Math.max(scale, 0.0001));
        dummy.updateMatrix();
        swarm.setMatrixAt(i, dummy.matrix);
      }
      swarm.instanceMatrix.needsUpdate = true;
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      nest.rotation.y += dt * 0.12;
      nest.position.y = Math.sin(t * 0.8) * 0.035;
      rig.rotation.y += (target.x * 0.35 - rig.rotation.y) * 0.05;
      rig.rotation.x += (0.08 + target.y * 0.12 - rig.rotation.x) * 0.05;

      glowLevel *= Math.pow(0.08, dt);
      glow.intensity = glowLevel;
      packetMat.emissiveIntensity = 0.55 + glowLevel * 0.05;

      updatePackets(t);
      renderer.render(scene, camera);
    };

    const start = () => {
      if (raf || reduceMotion || !visible || !pageVisible) return;
      clock.getDelta(); // don't jump after a pause
      raf = requestAnimationFrame(frame);
    };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start(); else stop();
    });
    io.observe(host);

    const onVisibility = () => {
      pageVisible = !document.hidden;
      if (pageVisible) start(); else stop();
    };
    document.addEventListener('visibilitychange', onVisibility);

    if (reduceMotion) {
      // Still frame: a few packets resting in the nest
      state.forEach((p, i) => { p.start = -10; p.duration = 1; p.rest = i < 6 ? 1e9 : 0.0001; p.landed = true; });
      updatePackets(0);
      renderer.render(scene, camera);
    } else {
      start();
    }
    host.dataset.webgl = 'ready';
    onReadyRef.current?.();

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      geometries.forEach((g) => g.dispose());
      Object.values(materials).forEach((m) => m.dispose());
      packetGeo.dispose();
      packetMat.dispose();
      swarm.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [packets]);

  return <div ref={hostRef} className={className} />;
}
