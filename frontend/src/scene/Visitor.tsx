import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from '../store/sceneStore';

// Persona que llega al consultorio y se sienta en el sillón verde, frente a Gabi.
// Coordenadas locales: origen en el piso, la persona mira hacia +z.

type V2 = [x: number, z: number];
type V3 = [number, number, number];

const PATH: V2[] = [
  [3.0, 3.4],
  [1.0, 0.75],
  [0.15, 1.0],
];
const SEAT: V2 = [0.15, 1.58];
const START_S = 0.6;
const SPEED = 0.9;
const TURN_S = 1.0;
const SIT_S = 1.7;
const STRIDE = 1.15;

const HIP_STAND = 0.965;
const HIP_SIT = 0.56;
const THIGH = 0.44;
const SHIN = 0.44;
const ANKLE = 0.06;

const SEGMENTS = PATH.slice(1).map((b, i) => {
  const a = PATH[i];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return { a, b, len, heading: Math.atan2(b[0] - a[0], b[1] - a[1]) };
});
const PATH_LEN = SEGMENTS.reduce((acc, s) => acc + s.len, 0);
const WALK_S = PATH_LEN / SPEED;
const TOTAL_S = START_S + WALK_S + TURN_S + SIT_S;

function along(dist: number): { x: number; z: number; heading: number } {
  let d = dist;
  for (const s of SEGMENTS) {
    if (d <= s.len) {
      const k = d / s.len;
      return { x: s.a[0] + (s.b[0] - s.a[0]) * k, z: s.a[1] + (s.b[1] - s.a[1]) * k, heading: s.heading };
    }
    d -= s.len;
  }
  const last = SEGMENTS[SEGMENTS.length - 1];
  return { x: last.b[0], z: last.b[1], heading: Math.PI };
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => v * v * (3 - 2 * v);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** Acerca un ángulo a otro por el camino más corto. */
function dampAngle(from: number, to: number, k: number): number {
  const diff = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + diff * k;
}

// Torso: perfil (radio, altura sobre la cadera) que se revoluciona y se achata en z.
const TORSO: [number, number][] = [
  [0, -0.02], [0.14, -0.01], [0.155, 0.08], [0.142, 0.2], [0.152, 0.32], [0.172, 0.42],
  [0.178, 0.47], [0.16, 0.52], [0.1, 0.555], [0.05, 0.57], [0, 0.572],
];
const PELVIS: [number, number][] = [
  [0, -0.09], [0.1, -0.088], [0.145, -0.05], [0.152, 0.02], [0.146, 0.07], [0, 0.07],
];

const lathe = (profile: [number, number][]) =>
  new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 40);

/** Segmento que se afina, con una esfera en el extremo para la articulación. */
function Segment({ top, bottom, len, mat }: { top: number; bottom: number; len: number; mat: THREE.Material }) {
  return (
    <>
      <mesh position={[0, -len / 2, 0]} material={mat} castShadow>
        <cylinderGeometry args={[top, bottom, len, 16]} />
      </mesh>
      <mesh position={[0, -len, 0]} material={mat} castShadow>
        <sphereGeometry args={[bottom, 16, 12]} />
      </mesh>
    </>
  );
}

function Blob({ pos, scale, mat, rot }: { pos: V3; scale: V3; mat: THREE.Material; rot?: V3 }) {
  return (
    <mesh position={pos} scale={scale} rotation={rot} material={mat} castShadow>
      <sphereGeometry args={[1, 24, 18]} />
    </mesh>
  );
}

export function Visitor() {
  const markSeated = useSceneStore((s) => s.markVisitorSeated);
  const root = useRef<THREE.Group>(null);
  const hips = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const thighs = useRef<(THREE.Group | null)[]>([]);
  const knees = useRef<(THREE.Group | null)[]>([]);
  const feet = useRef<(THREE.Group | null)[]>([]);
  const arms = useRef<(THREE.Group | null)[]>([]);
  const elbows = useRef<(THREE.Group | null)[]>([]);
  // Siempre camina hasta el asiento, aun con movimiento reducido: es parte de la bienvenida.
  const state = useRef({ t: 0, heading: SEGMENTS[0].heading, seated: false });

  const geo = useMemo(() => ({ torso: lathe(TORSO), pelvis: lathe(PELVIS) }), []);
  const mats = useMemo(
    () => ({
      skin: new THREE.MeshStandardMaterial({ color: '#c99272', roughness: 0.6 }),
      hair: new THREE.MeshStandardMaterial({ color: '#3a271b', roughness: 0.8 }),
      sweater: new THREE.MeshPhysicalMaterial({ color: '#8fb0c8', roughness: 0.9, sheen: 0.6, sheenColor: new THREE.Color('#ffffff') }),
      pants: new THREE.MeshStandardMaterial({ color: '#7a6b5a', roughness: 0.85 }),
      shoes: new THREE.MeshStandardMaterial({ color: '#4a403a', roughness: 0.6 }),
      sole: new THREE.MeshStandardMaterial({ color: '#efe9e0', roughness: 0.7 }),
    }),
    [],
  );

  useFrame((_, dt) => {
    const st = state.current;
    st.t += Math.min(dt, 0.1);
    const dist = clamp01((st.t - START_S) / WALK_S) * PATH_LEN;
    const p = along(dist);
    const walking = st.t > START_S && dist < PATH_LEN;
    st.heading = dampAngle(st.heading, walking ? p.heading : Math.PI, 1 - Math.exp(-dt * 5));

    const sitRaw = clamp01((st.t - START_S - WALK_S - TURN_S) / SIT_S);
    const sit = smooth(sitRaw);
    const amp = walking ? Math.min(1, (PATH_LEN - dist) / 0.35, dist / 0.25) : 0;
    const phase = (dist / STRIDE) * Math.PI * 2;
    const bob = (Math.cos(phase * 2) * 0.5 + 0.5) * 0.022 * amp;

    if (root.current) {
      root.current.position.set(lerp(p.x, SEAT[0], sit), 0, lerp(p.z, SEAT[1], sit));
      root.current.rotation.y = st.heading;
    }
    if (hips.current) {
      hips.current.position.y = lerp(HIP_STAND - 0.01 + bob, HIP_SIT, sit);
      hips.current.rotation.y = Math.sin(phase) * 0.09 * amp;
      hips.current.rotation.z = Math.cos(phase) * 0.03 * amp;
    }
    if (torso.current) {
      // Al sentarse se inclina hacia adelante y luego se recuesta.
      torso.current.rotation.x = lerp(0.05 * amp, -0.1, sit) + Math.sin(Math.PI * sitRaw) * 0.32;
      torso.current.rotation.y = -Math.sin(phase) * 0.14 * amp;
      torso.current.rotation.z = -Math.cos(phase) * 0.03 * amp;
    }
    if (head.current) {
      head.current.rotation.x = -Math.sin(Math.PI * sitRaw) * 0.25 + sit * 0.06;
      head.current.rotation.y = Math.sin(phase) * 0.05 * amp;
    }

    [1, -1].forEach((side, i) => {
      const ph = phase + (side > 0 ? 0 : Math.PI);
      const legSwing = Math.sin(ph) * 0.42 * amp;
      // La rodilla se dobla al llevar la pierna adelante y casi se estira al apoyar.
      const kneeBend = (0.08 + Math.max(0, Math.cos(ph)) * 0.85) * amp;
      const thighRot = lerp(legSwing, -1.5, sit);
      const kneeRot = lerp(kneeBend, 1.5, sit);
      const thigh = thighs.current[i];
      const knee = knees.current[i];
      const foot = feet.current[i];
      const arm = arms.current[i];
      const elbow = elbows.current[i];
      if (thigh) thigh.rotation.x = thighRot;
      if (knee) knee.rotation.x = kneeRot;
      // El pie queda paralelo al piso y despega la punta al final del paso.
      if (foot) foot.rotation.x = -(thighRot + kneeRot) + Math.max(0, -Math.sin(ph)) * 0.25 * amp * (1 - sit);
      if (arm) {
        arm.rotation.x = lerp(-Math.sin(ph) * 0.38 * amp, -0.3, sit);
        arm.rotation.z = side * lerp(0.06, 0.12, sit);
      }
      if (elbow) elbow.rotation.x = lerp(-0.25 - Math.max(0, -Math.sin(ph)) * 0.3 * amp, -0.85, sit);
    });

    if (!st.seated && st.t >= TOTAL_S) {
      st.seated = true;
      markSeated();
    }
  });

  return (
    <group ref={root} position={[PATH[0][0], 0, PATH[0][1]]}>
      <group ref={hips} position={[0, HIP_STAND, 0]}>
        <mesh geometry={geo.pelvis} material={mats.pants} scale={[1, 1, 0.74]} castShadow />
        {[1, -1].map((side, i) => (
          <group key={side} ref={(g) => (thighs.current[i] = g)} position={[side * 0.085, -0.02, 0]}>
            <Segment top={0.072} bottom={0.056} len={THIGH} mat={mats.pants} />
            <group ref={(g) => (knees.current[i] = g)} position={[0, -THIGH, 0]}>
              <Segment top={0.056} bottom={0.045} len={SHIN - ANKLE} mat={mats.pants} />
              <mesh position={[0, -SHIN + ANKLE / 2, 0]} material={mats.skin}>
                <cylinderGeometry args={[0.032, 0.032, ANKLE, 12]} />
              </mesh>
              <group ref={(g) => (feet.current[i] = g)} position={[0, -SHIN, 0]}>
                <Blob pos={[0, -0.022, 0.055]} scale={[0.048, 0.04, 0.13]} mat={mats.shoes} />
                <Blob pos={[0, -0.05, 0.055]} scale={[0.05, 0.014, 0.135]} mat={mats.sole} />
              </group>
            </group>
          </group>
        ))}
        <group ref={torso}>
          <mesh geometry={geo.torso} material={mats.sweater} scale={[1, 1, 0.68]} castShadow />
          <mesh position={[0, 0.6, 0]} material={mats.skin} castShadow>
            <cylinderGeometry args={[0.042, 0.048, 0.1, 14]} />
          </mesh>
          <group ref={head} position={[0, 0.64, 0]}>
            <Blob pos={[0, 0.1, 0.008]} scale={[0.088, 0.112, 0.1]} mat={mats.skin} />
            <Blob pos={[0, 0.098, 0.1]} scale={[0.014, 0.02, 0.016]} mat={mats.skin} />
            {[1, -1].map((s) => (
              <Blob key={s} pos={[s * 0.086, 0.095, -0.004]} scale={[0.012, 0.024, 0.016]} mat={mats.skin} />
            ))}
            {/* Cabello corto con volumen arriba y en la nuca */}
            <mesh position={[0, 0.118, -0.006]} scale={[0.096, 0.112, 0.108]} material={mats.hair} castShadow>
              <sphereGeometry args={[1, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
            </mesh>
            <Blob pos={[0, 0.085, -0.045]} scale={[0.088, 0.085, 0.07]} mat={mats.hair} />
            <Blob pos={[0, 0.185, 0.035]} scale={[0.07, 0.035, 0.07]} rot={[0.3, 0, 0]} mat={mats.hair} />
          </group>
          {[1, -1].map((side, i) => (
            <group key={side} ref={(g) => (arms.current[i] = g)} position={[side * 0.19, 0.49, -0.005]}>
              <Blob pos={[0, 0, 0]} scale={[0.058, 0.055, 0.058]} mat={mats.sweater} />
              <Segment top={0.05} bottom={0.042} len={0.27} mat={mats.sweater} />
              <group ref={(g) => (elbows.current[i] = g)} position={[0, -0.27, 0]}>
                <Segment top={0.042} bottom={0.034} len={0.22} mat={mats.sweater} />
                <mesh position={[0, -0.24, 0]} material={mats.skin}>
                  <cylinderGeometry args={[0.026, 0.028, 0.04, 10]} />
                </mesh>
                <Blob pos={[0, -0.3, 0.005]} scale={[0.022, 0.05, 0.036]} mat={mats.skin} />
              </group>
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}
