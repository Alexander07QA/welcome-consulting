import * as THREE from 'three';

// Cabeza de una sola malla: óvalo facial que se afina hacia el mentón, sin costuras.
// Nariz, pómulos, cuencas y mentón se esculpen sobre la misma superficie (fotos en docs/reference).
const C = new THREE.Vector3(0, 0.108, 0);

const g2 = (d: number, s: number) => Math.exp(-((d / s) ** 2));

/** Relieve simétrico [x, y, sx, sy, alto]: + sale de la cara, − se hunde. */
const RELIEF: [number, number, number, number, number][] = [
  [0.039, 0.121, 0.017, 0.01, -0.0042], // cuencas de los ojos
  [0.036, 0.142, 0.022, 0.006, 0.0018], // arco de las cejas
  [0.046, 0.094, 0.016, 0.012, 0.0035], // pómulos
  [0.02, 0.066, 0.016, 0.012, 0.0016], // mejillas junto a la boca
  [0.0108, 0.0858, 0.0062, 0.0055, 0.0042], // aletas de la nariz
];

/** Puente recto y fino que termina en una punta redondeada y levemente respingada. */
function nose(x: number, y: number): number {
  const t = THREE.MathUtils.clamp((0.142 - y) / 0.05, 0, 1);
  const ridge = (0.001 + 0.0095 * t ** 1.6) * (y < 0.09 ? g2(y - 0.09, 0.011) : 1);
  const tip = 0.0042 * g2(x, 0.0068) * g2(y - 0.0895, 0.0062);
  return ridge * g2(x, 0.0042 + 0.0032 * t) + tip;
}

function relief(x: number, y: number): number {
  let h = nose(x, y);
  for (const [bx, by, sx, sy, a] of RELIEF) h += a * (g2(x - bx, sx) + g2(x + bx, sx)) * g2(y - by, sy);
  h += 0.0038 * g2(x, 0.022) * g2(y - 0.054, 0.012); // volumen de la boca
  h += 0.0035 * g2(x, 0.014) * g2(y - 0.02, 0.01); // mentón suave
  return h;
}

export function buildHeadGeometry(): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, 200, 150);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const ux = p.getX(i);
    const uy = p.getY(i);
    const uz = p.getZ(i);
    const lower = uy < 0 ? uy * uy : 0;
    const wx = 0.09 * (uy < 0 ? 1 - 0.3 * lower - 0.14 * lower * lower : 1 - 0.1 * uy * uy);
    let z = uz * 0.1 * (1 - 0.14 * lower);
    if (uz > 0 && uy < 0) z += 0.012 * uz * -uy; // mandíbula y mentón hacia adelante
    if (uz < 0) z *= 1.06; // occipital
    const x = C.x + ux * wx;
    const y = C.y + uy * (uy < 0 ? 0.104 : 0.112);
    p.setXYZ(i, x, y, C.z + z + relief(x, y) * THREE.MathUtils.smoothstep(uz, 0.35, 0.7));
  }
  g.computeVertexNormals();
  return g;
}

const ray = new THREE.Raycaster();
let probe: THREE.Mesh | null = null;

/** Profundidad z de la superficie frontal de la cara en (x, y), para apoyar rasgos. */
export function faceZ(x: number, y: number): number {
  if (!probe) {
    probe = new THREE.Mesh(buildHeadGeometry(), new THREE.MeshBasicMaterial({ side: THREE.FrontSide }));
    probe.updateMatrixWorld();
  }
  ray.set(new THREE.Vector3(x, y, 1), new THREE.Vector3(0, 0, -1));
  const hit = ray.intersectObject(probe, false)[0];
  return hit ? hit.point.z : 0.09;
}
