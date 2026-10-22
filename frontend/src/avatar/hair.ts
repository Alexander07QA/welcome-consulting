import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from '../scene/geometry';

// Cabello de Gabi: largo, ondulado, raya al medio, castaño oscuro en la raíz con balayage
// caramelo/miel hacia las puntas. Coordenadas locales del grupo de la cabeza.
export const HEAD_CENTER = new THREE.Vector3(0, 0.115, 0);

const ROOT = new THREE.Color('#3b2618');
const MID = new THREE.Color('#5f3b23');
const CARAMEL = new THREE.Color('#94602f');
const HONEY = new THREE.Color('#c48f55');
const TIP = new THREE.Color('#d8ab73');

function hairColor(u: number, light: number, out: THREE.Color): THREE.Color {
  if (u < 0.22) out.copy(ROOT).lerp(MID, u / 0.22);
  else if (u < 0.5) out.copy(MID).lerp(CARAMEL, (u - 0.22) / 0.28);
  else if (u < 0.8) out.copy(CARAMEL).lerp(HONEY, (u - 0.5) / 0.3);
  else out.copy(HONEY).lerp(TIP, (u - 0.8) / 0.2);
  // Mechones más claros (balayage) aclaran desde media altura
  if (light > 0) out.lerp(TIP, light * THREE.MathUtils.smoothstep(u, 0.3, 0.9) * 0.6);
  return out;
}

const sph = (phi: number, elev: number, r: number): THREE.Vector3 =>
  new THREE.Vector3(
    Math.sin(phi) * Math.cos(elev) * r,
    Math.sin(elev) * r,
    Math.cos(phi) * Math.cos(elev) * r,
  ).add(HEAD_CENTER);

interface StrandSpec {
  points: THREE.Vector3[];
  radius: number;
  light: number;
  phase: number;
  amp: number;
  /** Fracción del degradado raíz→puntas que recorre el mechón (y de su vaivén). */
  tone: number;
}

function buildStrandSpecs(): StrandSpec[] {
  const r = rng(1234);
  const specs: StrandSpec[] = [];
  const j = (v: number) => (r() - 0.5) * v;
  for (const s of [-1, 1]) {
    const N = 40;
    for (let i = 0; i < N; i++) {
      const a = i / (N - 1);
      const front = a < 0.36;
      const phi = s * THREE.MathUtils.lerp(0.3 * Math.PI, 0.94 * Math.PI, a);
      const aphi = Math.abs(phi);
      const z0 = THREE.MathUtils.lerp(0.072, -0.075, a);
      const y0 = HEAD_CENTER.y + 0.098 * Math.sqrt(Math.max(0, 1 - (z0 / 0.1) ** 2));
      const p0 = new THREE.Vector3(s * 0.004, y0, z0);
      const p1 = sph(phi, 0.72, 0.119);
      const p2 = sph(s * Math.max(aphi, 0.36 * Math.PI), -0.05, 0.132);
      const p3 = sph(s * Math.max(aphi, 0.44 * Math.PI), -1.0, 0.158);
      p3.y = -0.015 + j(0.02);
      const endY = -0.44 + j(0.09);
      let p4: THREE.Vector3;
      let p5: THREE.Vector3;
      let p6: THREE.Vector3;
      if (front) {
        const spread = THREE.MathUtils.lerp(0.115, 0.17, a / 0.36);
        p4 = new THREE.Vector3(s * (spread + 0.02), -0.13, 0.075 + j(0.02));
        p5 = new THREE.Vector3(s * spread, -0.29, 0.115 + j(0.02));
        p6 = new THREE.Vector3(s * (spread - 0.015 + j(0.03)), endY, 0.13 + j(0.02));
      } else {
        const b = (a - 0.36) / 0.64;
        const x4 = THREE.MathUtils.lerp(0.19, 0.06, b);
        p4 = new THREE.Vector3(s * x4, -0.1 + b * -0.03, THREE.MathUtils.lerp(-0.075, -0.13, b));
        p5 = new THREE.Vector3(s * THREE.MathUtils.lerp(0.18, 0.05, b), -0.29, -0.145 + j(0.02));
        p6 = new THREE.Vector3(s * THREE.MathUtils.lerp(0.17, 0.04, b) + j(0.03), endY - 0.03, -0.15 + j(0.03));
      }
      for (const p of [p1, p2, p3, p4, p5, p6]) p.add(new THREE.Vector3(j(0.012), j(0.008), j(0.012)));
      specs.push({
        points: [p0, p1, p2, p3, p4, p5, p6],
        radius: front ? 0.016 + r() * 0.008 : 0.018 + r() * 0.008,
        light: front ? 0.55 + r() * 0.35 : r() > 0.6 ? 0.4 + r() * 0.5 : r() * 0.25,
        phase: r() * Math.PI * 2,
        amp: 0.018 + r() * 0.012,
        tone: 1,
      });
    }
  }
  return specs.concat(buildCrownSpecs());
}

// Semiejes de la superficie sobre la que se peina la coronilla (algo más que el casquete).
const CROWN = { a: 0.106, b: 0.12, c: 0.112 };

/** Punto de la coronilla: theta se abre desde la raya hacia el lado, beta va de la frente a la nuca. */
function crownPoint(s: number, theta: number, beta: number, lift: number): THREE.Vector3 {
  const d = new THREE.Vector3(s * Math.sin(theta), Math.cos(theta) * Math.cos(beta), Math.cos(theta) * Math.sin(beta));
  const surf = 1 / Math.sqrt((d.x / CROWN.a) ** 2 + (d.y / CROWN.b) ** 2 + (d.z / CROWN.c) ** 2);
  return d.multiplyScalar(surf + lift).add(HEAD_CENTER).add(new THREE.Vector3(0, 0.004, -0.004));
}

/** Mechones cortos que salen de la raya y cubren la parte de arriba con algo de volumen. */
function buildCrownSpecs(): StrandSpec[] {
  const r = rng(98);
  const specs: StrandSpec[] = [];
  const N = 46;
  for (const s of [-1, 1]) {
    for (let i = 0; i < N; i++) {
      const beta = THREE.MathUtils.lerp(0.72, -1.15, i / (N - 1)) + (r() - 0.5) * 0.04;
      const end = 1.15 + r() * 0.25;
      // Los de adelante se peinan en diagonal hacia atrás; los de la nuca caen casi rectos.
      const sweep = 0.45 * THREE.MathUtils.clamp((beta + 0.3) / 1.0, 0, 1);
      const points: THREE.Vector3[] = [];
      for (let k = 0; k <= 5; k++) {
        const theta = 0.02 + (end - 0.02) * (k / 5);
        const lift = 0.002 + 0.006 * Math.sin((Math.PI * k) / 5) + (r() - 0.5) * 0.002;
        points.push(crownPoint(s, theta, beta - sweep * (k / 5), lift));
      }
      specs.push({
        points,
        radius: 0.01 + r() * 0.005,
        light: r() * 0.2,
        phase: r() * Math.PI * 2,
        amp: 0.002,
        tone: 0.3 + r() * 0.1,
      });
    }
  }
  return specs;
}

function strandGeometry(spec: StrandSpec): THREE.BufferGeometry {
  const base = new THREE.CatmullRomCurve3(spec.points, false, 'centripetal');
  const samples: THREE.Vector3[] = [];
  const S = 40;
  const up = new THREE.Vector3(0, 1, 0);
  for (let k = 0; k <= S; k++) {
    const u = k / S;
    const p = base.getPointAt(u);
    const tan = base.getTangentAt(u);
    const out = new THREE.Vector3(p.x, 0, p.z).normalize();
    const lat = new THREE.Vector3().crossVectors(tan, up).normalize();
    const w = THREE.MathUtils.smoothstep(u, 0.32, 0.6) * spec.amp;
    const phase = u * Math.PI * 4.2 + spec.phase;
    p.addScaledVector(lat, Math.sin(phase) * w).addScaledVector(out, Math.cos(phase) * w * 0.5);
    samples.push(p);
  }
  const curve = new THREE.CatmullRomCurve3(samples);
  const TS = 44;
  const RS = 6;
  const geo = new THREE.TubeGeometry(curve, TS, spec.radius, RS, false);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const along = new Float32Array(pos.count);
  const c = new THREE.Color();
  const center = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i <= TS; i++) {
    const u = i / TS;
    curve.getPointAt(u, center);
    // Afinado: raíz delgada, cuerpo pleno, puntas que se adelgazan
    const taper = THREE.MathUtils.lerp(0.55, 1, THREE.MathUtils.smoothstep(u, 0, 0.12)) *
      THREE.MathUtils.lerp(1, 0.25, THREE.MathUtils.smoothstep(u, 0.78, 1));
    hairColor(u * spec.tone, spec.light, c);
    for (let k = 0; k <= RS; k++) {
      const idx = i * (RS + 1) + k;
      v.fromBufferAttribute(pos, idx).sub(center).multiplyScalar(taper).add(center);
      pos.setXYZ(idx, v.x, v.y, v.z);
      colors.set([c.r, c.g, c.b], idx * 3);
      along[idx] = u * spec.tone;
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aT', new THREE.BufferAttribute(along, 1));
  geo.deleteAttribute('uv');
  geo.computeVertexNormals();
  return geo;
}

export function buildHairGeometry(): THREE.BufferGeometry {
  const merged = mergeGeometries(buildStrandSpecs().map(strandGeometry), false);
  if (!merged) throw new Error('No se pudo construir el cabello');
  return merged;
}

/** Material con vaivén suave en las puntas (vertex shader). */
export function hairMaterial(): { material: THREE.MeshPhysicalMaterial; uniforms: { uTime: { value: number }; uAmp: { value: number } } } {
  const uniforms = { uTime: { value: 0 }, uAmp: { value: 1 } };
  const material = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.48,
    metalness: 0,
    sheen: 0.8,
    sheenColor: new THREE.Color('#ffd9a6'),
    sheenRoughness: 0.35,
    clearcoat: 0.15,
    clearcoatRoughness: 0.6,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uAmp = uniforms.uAmp;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute float aT;\nuniform float uTime;\nuniform float uAmp;',
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float sway = aT * aT * uAmp;
        transformed.x += sin(uTime * 1.1 + position.y * 7.0 + position.z * 5.0) * 0.0045 * sway;
        transformed.z += cos(uTime * 0.9 + position.y * 6.0) * 0.003 * sway;`,
      );
  };
  return { material, uniforms };
}
