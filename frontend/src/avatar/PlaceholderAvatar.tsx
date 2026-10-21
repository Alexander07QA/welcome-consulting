import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { rig } from './rig';
import { buildHairGeometry, hairMaterial, HEAD_CENTER } from './hair';
import { createMouth } from './mouth';
import { buildHeadGeometry, faceZ } from './head';
import { iris, ribbed, softDot } from '../scene/textures';
import { between } from '../scene/geometry';
import { gestureOffsets } from './gestures';
import { createBlinker } from './idle';

// Avatar provisional de Gabi (sección 10A) con rasgos de la fotografía de referencia.
// Coordenadas locales: origen en el piso, centro del sillón; Gabi mira hacia +z.

const SKIN = '#f7dccb';
const SKIN_SHADE = '#ebc3ac';
const SHIRT = '#f6f2ea';
const TOP = '#b9c4b0';
const JEANS = '#6f8fb4';
const SHOES = '#d9c2a5';
const GOLD = '#d4a53c';
const PEARL = '#f4efe4';
const BROW = '#4a3222';

type V3 = [number, number, number];
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function useMats() {
  return useMemo(() => {
    const skin = new THREE.MeshPhysicalMaterial({
      color: SKIN,
      roughness: 0.55,
      sheen: 0.35,
      sheenColor: new THREE.Color('#ffd6c4'),
      emissive: new THREE.Color('#5a2414'),
      emissiveIntensity: 0.03,
    });
    const rib = ribbed();
    return {
      skin,
      skinShade: new THREE.MeshStandardMaterial({ color: SKIN_SHADE, roughness: 0.6 }),
      shirt: new THREE.MeshPhysicalMaterial({ color: SHIRT, roughness: 0.82, sheen: 0.6, sheenColor: new THREE.Color('#ffffff'), side: THREE.DoubleSide }),
      top: new THREE.MeshStandardMaterial({ color: TOP, roughness: 0.85, bumpMap: rib, bumpScale: 0.6 }),
      jeans: new THREE.MeshStandardMaterial({ color: JEANS, roughness: 0.9 }),
      shoes: new THREE.MeshStandardMaterial({ color: SHOES, roughness: 0.6 }),
      gold: new THREE.MeshStandardMaterial({ color: GOLD, metalness: 1, roughness: 0.28 }),
      pearl: new THREE.MeshPhysicalMaterial({ color: PEARL, roughness: 0.18, clearcoat: 1, sheen: 1, sheenColor: new THREE.Color('#ffe9f2') }),
      brow: new THREE.MeshStandardMaterial({ color: BROW, roughness: 0.85 }),
      lash: new THREE.MeshStandardMaterial({ color: '#1c120c', roughness: 0.7 }),
      sclera: new THREE.MeshPhysicalMaterial({ color: '#fbf7f2', roughness: 0.25, clearcoat: 0.6 }),
      iris: new THREE.MeshPhysicalMaterial({ map: iris(), roughness: 0.2, clearcoat: 1 }),
      lips: new THREE.MeshPhysicalMaterial({ color: '#de8288', roughness: 0.35, clearcoat: 0.5, side: THREE.DoubleSide }),
      inner: new THREE.MeshStandardMaterial({ color: '#6b2a30', roughness: 0.8, side: THREE.DoubleSide }),
      teeth: new THREE.MeshPhysicalMaterial({ color: '#f8f4ee', roughness: 0.25, clearcoat: 0.5, side: THREE.DoubleSide }),
      blush: new THREE.MeshBasicMaterial({ color: '#f39a95', map: softDot(), transparent: true, opacity: 0.12, depthWrite: false }),
      shadow: new THREE.MeshBasicMaterial({ color: '#a36b52', transparent: true, opacity: 0.35, depthWrite: false }),
      highlight: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
      hairFill: new THREE.MeshStandardMaterial({ color: '#5a3922', roughness: 0.7 }),
    };
  }, []);
}

/** Cápsula entre dos puntos. */
function Limb({ a, b, r, mat }: { a: THREE.Vector3; b: THREE.Vector3; r: number; mat: THREE.Material }) {
  const { mid, quat, len } = useMemo(() => between(a, b), [a, b]);
  return (
    <mesh position={mid} quaternion={quat} material={mat} castShadow receiveShadow>
      <capsuleGeometry args={[r, Math.max(0.001, len), 6, 14]} />
    </mesh>
  );
}

function Ellipsoid({ pos, scale, mat, rot, seg = 24 }: { pos: V3; scale: V3; mat: THREE.Material; rot?: V3; seg?: number }) {
  return (
    <mesh position={pos} scale={scale} rotation={rot} material={mat} castShadow receiveShadow>
      <sphereGeometry args={[1, seg, Math.round(seg * 0.75)]} />
    </mesh>
  );
}

function tube(points: THREE.Vector3[], r: number, seg = 16): THREE.TubeGeometry {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), seg, r, 6, false);
}

// Torso: perfil (radio, altura) que se revoluciona y se achata en z.
const TORSO: [number, number][] = [
  [0.0, 0.58], [0.16, 0.585], [0.178, 0.64], [0.168, 0.7], [0.142, 0.78], [0.138, 0.84],
  [0.152, 0.92], [0.155, 0.98], [0.148, 1.04], [0.13, 1.09], [0.08, 1.13], [0.05, 1.15], [0.0, 1.155],
];
const TORSO_Z = 0.66;
const BODY_Z = -0.1;

function lathe(profile: [number, number][], grow: number, y0: number, y1: number, phiStart = 0, phiLength = Math.PI * 2) {
  const pts = profile
    .filter(([, y]) => y >= y0 - 1e-6 && y <= y1 + 1e-6)
    .map(([r, y]) => new THREE.Vector2(r > 0 ? r + grow : 0, y));
  return new THREE.LatheGeometry(pts, 48, phiStart, phiLength);
}

function radiusAt(y: number): number {
  for (let i = 0; i < TORSO.length - 1; i++) {
    const [r0, y0] = TORSO[i];
    const [r1, y1] = TORSO[i + 1];
    if (y >= y0 && y <= y1) return THREE.MathUtils.lerp(r0, r1, (y - y0) / (y1 - y0));
  }
  return 0;
}

export function PlaceholderAvatar({ position, reducedMotion }: { position: V3; reducedMotion: boolean }) {
  const m = useMats();
  const amp = reducedMotion ? 0.3 : 1;

  const head = useRef<THREE.Group>(null);
  const chest = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const eyes = useRef<(THREE.Group | null)[]>([]);
  const irises = useRef<(THREE.Group | null)[]>([]);
  const brows = useRef<(THREE.Group | null)[]>([]);
  const cheeks = useRef<(THREE.Mesh | null)[]>([]);

  const hair = useMemo(() => ({ geo: buildHairGeometry(), ...hairMaterial() }), []);
  const headGeo = useMemo(buildHeadGeometry, []);
  const mouth = useMemo(() => createMouth(), []);
  const blinker = useMemo(createBlinker, []);
  const smooth = useRef({ open: 0, wide: 0, breath: 0, eyeOpen: 1 });

  useEffect(() => () => hair.geo.dispose(), [hair]);

  // Geometrías estáticas del cuerpo
  const body = useMemo(() => {
    const opening = 0.68;
    const shirtProfile: [number, number][] = TORSO.map(([r, y]) => [r === 0 ? 0 : Math.max(r, 0.15), y]);
    const edge = (s: number, y: number, grow: number) => {
      const r = Math.max(radiusAt(y), 0.15) + grow;
      return v(s * Math.sin(opening) * r, y, BODY_Z + Math.cos(opening) * r * TORSO_Z);
    };
    return {
      torso: lathe(TORSO, 0, 0.58, 1.155),
      top: lathe(TORSO, 0.004, 0.6, 1.0),
      jeansBand: lathe(TORSO, 0.008, 0.58, 0.7),
      shirt: lathe(shirtProfile, 0.026, 0.62, 1.12, opening, Math.PI * 2 - opening * 2),
      lapels: [-1, 1].map((s) => tube([edge(s, 1.11, 0.03), edge(s, 1.02, 0.034), edge(s, 0.9, 0.033), edge(s, 0.66, 0.03)], 0.012, 20)),
      necklaceShort: tube(
        [v(-0.055, 1.135, -0.13), v(-0.075, 1.11, -0.075), v(-0.058, 1.083, -0.02), v(0, 1.07, -0.006), v(0.058, 1.083, -0.02), v(0.075, 1.11, -0.075), v(0.055, 1.135, -0.13)],
        0.0016,
        48,
      ),
      necklaceLong: tube(
        [v(-0.06, 1.135, -0.13), v(-0.092, 1.09, -0.06), v(-0.072, 1.03, -0.008), v(0, 0.99, 0.009), v(0.072, 1.03, -0.008), v(0.092, 1.09, -0.06), v(0.06, 1.135, -0.13)],
        0.0019,
        48,
      ),
    };
  }, []);

  const face = useMemo(() => {
    const brow = (s: number) =>
      tube(
        [
          [0.013, 0.149],
          [0.03, 0.157],
          [0.05, 0.158],
          [0.067, 0.148],
        ].map(([x, y]) => v(s * x, y, faceZ(x, y) + 0.0018)),
        0.0023,
        14,
      );
    const lash = (lower: boolean) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 10; i++) {
        const u = (i / 10) * 2 - 1;
        const y = (lower ? -1 : 1) * 0.0101 * Math.sqrt(Math.max(0, 1 - u * u)) * (lower ? 0.9 : 1);
        pts.push(v(u * 0.0188, y + (lower ? 0 : 0.0006), 0.006 * Math.sqrt(Math.max(0, 1 - u * u)) + 0.0002));
      }
      if (!lower) pts.push(v(0.0218, 0.0042, 0.0002));
      return tube(pts, lower ? 0.0005 : 0.0015, 20);
    };
    return { browL: brow(1), browR: brow(-1), lashUp: lash(false), lashLow: lash(true) };
  }, []);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const now = performance.now();
    const k = 1 - Math.exp(-dt / 0.12);
    const cur = rig.current;
    const tgt = rig.target;
    (Object.keys(cur) as (keyof typeof cur)[]).forEach((key) => {
      cur[key] += (tgt[key] - cur[key]) * k;
    });

    // Respiración natural (~5 s) o guiada
    const s = smooth.current;
    const natural = (Math.sin((t / 5) * Math.PI * 2) * 0.5 + 0.5) * amp;
    const guided = rig.breathing;
    const breathTarget = guided === null ? natural * 0.35 : guided;
    s.breath += (breathTarget - s.breath) * (1 - Math.exp(-dt / 0.25));
    if (chest.current) {
      const g = 1 + s.breath * (guided === null ? 0.03 : 0.05);
      chest.current.scale.set(1 + (g - 1) * 0.5, 1 + (g - 1) * 0.25, g);
    }

    // Boca: visemas/apertura directa o movimiento simulado mientras llega texto
    let open = rig.mouthOpen;
    let wide = rig.mouthWide;
    if (now < rig.talkUntil) {
      open = 0.18 + 0.5 * Math.abs(Math.sin(t * 13)) * (0.6 + 0.4 * Math.sin(t * 5.3));
      wide = 0.25 * Math.sin(t * 7.1);
    }
    s.open += (open - s.open) * (1 - Math.exp(-dt / 0.05));
    s.wide += (wide - s.wide) * (1 - Math.exp(-dt / 0.06));
    mouth.update({ smile: cur.mouthSmile * (1 - s.open * 0.4), frown: cur.mouthFrown, open: s.open, wide: s.wide });

    // Ojos: parpadeo, ojos casi cerrados al respirar, sonrisa en los ojos
    const blink = blinker(now);
    const eyeTarget = guided !== null ? 0.18 : 1 - cur.cheekSquint * 0.28;
    s.eyeOpen += (eyeTarget - s.eyeOpen) * (1 - Math.exp(-dt / 0.2));
    const eyeOpen = Math.max(0.06, s.eyeOpen * (1 - blink));
    eyes.current.forEach((e) => e && (e.scale.y = eyeOpen));
    const lx = rig.look.x * 0.0032;
    const ly = rig.look.y * 0.0022 + cur.lookUp * 0.0028;
    irises.current.forEach((g) => g && g.position.set(lx, ly, 0));

    brows.current.forEach((b, i) => {
      if (!b) return;
      const side = i === 0 ? 1 : -1;
      b.position.y = cur.browInnerUp * 0.0045 - cur.browDown * 0.004 + s.open * 0.0015;
      b.rotation.z = side * (-cur.browInnerUp * 0.22 + cur.browDown * 0.12);
    });
    cheeks.current.forEach((c) => {
      if (!c) return;
      (c.material as THREE.MeshBasicMaterial).opacity = 0.1 + cur.cheekSquint * 0.16 + cur.mouthSmile * 0.06;
      c.position.y = 0.084 + cur.cheekSquint * 0.003;
    });

    // Cabeza: inclinación de la emoción, mirada, micro-movimientos y gestos
    if (head.current) {
      const gst = gestureOffsets(rig.gesture, now);
      if (gst.done) rig.gesture = null;
      head.current.rotation.set(
        (-rig.look.y * 0.07 - cur.lookUp * 0.1 + Math.sin(t * 0.23) * 0.015 * amp + gst.pitch) ,
        rig.look.x * 0.16 + Math.sin(t * 0.37) * 0.03 * amp,
        THREE.MathUtils.degToRad(cur.headTilt) + Math.sin(t * 0.17) * 0.01 * amp + gst.roll,
        'YXZ',
      );
      head.current.position.y = 1.185 + s.breath * 0.006;
    }
    if (armR.current) armR.current.rotation.x = now < rig.talkUntil ? Math.sin(t * 2.3) * 0.05 * amp : 0;
    hair.uniforms.uTime.value = t;
    hair.uniforms.uAmp.value = amp;
  });

  // Puntos de las extremidades
  const L = useMemo(() => {
    const limbs = {
      shoulder: (s: number) => v(s * 0.185, 1.06, -0.1),
      elbow: (s: number) => v(s * 0.222, 0.82, -0.065),
      wrist: (s: number) => v(s * 0.07, 0.715, 0.14),
      hip: (s: number) => v(s * 0.095, 0.64, -0.06),
      knee: (s: number) => v(s * 0.1, 0.645, 0.335),
      ankle: (s: number) => v(s * 0.11, 0.1, 0.4),
    };
    return limbs;
  }, []);

  const arm = (s: number) => {
    const sh = L.shoulder(s);
    const el = L.elbow(s);
    const wr = L.wrist(s);
    const cuff = wr.clone().lerp(el, 0.12);
    return (
      <>
        <Limb a={sh} b={el} r={0.053} mat={m.shirt} />
        <Limb a={el} b={cuff} r={0.048} mat={m.shirt} />
        <Limb a={cuff} b={wr} r={0.026} mat={m.skin} />
        <Ellipsoid
          pos={[wr.x - s * 0.02, wr.y - 0.004, wr.z + 0.045]}
          scale={[0.032, 0.016, 0.05]}
          rot={[0.1, s * 0.6, 0]}
          mat={m.skin}
        />
        <Ellipsoid pos={[wr.x + s * 0.004, wr.y + 0.006, wr.z + 0.035]} scale={[0.01, 0.009, 0.026]} rot={[0, s * -0.4, 0]} mat={m.skin} />
      </>
    );
  };

  return (
    <group position={position}>
      {/* Piernas en jean, sentada */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Limb a={L.hip(s)} b={L.knee(s)} r={0.078} mat={m.jeans} />
          <Limb a={L.knee(s)} b={L.ankle(s)} r={0.056} mat={m.jeans} />
          <Ellipsoid pos={[s * 0.11, 0.035, 0.47]} scale={[0.045, 0.035, 0.11]} mat={m.shoes} />
          <Limb a={v(s * 0.11, 0.1, 0.4)} b={v(s * 0.11, 0.07, 0.42)} r={0.04} mat={m.skin} />
        </group>
      ))}

      {/* Torso con respiración */}
      <group ref={chest} position={[0, 0.6, BODY_Z]}>
        <group position={[0, -0.6, 0]} scale={[1, 1, TORSO_Z]}>
          <mesh geometry={body.torso} material={m.skin} castShadow receiveShadow />
          <mesh geometry={body.top} material={m.top} castShadow receiveShadow />
          <mesh geometry={body.jeansBand} material={m.jeans} castShadow />
        </group>
        <group position={[0, -0.6, -BODY_Z]}>
          <mesh geometry={body.shirt} material={m.shirt} position={[0, 0, BODY_Z]} scale={[1, 1, TORSO_Z]} castShadow receiveShadow />
          {body.lapels.map((g, i) => (
            <mesh key={i} geometry={g} material={m.shirt} scale={[1, 1, 1]} castShadow />
          ))}
          <mesh geometry={body.necklaceShort} material={m.gold} />
          <mesh geometry={body.necklaceLong} material={m.gold} />
          {/* Dije: argolla dorada, perla y piedrita verde */}
          <mesh position={[0, 0.982, 0.012]} material={m.gold}>
            <torusGeometry args={[0.0075, 0.0018, 8, 20]} />
          </mesh>
          <mesh position={[-0.004, 0.968, 0.014]} material={m.pearl}>
            <sphereGeometry args={[0.0065, 16, 12]} />
          </mesh>
          <mesh position={[0.006, 0.966, 0.015]} scale={[0.7, 1, 0.6]}>
            <sphereGeometry args={[0.0058, 12, 10]} />
            <meshPhysicalMaterial color="#b7c25a" roughness={0.1} transmission={0.4} thickness={0.01} />
          </mesh>
          {/* Hombros de la camisa */}
          {[-1, 1].map((s) => (
            <Ellipsoid key={s} pos={[s * 0.168, 1.075, BODY_Z]} scale={[0.07, 0.05, 0.075]} mat={m.shirt} />
          ))}
        </group>
      </group>

      {/* Brazos: el derecho acompaña el habla */}
      <group>{arm(1)}</group>
      <group ref={armR} position={[-0.185, 1.06, -0.1]}>
        <group position={[0.185, -1.06, 0.1]}>{arm(-1)}</group>
      </group>

      {/* Cuello */}
      <Limb a={v(0, 1.1, -0.09)} b={v(0, 1.2, -0.075)} r={0.041} mat={m.skin} />

      {/* Cabeza */}
      <group ref={head} position={[0, 1.185, -0.075]}>
        <mesh geometry={headGeo} material={m.skin} castShadow receiveShadow />
        {/* Orejas */}
        {[-1, 1].map((s) => (
          <Ellipsoid key={s} pos={[s * 0.09, 0.108, -0.006]} scale={[0.009, 0.02, 0.014]} mat={m.skinShade} />
        ))}
        {/* Aretes dorados con perlas */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.094, 0.084, 0.002]} rotation-y={s * Math.PI / 2}>
            <mesh material={m.gold} rotation-z={Math.PI * 0.6}>
              <torusGeometry args={[0.011, 0.0028, 8, 24, Math.PI * 1.3]} />
            </mesh>
            <mesh position={[0.004, -0.009, 0.003]} material={m.pearl}>
              <sphereGeometry args={[0.0058, 14, 10]} />
            </mesh>
            <mesh position={[-0.004, -0.008, 0.003]} material={m.pearl}>
              <sphereGeometry args={[0.0052, 14, 10]} />
            </mesh>
          </group>
        ))}

        {/* Nariz */}
        <Limb a={v(0, 0.122, faceZ(0, 0.122) - 0.004)} b={v(0, 0.09, faceZ(0, 0.09) + 0.0045)} r={0.0046} mat={m.skin} />
        <Ellipsoid pos={[0, 0.0865, faceZ(0, 0.0865) + 0.0045]} scale={[0.0098, 0.0084, 0.0088]} mat={m.skin} />
        {[-1, 1].map((s) => (
          <Ellipsoid key={s} pos={[s * 0.0082, 0.083, faceZ(0.0082, 0.083) + 0.0008]} scale={[0.0052, 0.0042, 0.005]} mat={m.skin} />
        ))}

        {/* Ojos café avellana, almendrados */}
        {[-1, 1].map((s, i) => (
          <group key={s} position={[s * 0.036, 0.121, faceZ(0.036, 0.121) - 0.003]}>
            <mesh position={[0, 0.0125, -0.0005]} scale={[0.023, 0.0072, 0.004]} material={m.shadow}>
              <sphereGeometry args={[1, 16, 8]} />
            </mesh>
            <group ref={(g) => (eyes.current[i] = g)} rotation-z={s * -0.06}>
              <Ellipsoid pos={[0, 0, 0]} scale={[0.0188, 0.0104, 0.006]} mat={m.sclera} />
              <group ref={(g) => (irises.current[i] = g)}>
                <mesh position={[0, 0, 0.006]} material={m.iris}>
                  <circleGeometry args={[0.0084, 24]} />
                </mesh>
                <mesh position={[0.0026, 0.0026, 0.0062]} material={m.highlight}>
                  <circleGeometry args={[0.0017, 10]} />
                </mesh>
              </group>
              <mesh geometry={face.lashUp} material={m.lash} scale={[s, 1, 1]} />
              <mesh geometry={face.lashLow} material={m.lash} />
            </group>
          </group>
        ))}

        {/* Cejas castañas definidas */}
        <group ref={(g) => (brows.current[0] = g)}>
          <mesh geometry={face.browL} material={m.brow} />
        </group>
        <group ref={(g) => (brows.current[1] = g)}>
          <mesh geometry={face.browR} material={m.brow} />
        </group>

        {/* Rubor */}
        {[-1, 1].map((s, i) => (
          <mesh
            key={s}
            ref={(c) => (cheeks.current[i] = c)}
            position={[s * 0.05, 0.084, faceZ(0.05, 0.084) + 0.0012]}
            rotation-y={s * 0.55}
            material={m.blush}
          >
            <circleGeometry args={[0.024, 20]} />
          </mesh>
        ))}

        {/* Boca */}
        <group position={[0, 0.051, faceZ(0, 0.051) + 0.0022]}>
          <mesh geometry={mouth.lips} material={m.lips} />
          <mesh geometry={mouth.inner} material={m.inner} />
          <mesh geometry={mouth.teeth} material={m.teeth} />
        </group>

        {/* Cabello: casquete con raya al medio + mechones largos */}
        <mesh
          position={[HEAD_CENTER.x, HEAD_CENTER.y + 0.004, HEAD_CENTER.z - 0.004]}
          rotation-x={-0.55}
          scale={[0.1, 0.112, 0.106]}
          castShadow
        >
          <sphereGeometry args={[1, 40, 24, 0, Math.PI * 2, 0, 1.45]} />
          <meshPhysicalMaterial color="#432a1b" roughness={0.5} sheen={0.7} sheenColor="#ffd9a6" />
        </mesh>
        <mesh geometry={hair.geo} material={hair.material} castShadow />
        {/* Volumen interior para que no se vea a través */}
        <Ellipsoid pos={[0, -0.12, -0.115]} scale={[0.17, 0.28, 0.05]} mat={m.hairFill} seg={16} />
      </group>
    </group>
  );
}
