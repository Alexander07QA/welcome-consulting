import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from '../store/sceneStore';
import { softDot } from './textures';
import {
  ANKLE_H,
  FLOOR_Y,
  PATH,
  SEAT,
  SEATED_HEADING,
  START_HEADING,
  WALK_S,
  along,
  clamp01,
  legCycle,
  lerp,
  lerpAngle,
  seatedFoot,
  smooth,
  turnStep,
  walkDistance,
  walkFoot,
  type FootPose,
} from './gait';

// Persona que llega al consultorio y se sienta en el sillón verde, frente a Gabi.
// Coordenadas locales: origen en el piso, la persona mira hacia +z. Los pies salen de la
// marcha (gait.ts) y las piernas se resuelven con IK de dos huesos para que nunca resbalen.

type V3 = [number, number, number];

const START_S = 0.6;
const TURN_S = 1.1;
const SIT_S = 1.7;
const TOTAL_S = START_S + WALK_S + TURN_S + SIT_S;

const HIP_STAND = 0.955;
const HIP_SIT = 0.56;
const HIP_JOINT: V3 = [0.085, -0.02, 0];
const THIGH = 0.44;
const SHIN = 0.44;
const ANKLE = 0.06;
const REACH = (THIGH + SHIN) * 0.999;
const TAU = Math.PI * 2;

const acosSafe = (v: number) => Math.acos(Math.min(1, Math.max(-1, v)));

// Torso: perfil (radio, altura sobre la cadera) que se revoluciona y se achata en z.
const TORSO: [number, number][] = [
  [0, -0.02],
  [0.14, -0.01],
  [0.155, 0.08],
  [0.142, 0.2],
  [0.152, 0.32],
  [0.172, 0.42],
  [0.178, 0.47],
  [0.16, 0.52],
  [0.1, 0.555],
  [0.05, 0.57],
  [0, 0.572],
];
const PELVIS: [number, number][] = [
  [0, -0.09],
  [0.1, -0.088],
  [0.145, -0.05],
  [0.152, 0.02],
  [0.146, 0.07],
  [0, 0.07],
];

const lathe = (profile: [number, number][]) =>
  new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r, y)),
    40,
  );

/** Segmento que se afina, con una esfera en el extremo para la articulación. */
function Segment({
  top,
  bottom,
  len,
  mat,
}: {
  top: number;
  bottom: number;
  len: number;
  mat: THREE.Material;
}) {
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
  const state = useRef({
    t: 0,
    heading: START_HEADING,
    turnFrom: START_HEADING,
    seated: false,
    firstLeg: 0,
    endFeet: [] as FootPose[],
  });
  const shadows = useRef<(THREE.Mesh | null)[]>([]);
  const body = useRef<THREE.Mesh>(null);

  const geo = useMemo(() => ({ torso: lathe(TORSO), pelvis: lathe(PELVIS) }), []);
  const mats = useMemo(
    () => ({
      skin: new THREE.MeshStandardMaterial({ color: '#c99272', roughness: 0.6 }),
      hair: new THREE.MeshStandardMaterial({ color: '#3a271b', roughness: 0.8 }),
      sweater: new THREE.MeshPhysicalMaterial({
        color: '#8fb0c8',
        roughness: 0.9,
        sheen: 0.6,
        sheenColor: new THREE.Color('#ffffff'),
      }),
      pants: new THREE.MeshStandardMaterial({ color: '#7a6b5a', roughness: 0.85 }),
      shoes: new THREE.MeshStandardMaterial({ color: '#4a403a', roughness: 0.6 }),
      sole: new THREE.MeshStandardMaterial({ color: '#efe9e0', roughness: 0.7 }),
    }),
    [],
  );
  // Sombras de contacto: anclan los pies al piso aunque la luz del sol sea tenue (noche).
  const contact = useMemo(() => {
    const map = softDot();
    const make = (opacity: number) =>
      new THREE.MeshBasicMaterial({
        map,
        color: '#2b1d14',
        transparent: true,
        opacity,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      });
    return { feet: [make(0.5), make(0.5)], body: make(0.28) };
  }, []);

  const tmp = useMemo(
    () => ({
      inv: new THREE.Matrix4(),
      v: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      qParent: new THREE.Quaternion(),
      e: new THREE.Euler(0, 0, 0, 'YXZ'),
    }),
    [],
  );

  /** Coloca la pierna para que el tobillo llegue a `pose` (en el mundo). */
  const solveLeg = (i: number, pose: FootPose, heading: number) => {
    const thigh = thighs.current[i];
    const knee = knees.current[i];
    const foot = feet.current[i];
    const hp = hips.current;
    const rt = root.current;
    if (!thigh || !knee || !foot || !hp || !rt) return;
    const { inv, v, q, qParent, e } = tmp;
    // Mundo -> marco de la persona -> marco de la cadera.
    const dx = pose.x - rt.position.x;
    const dz = pose.z - rt.position.z;
    const c = Math.cos(heading);
    const s = Math.sin(heading);
    v.set(dx * c - dz * s, pose.y, dx * s + dz * c);
    v.applyMatrix4(inv.copy(hp.matrix).invert());
    v.x -= (i === 0 ? 1 : -1) * HIP_JOINT[0];
    v.y -= HIP_JOINT[1];

    // Primero se abre de lado (z) y luego se resuelve el plano de la pierna (x).
    const roll = Math.atan2(v.x, -v.y);
    const down = Math.hypot(v.x, v.y);
    const r = Math.min(Math.hypot(down, v.z), REACH);
    const toward = Math.atan2(-v.z, down);
    const hipBend = acosSafe((THIGH * THIGH + r * r - SHIN * SHIN) / (2 * THIGH * r));
    const kneeBend = Math.PI - acosSafe((THIGH * THIGH + SHIN * SHIN - r * r) / (2 * THIGH * SHIN));
    thigh.rotation.set(toward - hipBend, 0, roll, 'ZXY');
    knee.rotation.set(kneeBend, 0, 0);

    // El pie toma la orientación pedida en el mundo, sin importar cómo quedó la pierna.
    e.set(pose.pitch, pose.yaw - heading, 0, 'YXZ');
    q.setFromEuler(e);
    qParent.copy(hp.quaternion).multiply(thigh.quaternion).multiply(knee.quaternion).invert();
    foot.quaternion.copy(qParent.multiply(q));
  };

  useFrame((_, dt) => {
    const st = state.current;
    st.t += Math.min(dt, 0.1);
    const walkT = st.t - START_S;
    const { dist, speed } = walkDistance(walkT);
    const p = along(dist);
    const turnK = clamp01((walkT - WALK_S) / TURN_S);
    const sitRaw = clamp01((walkT - WALK_S - TURN_S) / SIT_S);
    const sit = smooth(sitRaw);

    if (turnK <= 0) {
      st.heading = lerpAngle(st.heading, p.heading, 1 - Math.exp(-dt * 4));
      st.turnFrom = st.heading;
    } else {
      st.heading = lerpAngle(st.turnFrom, SEATED_HEADING, smooth(turnK));
    }

    // Fase del ciclo de la pierna derecha: 0 apoya el talón, 0.3 la tiene bajo el cuerpo.
    const u = legCycle(dist, 0);
    const w = Math.sin(TAU * (u - 0.05));
    const fwd = Math.cos(TAU * u);
    const bob = Math.cos(2 * TAU * (u - 0.3)) * 0.016 * speed;
    // Rodillas algo flexionadas mientras camina; se mantienen al frenar porque un pie queda atrás.
    const crouch = 0.025 * clamp01(walkT / 0.4) * (1 - smooth(turnK));

    if (root.current) {
      root.current.position.set(lerp(p.x, SEAT[0], sit), 0, lerp(p.z, SEAT[1], sit));
      root.current.rotation.y = st.heading;
    }
    if (hips.current) {
      // La cadera baja un poco al caminar, sube sobre la pierna de apoyo y se mece hacia ella.
      hips.current.position.set(w * 0.018 * speed, lerp(HIP_STAND - crouch + bob, HIP_SIT, sit), 0);
      hips.current.rotation.set(0, -fwd * 0.08 * speed, w * 0.035 * speed);
      hips.current.updateMatrix();
    }
    if (torso.current) {
      // Hombros en contra de la cadera; al sentarse se inclina hacia adelante y luego se recuesta.
      torso.current.rotation.x = lerp(0.06 * speed, -0.1, sit) + Math.sin(Math.PI * sitRaw) * 0.32;
      torso.current.rotation.y = fwd * 0.14 * speed;
      torso.current.rotation.z = -w * 0.03 * speed;
    }
    if (head.current) {
      head.current.rotation.x = -Math.sin(Math.PI * sitRaw) * 0.25 + sit * 0.06 - speed * 0.04;
      head.current.rotation.y = -fwd * 0.05 * speed;
    }

    // Al girar, primero mueve el pie que quedó más lejos de donde se va a sentar.
    if (turnK > 0 && st.endFeet.length === 0) {
      st.endFeet = [walkFoot(0, dist, 0), walkFoot(1, dist, 0)];
      const gap = (i: number) =>
        Math.hypot(st.endFeet[i].x - seatedFoot(i).x, st.endFeet[i].z - seatedFoot(i).z);
      st.firstLeg = gap(1) > gap(0) ? 1 : 0;
    }
    [0, 1].forEach((i) => {
      let pose: FootPose;
      if (turnK <= 0) pose = walkFoot(i, dist, speed);
      else {
        const from = st.endFeet[i];
        const s = i === st.firstLeg ? turnK * 2 : turnK * 2 - 1;
        pose = turnStep(from, seatedFoot(i), clamp01(s));
      }
      solveLeg(i, pose, st.heading);

      const shadow = shadows.current[i];
      if (shadow) {
        const f = 0.05;
        shadow.position.set(
          pose.x + Math.sin(pose.yaw) * f,
          FLOOR_Y + 0.004,
          pose.z + Math.cos(pose.yaw) * f,
        );
        shadow.rotation.set(-Math.PI / 2, 0, pose.yaw);
        contact.feet[i].opacity = 0.5 * (1 - clamp01((pose.y - FLOOR_Y - ANKLE_H) / 0.09));
      }

      // Brazo contrario a la pierna; el codo se dobla más cuando el brazo va adelante.
      const side = i === 0 ? 1 : -1;
      const swing = Math.cos(TAU * (u + i * 0.5 - 0.05)) * 0.32 * speed;
      const arm = arms.current[i];
      const elbow = elbows.current[i];
      if (arm) {
        arm.rotation.x = lerp(swing, -0.3, sit);
        arm.rotation.z = side * lerp(0.07, 0.12, sit);
      }
      if (elbow) elbow.rotation.x = lerp(-0.22 - Math.max(0, -swing) * 0.6, -0.85, sit);
    });

    if (body.current && root.current) {
      body.current.position.set(root.current.position.x, FLOOR_Y + 0.003, root.current.position.z);
    }

    if (!st.seated && st.t >= TOTAL_S) {
      st.seated = true;
      markSeated();
    }
  });

  return (
    <>
      {contact.feet.map((m, i) => (
        <mesh key={i} ref={(g) => (shadows.current[i] = g)} material={m} renderOrder={1}>
          <planeGeometry args={[0.13, 0.32]} />
        </mesh>
      ))}
      <mesh
        ref={body}
        rotation-x={-Math.PI / 2}
        position={[PATH[0][0], FLOOR_Y, PATH[0][1]]}
        material={contact.body}
        renderOrder={1}
      >
        <planeGeometry args={[0.6, 0.6]} />
      </mesh>
      <group ref={root} position={[PATH[0][0], 0, PATH[0][1]]}>
        <group ref={hips} position={[0, HIP_STAND, 0]}>
          <mesh geometry={geo.pelvis} material={mats.pants} scale={[1, 1, 0.74]} castShadow />
          {[1, -1].map((side, i) => (
            <group
              key={side}
              ref={(g) => (thighs.current[i] = g)}
              position={[side * HIP_JOINT[0], HIP_JOINT[1], 0]}
            >
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
                <Blob
                  key={s}
                  pos={[s * 0.086, 0.095, -0.004]}
                  scale={[0.012, 0.024, 0.016]}
                  mat={mats.skin}
                />
              ))}
              {/* Cabello corto con volumen arriba y en la nuca */}
              <mesh
                position={[0, 0.118, -0.006]}
                scale={[0.096, 0.112, 0.108]}
                material={mats.hair}
                castShadow
              >
                <sphereGeometry args={[1, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
              </mesh>
              <Blob pos={[0, 0.085, -0.045]} scale={[0.088, 0.085, 0.07]} mat={mats.hair} />
              <Blob
                pos={[0, 0.185, 0.035]}
                scale={[0.07, 0.035, 0.07]}
                rot={[0.3, 0, 0]}
                mat={mats.hair}
              />
            </group>
            {[1, -1].map((side, i) => (
              <group
                key={side}
                ref={(g) => (arms.current[i] = g)}
                position={[side * 0.19, 0.49, -0.005]}
              >
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
    </>
  );
}
