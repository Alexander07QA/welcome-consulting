// Marcha procedural del visitante: cada pie se apoya en un punto fijo del piso mientras el
// cuerpo avanza, rueda de talón a punta y viaja en arco hasta el siguiente apoyo.
// Todo se mide en coordenadas del mundo (x, z) y en metros recorridos sobre el camino.

export type V2 = [x: number, z: number];

export interface FootPose {
  /** Tobillo en el mundo. */
  x: number;
  y: number;
  z: number;
  /** Hacia dónde apunta el pie (mismo convenio que rotation.y). */
  yaw: number;
  /** Positivo levanta el talón, negativo levanta la punta. */
  pitch: number;
}

export const PATH: V2[] = [
  [3.0, 3.4],
  [1.0, 0.75],
  [0.15, 1.14],
];
export const STOP: V2 = PATH[PATH.length - 1];
export const SEAT: V2 = [0.15, 1.58];
/** Mira hacia Gabi (−z). */
export const SEATED_HEADING = Math.PI;

export const SPEED = 0.85;
const ACCEL_S = 0.7;
const DECEL_S = 0.9;
/** Distancia de un ciclo completo (dos pasos). */
export const STRIDE = 1.0;
const STANCE = 0.6;
// Desfase inicial: arranca con el pie izquierdo apoyado bajo el cuerpo y el derecho despegando.
const PHASE0 = 0.8;
const FOOT_W = 0.09;
const TOE_OUT = 0.07;
export const FLOOR_Y = 0.008;
/** Alto del tobillo sobre la suela. */
export const ANKLE_H = 0.064;
// Puntos de contacto en el marco del pie: [alto respecto al tobillo, adelante].
const HEEL: V2 = [-ANKLE_H, -0.06];
const TOE: V2 = [-0.06, 0.15];
const HEEL_STRIKE = -0.3;
const TOE_OFF = 0.6;
const LIFT = 0.075;

const SEGMENTS = PATH.slice(1).map((b, i) => {
  const a = PATH[i];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return { a, b, len, heading: Math.atan2(b[0] - a[0], b[1] - a[1]) };
});
export const PATH_LEN = SEGMENTS.reduce((acc, s) => acc + s.len, 0);
export const START_HEADING = SEGMENTS[0].heading;
export const WALK_S = PATH_LEN / SPEED + (ACCEL_S + DECEL_S) / 2;

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const smooth = (v: number) => v * v * (3 - 2 * v);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** Acerca un ángulo a otro por el camino más corto. */
export function lerpAngle(from: number, to: number, k: number): number {
  const diff = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + diff * k;
}

export function along(dist: number): { x: number; z: number; heading: number } {
  let d = dist;
  for (const s of SEGMENTS) {
    if (d <= s.len) {
      const k = d / s.len;
      return {
        x: s.a[0] + (s.b[0] - s.a[0]) * k,
        z: s.a[1] + (s.b[1] - s.a[1]) * k,
        heading: s.heading,
      };
    }
    d -= s.len;
  }
  const last = SEGMENTS[SEGMENTS.length - 1];
  return { x: last.b[0], z: last.b[1], heading: last.heading };
}

/** Metros recorridos tras t segundos de caminata: acelera, va a paso constante y frena. */
export function walkDistance(t: number): { dist: number; speed: number } {
  const total = WALK_S;
  if (t <= 0) return { dist: 0, speed: 0 };
  if (t >= total) return { dist: PATH_LEN, speed: 0 };
  if (t < ACCEL_S) return { dist: (SPEED * t * t) / (2 * ACCEL_S), speed: t / ACCEL_S };
  if (t > total - DECEL_S) {
    const r = total - t;
    return { dist: PATH_LEN - (SPEED * r * r) / (2 * DECEL_S), speed: r / DECEL_S };
  }
  return { dist: (SPEED * ACCEL_S) / 2 + SPEED * (t - ACCEL_S), speed: 1 };
}

/** Vector "derecha" para una orientación dada. */
const right = (h: number): V2 => [Math.cos(h), -Math.sin(h)];

/** Tobillo de un pie apoyado que pivota sobre el talón (pitch < 0) o la punta (pitch > 0). */
export function plantedPose(x: number, z: number, yaw: number, pitch: number): FootPose {
  const [py, pf] = pitch < 0 ? HEEL : pitch > 0 ? TOE : [-ANKLE_H, 0];
  const c = Math.cos(pitch);
  const s = Math.sin(pitch);
  const f = pf - (py * s + pf * c);
  const y = FLOOR_Y - (py * c - pf * s);
  return { x: x + Math.sin(yaw) * f, y, z: z + Math.cos(yaw) * f, yaw, pitch };
}

/** Arco del pie en el aire entre dos apoyos. */
export function swingPose(
  a: FootPose,
  b: FootPose,
  s: number,
  lift: number,
  pitchArc = 0,
): FootPose {
  const k = smooth(s);
  return {
    x: lerp(a.x, b.x, k),
    y: lerp(a.y, b.y, k) + Math.sin(Math.PI * Math.pow(s, 0.8)) * lift,
    z: lerp(a.z, b.z, k),
    yaw: lerpAngle(a.yaw, b.yaw, k),
    pitch: lerp(a.pitch, b.pitch, smooth(clamp01(s * 1.6))) + Math.sin(Math.PI * s) * pitchArc,
  };
}

/** Fase del ciclo (0..1) de cada pierna: 0 es el apoyo del talón. */
export function legCycle(dist: number, leg: number): number {
  return dist / STRIDE + PHASE0 + leg * 0.5;
}

/** Distancia del camino donde la pierna apoya el pie n-ésimo. */
function plantDist(leg: number, n: number): number {
  return Math.min(PATH_LEN, Math.max(0, (n + STANCE / 2 - PHASE0 - leg * 0.5) * STRIDE));
}
/** Distancia del cuerpo cuando arranca el balanceo que sale del apoyo n. */
const swingStart = (leg: number, n: number) => (n + STANCE - PHASE0 - leg * 0.5) * STRIDE;

function plantSpot(leg: number, d: number): { x: number; z: number; yaw: number } {
  const p = along(d);
  const side = leg === 0 ? 1 : -1;
  const [rx, rz] = right(p.heading);
  return {
    x: p.x + rx * side * FOOT_W,
    z: p.z + rz * side * FOOT_W,
    yaw: p.heading - side * TOE_OUT,
  };
}

/**
 * Pose del pie de una pierna (0 = derecha, 1 = izquierda) cuando el cuerpo lleva `dist` metros.
 * `speed` (0..1) suaviza el rodar del pie al arrancar y al detenerse.
 */
export function walkFoot(leg: number, dist: number, speed: number): FootPose {
  const c = legCycle(dist, leg);
  const n = Math.floor(c);
  const u = c - n;
  const roll = Math.min(1, speed * 1.5);
  const toeOff = (m: number) => {
    const spot = plantSpot(leg, plantDist(leg, m));
    // Si el balanceo empezó antes de arrancar, el pie sale plano desde la posición de pie.
    return plantedPose(spot.x, spot.z, spot.yaw, swingStart(leg, m) > 0 ? TOE_OFF * roll : 0);
  };
  const heelStrike = (m: number) => {
    const spot = plantSpot(leg, plantDist(leg, m));
    return plantedPose(spot.x, spot.z, spot.yaw, HEEL_STRIKE * roll);
  };

  if (u >= STANCE) {
    const start = Math.max(0, swingStart(leg, n));
    const end = Math.min(PATH_LEN, (n + 1 - PHASE0 - leg * 0.5) * STRIDE);
    if (start < end && plantDist(leg, n) < plantDist(leg, n + 1)) {
      return swingPose(toeOff(n), heelStrike(n + 1), clamp01((dist - start) / (end - start)), LIFT);
    }
  }

  // Apoyado (o al final del camino, donde ya no hay más pasos).
  const spot = plantSpot(leg, plantDist(leg, n));
  let pitch = 0;
  if (u < 0.08 && plantDist(leg, n - 1) < plantDist(leg, n))
    pitch = HEEL_STRIKE * (1 - smooth(u / 0.08));
  else if (u > 0.38 && swingStart(leg, n) < PATH_LEN && plantDist(leg, n) < plantDist(leg, n + 1)) {
    pitch = TOE_OFF * smooth(clamp01((u - 0.38) / (STANCE - 0.38)));
  }
  return plantedPose(spot.x, spot.z, spot.yaw, pitch * roll);
}

/** Dónde quedan los pies al sentarse: bajo las rodillas, frente al sillón. */
export function seatedFoot(leg: number): FootPose {
  const side = leg === 0 ? 1 : -1;
  const [rx, rz] = right(SEATED_HEADING);
  return plantedPose(
    STOP[0] + rx * side * FOOT_W,
    STOP[1] + rz * side * FOOT_W,
    SEATED_HEADING - side * TOE_OUT,
    0,
  );
}

/** Pasito para girar en el sitio, del apoyo final de la caminata al de sentarse. */
export function turnStep(from: FootPose, to: FootPose, s: number): FootPose {
  if (s <= 0) return from;
  if (s >= 1) return to;
  return swingPose(from, to, s, 0.05, -0.15);
}
