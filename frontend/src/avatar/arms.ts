import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Brazos y manos de Gabi. Las manos se construyen en un marco propio:
// +y hacia la punta de los dedos, +z hacia donde mira la palma, +x hacia el pulgar.

/** Tubo por una curva con radio que varía de un punto de control al siguiente. */
export function taperedTube(points: THREE.Vector3[], radii: number[], tubular = 40, radial = 18): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const geo = new THREE.TubeGeometry(curve, tubular, 1, radial, false);
  const pos = geo.attributes.position;
  const c = new THREE.Vector3();
  const p = new THREE.Vector3();
  const last = radii.length - 1;
  for (let i = 0; i <= tubular; i++) {
    const u = i / tubular;
    curve.getPointAt(u, c);
    const f = u * last;
    const k = Math.min(last - 1, Math.floor(f));
    const r = THREE.MathUtils.lerp(radii[k], radii[k + 1], THREE.MathUtils.smoothstep(f - k, 0, 1));
    for (let j = 0; j <= radial; j++) {
      const idx = i * (radial + 1) + j;
      p.fromBufferAttribute(pos, idx).sub(c).multiplyScalar(r).add(c);
      pos.setXYZ(idx, p.x, p.y, p.z);
    }
  }
  geo.deleteAttribute('uv');
  geo.computeVertexNormals();
  return geo;
}

export type HandPose = 'reposo' | 'abierta';

interface FingerSpec {
  x: number;
  y: number;
  len: number;
  r: number;
  spread: number;
}

// Índice, medio, anular y meñique (x positiva = lado del pulgar).
const FINGERS: FingerSpec[] = [
  { x: 0.0235, y: 0.084, len: 0.066, r: 0.0084, spread: 0.06 },
  { x: 0.0078, y: 0.087, len: 0.074, r: 0.0086, spread: 0.0 },
  { x: -0.0082, y: 0.085, len: 0.069, r: 0.0081, spread: -0.05 },
  { x: -0.0235, y: 0.079, len: 0.055, r: 0.0072, spread: -0.12 },
];
const PHALANX = [0.46, 0.3, 0.24];

/** Puntos de un dedo que se dobla hacia la palma (+z) según curl. */
function fingerPath(f: FingerSpec, curl: number, open: number): { points: THREE.Vector3[]; tip: THREE.Vector3; tipDir: THREE.Vector3 } {
  const bend = [0.18, 0.55, 0.35].map((b) => b * curl);
  const spread = f.spread * (0.6 + open * 0.45);
  const p = new THREE.Vector3(f.x, f.y - 0.012, 0.001);
  const points = [p.clone()];
  p.set(f.x, f.y, 0.002);
  points.push(p.clone());
  let angle = 0;
  const dir = new THREE.Vector3();
  PHALANX.forEach((ratio, i) => {
    angle += bend[i];
    dir.set(Math.sin(spread), Math.cos(angle) * Math.cos(spread), Math.sin(angle)).normalize();
    p.addScaledVector(dir, f.len * ratio);
    points.push(p.clone());
  });
  return { points, tip: p.clone(), tipDir: dir.clone() };
}

function placed(geo: THREE.BufferGeometry, pos: THREE.Vector3, scale: THREE.Vector3, quat = new THREE.Quaternion()): THREE.BufferGeometry {
  return geo.applyMatrix4(new THREE.Matrix4().compose(pos, quat, scale));
}

/**
 * Mano completa: palma, nudillos, cuatro dedos con falanges, pulgar y uñas.
 * thumb = 1 pone el pulgar hacia +x (mano derecha); -1 lo refleja (mano izquierda).
 */
export function buildHand(thumb: 1 | -1, pose: HandPose): { skin: THREE.BufferGeometry; nails: THREE.BufferGeometry } {
  const open = pose === 'abierta' ? 1 : 0;
  const curl = pose === 'abierta' ? 0.12 : 0.7;
  const skin: THREE.BufferGeometry[] = [];
  const nails: THREE.BufferGeometry[] = [];
  const m = (v: THREE.Vector3) => v.set(v.x * thumb, v.y, v.z);

  // Palma: más ancha hacia los nudillos, delgada, con el talón de la mano redondeado.
  skin.push(placed(new THREE.SphereGeometry(1, 28, 20), new THREE.Vector3(0, 0.046, 0.002), new THREE.Vector3(0.034, 0.045, 0.0125)));
  skin.push(placed(new THREE.SphereGeometry(1, 20, 14), new THREE.Vector3(0.003 * thumb, 0.02, 0.001), new THREE.Vector3(0.026, 0.02, 0.0118)));
  // Monte del pulgar en el lado de la palma
  skin.push(placed(new THREE.SphereGeometry(1, 16, 12), new THREE.Vector3(0.019 * thumb, 0.03, 0.006), new THREE.Vector3(0.014, 0.024, 0.01)));
  // Línea de nudillos
  skin.push(taperedTube([m(new THREE.Vector3(0.026, 0.078, -0.003)), m(new THREE.Vector3(0, 0.083, -0.003)), m(new THREE.Vector3(-0.027, 0.074, -0.003))], [0.0095, 0.01, 0.0088], 16, 12));

  for (const f of FINGERS) {
    const { points, tip, tipDir } = fingerPath(f, curl, open);
    points.forEach(m);
    m(tip);
    m(tipDir);
    skin.push(taperedTube(points, [f.r * 1.05, f.r, f.r * 0.93, f.r * 0.85, f.r * 0.74], 28, 12));
    // Yema redondeada y uña en el dorso (-z)
    skin.push(placed(new THREE.SphereGeometry(1, 12, 10), tip, new THREE.Vector3(f.r * 0.74, f.r * 0.74, f.r * 0.74)));
    const nailPos = tip.clone().addScaledVector(tipDir, -f.r * 0.7);
    nailPos.z -= f.r * 0.62;
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tipDir);
    nails.push(placed(new THREE.SphereGeometry(1, 12, 8), nailPos, new THREE.Vector3(f.r * 0.62, f.r * 1.05, f.r * 0.22), q));
  }

  // Pulgar: sale del costado de la palma; abierto en el saludo, junto al índice en reposo.
  const thumbPts = (
    pose === 'abierta'
      ? [[0.024, 0.018, 0.006], [0.04, 0.04, 0.01], [0.052, 0.062, 0.012], [0.058, 0.082, 0.011]]
      : [[0.024, 0.018, 0.006], [0.038, 0.042, 0.014], [0.045, 0.065, 0.024], [0.046, 0.083, 0.031]]
  ).map(([x, y, z]) => m(new THREE.Vector3(x, y, z)));
  skin.push(taperedTube(thumbPts, [0.0125, 0.0108, 0.0095, 0.0082], 24, 12));
  const tTip = thumbPts[3];
  const tDir = tTip.clone().sub(thumbPts[2]).normalize();
  skin.push(placed(new THREE.SphereGeometry(1, 12, 10), tTip, new THREE.Vector3(0.0082, 0.0082, 0.0082)));
  const tNail = tTip.clone().addScaledVector(tDir, -0.005);
  tNail.z -= 0.0052;
  nails.push(
    placed(
      new THREE.SphereGeometry(1, 12, 8),
      tNail,
      new THREE.Vector3(0.0062, 0.009, 0.002),
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tDir),
    ),
  );

  // Cada pieza ya trae sus normales suaves; se unen indexadas para no facetar.
  const merge = (parts: THREE.BufferGeometry[]) => {
    parts.forEach((g) => g.deleteAttribute('uv'));
    const out = mergeGeometries(parts, false);
    if (!out) throw new Error('No se pudo construir la mano');
    return out;
  };
  return { skin: merge(skin), nails: merge(nails) };
}

/** Orientación de una mano dada la dirección de los dedos y hacia dónde mira la palma. */
export function handQuaternion(fingers: THREE.Vector3, palm: THREE.Vector3): THREE.Quaternion {
  const y = fingers.clone().normalize();
  const z = palm.clone().addScaledVector(y, -palm.dot(y)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}
