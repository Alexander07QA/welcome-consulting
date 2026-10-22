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

const SKIN = '#ebba98';
const SKIN_SHADE = '#d49a78';
const SHIRT = '#f6f2ea';
const TOP = '#b9c4b0';
const JEANS = '#6f8fb4';
const SHOES = '#d9c2a5';
const GOLD = '#d4a53c';
const PEARL = '#f4efe4';
const BROW = '#43291a';

// Ojos almendrados: centro, semiancho y semialto (párpados) en coordenadas de la cabeza.
const EYE = { x: 0.0385, y: 0.121, w: 0.019, h: 0.0088 };

type V3 = [number, number, number];
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Pivote de la ceja izquierda; cada ceja gira sobre su centro para expresar emoción. */
const BROW_PIVOT = v(0.038, 0.144, faceZ(0.038, 0.144));

const insideEye = {
  stencilWrite: true,
  stencilRef: 1,
  stencilFunc: THREE.EqualStencilFunc,
  stencilZPass: THREE.KeepStencilOp,
} as const;

function useMats() {
  return useMemo(() => {
    const skin = new THREE.MeshPhysicalMaterial({
      color: SKIN,
      roughness: 0.52,
      sheen: 0.4,
      sheenColor: new THREE.Color('#ffd2b8'),
      emissive: new THREE.Color('#6a2a14'),
      emissiveIntensity: 0.04,
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
      brow: new THREE.MeshStandardMaterial({ color: BROW, roughness: 0.9, side: THREE.DoubleSide }),
      lash: new THREE.MeshStandardMaterial({ color: '#1c120c', roughness: 0.7 }),
      // El blanco del ojo marca el stencil; iris y brillo solo se pintan dentro de él,
      // así los párpados (la piel) recortan el iris como en un ojo real.
      sclera: new THREE.MeshPhysicalMaterial({
        color: '#f3ece4',
        roughness: 0.25,
        clearcoat: 0.6,
        stencilWrite: true,
        stencilRef: 1,
        stencilFunc: THREE.AlwaysStencilFunc,
        stencilZPass: THREE.ReplaceStencilOp,
      }),
      iris: new THREE.MeshPhysicalMaterial({ map: iris(), roughness: 0.2, clearcoat: 1, ...insideEye }),
      lips: new THREE.MeshPhysicalMaterial({ color: '#d07c78', roughness: 0.32, clearcoat: 0.6, side: THREE.DoubleSide }),
      inner: new THREE.MeshStandardMaterial({ color: '#6b2a30', roughness: 0.8, side: THREE.DoubleSide }),
      teeth: new THREE.MeshPhysicalMaterial({ color: '#f8f4ee', roughness: 0.25, clearcoat: 0.5, side: THREE.DoubleSide }),
      blush: new THREE.MeshBasicMaterial({ color: '#e8857a', map: softDot(), transparent: true, opacity: 0.16, depthWrite: false }),
      shadow: new THREE.MeshBasicMaterial({ color: '#9c5c44', map: softDot(), transparent: true, opacity: 0.45, depthWrite: false }),
      highlight: new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, ...insideEye }),
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

// Pierna sentada como un solo tubo: muslo sobre el cojín, rodilla al borde del sillón y
// espinilla levemente adelantada. Radio del jean según la zona para que no haya escalones.
const LEG_PATH = (s: number) => [
  v(s * 0.095, 0.64, -0.06),
  v(s * 0.096, 0.648, 0.15),
  v(s * 0.09, 0.638, 0.3),
  v(s * 0.088, 0.592, 0.378),
  v(s * 0.092, 0.42, 0.415),
  v(s * 0.096, 0.25, 0.44),
  v(s * 0.1, 0.105, 0.455),
];
const g1 = (d: number, w: number) => Math.exp(-((d / w) ** 2));

function legRadius(p: THREE.Vector3): number {
  const thigh = THREE.MathUtils.lerp(0.086, 0.06, THREE.MathUtils.smoothstep(p.z, -0.06, 0.34));
  const shin = 0.047 + 0.006 * g1(p.y - 0.43, 0.09) + 0.004 * THREE.MathUtils.smoothstep(0.17, 0.12, p.y);
  return THREE.MathUtils.lerp(shin, thigh, THREE.MathUtils.smoothstep(p.y, 0.52, 0.6));
}

function legGeometry(s: number): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(LEG_PATH(s), false, 'centripetal');
  const TS = 72;
  const RS = 22;
  const geo = new THREE.TubeGeometry(curve, TS, 1, RS, false);
  const pos = geo.attributes.position;
  const c = new THREE.Vector3();
  const p = new THREE.Vector3();
  for (let i = 0; i <= TS; i++) {
    curve.getPointAt(i / TS, c);
    const r = legRadius(c);
    for (let k = 0; k <= RS; k++) {
      const idx = i * (RS + 1) + k;
      p.fromBufferAttribute(pos, idx).sub(c);
      // El muslo apoyado se ensancha un poco y se aplana contra el cojín.
      const flat = THREE.MathUtils.smoothstep(c.y, 0.55, 0.62);
      p.x *= 1 + 0.12 * flat;
      p.y *= 1 - 0.12 * flat;
      p.multiplyScalar(r).add(c);
      pos.setXYZ(idx, p.x, p.y, p.z);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

function radiusAt(y: number): number {
  for (let i = 0; i < TORSO.length - 1; i++) {
    const [r0, y0] = TORSO[i];
    const [r1, y1] = TORSO[i + 1];
    if (y >= y0 && y <= y1) return THREE.MathUtils.lerp(r0, r1, (y - y0) / (y1 - y0));
  }
  return 0;
}

// Puntos de las extremidades
const L = {
  shoulder: (s: number) => v(s * 0.185, 1.06, -0.1),
  elbow: (s: number) => v(s * 0.222, 0.82, -0.065),
  wrist: (s: number) => v(s * 0.07, 0.715, 0.14),
};

// Saludo con la mano derecha: brazo hacia el lado y adelante, antebrazo vertical que se mece.
const R_UPPER = L.elbow(-1).sub(L.shoulder(-1));
const R_FORE = L.wrist(-1).sub(L.elbow(-1));
const R_FORE_DIR = R_FORE.clone().normalize();
const WAVE_UPPER = new THREE.Quaternion().setFromUnitVectors(R_UPPER.clone().normalize(), v(-0.42, -0.36, 0.83).normalize());
const WAVE_UPPER_INV = WAVE_UPPER.clone().invert();
const IDENTITY = new THREE.Quaternion();
const tmpDir = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();

const handBasis = new THREE.Matrix4();
const handX = new THREE.Vector3();
const handY = new THREE.Vector3();
const handZ = new THREE.Vector3();
const foreWorld = new THREE.Quaternion();

/** Alinea la mano con el antebrazo y gira la palma hacia el frente (+z del mundo). */
function orientWaveHand(fore: THREE.Group, hand: THREE.Group): void {
  fore.updateWorldMatrix(true, false);
  fore.getWorldQuaternion(foreWorld);
  handY.copy(R_FORE_DIR).applyQuaternion(foreWorld);
  handZ.set(0, 0, 1).addScaledVector(handY, -handY.z).normalize();
  handX.crossVectors(handY, handZ).normalize();
  handBasis.makeBasis(handX, handY, handZ);
  hand.quaternion.setFromRotationMatrix(handBasis).premultiply(foreWorld.invert());
}

/** 0 en reposo, 1 con la mano arriba; sube y baja suave al inicio y al final del saludo. */
function waveWeight(now: number): number {
  const wave = rig.wave;
  if (!wave) return 0;
  const p = (now - wave.startedAt) / wave.duration;
  if (p >= 1) {
    rig.wave = null;
    return 0;
  }
  return THREE.MathUtils.smoothstep(p, 0, 0.16) * (1 - THREE.MathUtils.smoothstep(p, 0.84, 1));
}

export function PlaceholderAvatar({ position, reducedMotion }: { position: V3; reducedMotion: boolean }) {
  const m = useMats();
  const amp = reducedMotion ? 0.3 : 1;

  const head = useRef<THREE.Group>(null);
  const chest = useRef<THREE.Group>(null);
  const upperR = useRef<THREE.Group>(null);
  const foreR = useRef<THREE.Group>(null);
  const restHandR = useRef<THREE.Group>(null);
  const waveHandR = useRef<THREE.Group>(null);
  const eyes = useRef<(THREE.Group | null)[]>([]);
  const irises = useRef<(THREE.Group | null)[]>([]);
  const brows = useRef<(THREE.Group | null)[]>([]);
  const cheeks = useRef<(THREE.Mesh | null)[]>([]);

  const hair = useMemo(() => ({ geo: buildHairGeometry(), ...hairMaterial() }), []);
  const headGeo = useMemo(buildHeadGeometry, []);
  const mouth = useMemo(() => createMouth(), []);
  const eyeZ = useMemo(() => faceZ(EYE.x, EYE.y), []);
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
      legs: [-1, 1].map(legGeometry),
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
    // Ceja gruesa y casi recta: arranca ancha junto a la nariz y se afina hacia la cola.
    const brow = (s: number) => {
      const path = [
        [0.0135, 0.1405],
        [0.026, 0.1442],
        [0.041, 0.1478],
        [0.0525, 0.1472],
        [0.0625, 0.142],
      ];
      const curve = new THREE.CatmullRomCurve3(path.map(([x, y]) => v(x, y, 0)));
      const pos: number[] = [];
      const idx: number[] = [];
      const n = 24;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const p = curve.getPoint(t);
        const half = THREE.MathUtils.lerp(0.0029, 0.0008, t ** 1.5);
        for (const d of [-half, half]) {
          const y = p.y + d;
          pos.push(s * (p.x - BROW_PIVOT.x), y - BROW_PIVOT.y, faceZ(p.x, y) + 0.0007 - BROW_PIVOT.z);
        }
        if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    };
    // Pestañas sobre el contorno almendrado; la superior más marcada y con una leve cola.
    const lash = (lower: boolean) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 12; i++) {
        const u = (i / 12) * 2 - 1;
        const arc = Math.sqrt(Math.max(0, 1 - u * u));
        const y = (lower ? -0.8 : 0.94) * EYE.h * arc * (1 + (lower ? 0 : 0.12 * u));
        pts.push(v(u * EYE.w, y + (lower ? 0 : 0.0004), 0.0068 * arc + 0.0004));
      }
      if (!lower) pts.push(v(EYE.w + 0.0028, 0.0026, 0.0003));
      return tube(pts, lower ? 0.0004 : 0.0011, 24);
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
      b.position.y = BROW_PIVOT.y + cur.browInnerUp * 0.0035 - cur.browDown * 0.003 + s.open * 0.0012;
      b.rotation.z = side * (-cur.browInnerUp * 0.22 + cur.browDown * 0.12);
    });
    cheeks.current.forEach((c) => {
      if (!c) return;
      (c.material as THREE.MeshBasicMaterial).opacity = 0.14 + cur.cheekSquint * 0.16 + cur.mouthSmile * 0.06;
      c.position.y = 0.09 + cur.cheekSquint * 0.003;
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
    // Brazo derecho: vaivén al hablar o saludo con la mano levantada
    const w = waveWeight(now);
    if (upperR.current && foreR.current) {
      upperR.current.quaternion.slerpQuaternions(IDENTITY, WAVE_UPPER, w);
      if (w === 0) upperR.current.rotation.x = now < rig.talkUntil ? Math.sin(t * 2.3) * 0.05 * amp : 0;
      const sway = Math.sin(t * Math.PI * 2 * 1.4) * 0.3 * w;
      tmpDir.set(0.08 + sway, 1, 0.08).normalize().applyQuaternion(WAVE_UPPER_INV);
      tmpQuat.setFromUnitVectors(R_FORE_DIR, tmpDir);
      foreR.current.quaternion.slerpQuaternions(IDENTITY, tmpQuat, w);
      const raised = w > 0.35;
      if (restHandR.current) restHandR.current.visible = !raised;
      if (waveHandR.current) {
        waveHandR.current.visible = raised;
        if (raised) orientWaveHand(foreR.current, waveHandR.current);
      }
    }
    hair.uniforms.uTime.value = t;
    hair.uniforms.uAmp.value = amp;
  });

  const upperArm = (s: number) => <Limb a={L.shoulder(s)} b={L.elbow(s)} r={0.053} mat={m.shirt} />;

  const forearm = (s: number) => {
    const el = L.elbow(s);
    const wr = L.wrist(s);
    const cuff = wr.clone().lerp(el, 0.12);
    return (
      <>
        <Limb a={el} b={cuff} r={0.048} mat={m.shirt} />
        <Limb a={cuff} b={wr} r={0.026} mat={m.skin} />
        <group ref={s < 0 ? restHandR : undefined}>
          <Ellipsoid
            pos={[wr.x - s * 0.02, wr.y - 0.004, wr.z + 0.045]}
            scale={[0.032, 0.016, 0.05]}
            rot={[0.1, s * 0.6, 0]}
            mat={m.skin}
          />
          <Ellipsoid pos={[wr.x + s * 0.004, wr.y + 0.006, wr.z + 0.035]} scale={[0.01, 0.009, 0.026]} rot={[0, s * -0.4, 0]} mat={m.skin} />
        </group>
      </>
    );
  };

  return (
    <group position={position}>
      {/* Piernas en jean, sentada */}
      {[-1, 1].map((s, i) => (
        <group key={s}>
          <mesh geometry={body.legs[i]} material={m.jeans} castShadow receiveShadow />
          <Limb a={v(s * 0.1, 0.11, 0.455)} b={v(s * 0.1, 0.055, 0.46)} r={0.03} mat={m.skin} />
          <Ellipsoid pos={[s * 0.103, 0.032, 0.5]} scale={[0.04, 0.032, 0.1]} rot={[0, s * -0.08, 0]} mat={m.shoes} />
          <Ellipsoid pos={[s * 0.1, 0.05, 0.47]} scale={[0.036, 0.028, 0.06]} mat={m.skin} />
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

      {/* Brazos: el derecho acompaña el habla y saluda */}
      <group>
        {upperArm(1)}
        {forearm(1)}
      </group>
      <group ref={upperR} position={L.shoulder(-1).toArray()}>
        <group position={L.shoulder(-1).negate().toArray()}>{upperArm(-1)}</group>
        <group ref={foreR} position={R_UPPER.toArray()}>
          <group position={L.elbow(-1).negate().toArray()}>{forearm(-1)}</group>
          {/* Mano abierta del saludo: palma al frente, dedos juntos y pulgar hacia el centro */}
          <group ref={waveHandR} position={R_FORE.toArray()} visible={false}>
            <Ellipsoid pos={[0, 0.045, 0]} scale={[0.036, 0.048, 0.014]} mat={m.skin} />
            {[-0.022, -0.0075, 0.0075, 0.022].map((x, i) => (
              <Limb
                key={x}
                a={v(x, 0.085, 0)}
                b={v(x * 1.25, 0.085 + [0.04, 0.05, 0.048, 0.04][i], 0.004)}
                r={0.0078}
                mat={m.skin}
              />
            ))}
            <Limb a={v(0.03, 0.03, 0.004)} b={v(0.055, 0.07, 0.012)} r={0.0095} mat={m.skin} />
          </group>
        </group>
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

        {/* La nariz, los pómulos y el mentón están esculpidos en la malla de la cabeza */}

        {/* Ojos café avellana, almendrados, con sombra cálida en el párpado */}
        {[-1, 1].map((s, i) => (
          <group key={s} position={[s * EYE.x, EYE.y, eyeZ - 0.0021]}>
            <mesh position={[s * 0.002, 0.0095, 0.0068]} scale={[0.026, 0.0115, 1]} rotation-y={s * 0.35} material={m.shadow}>
              <circleGeometry args={[1, 24]} />
            </mesh>
            <group ref={(g) => (eyes.current[i] = g)} rotation-z={s * 0.035}>
              <mesh scale={[EYE.w, EYE.h, 0.0068]} material={m.sclera} renderOrder={1}>
                <sphereGeometry args={[1, 28, 18]} />
              </mesh>
              <group ref={(g) => (irises.current[i] = g)}>
                <mesh position={[0, 0.0006, 0.0071]} material={m.iris} renderOrder={2}>
                  <circleGeometry args={[0.0074, 32]} />
                </mesh>
                <mesh position={[0.0022, 0.0024, 0.0073]} material={m.highlight} renderOrder={3}>
                  <circleGeometry args={[0.0011, 12]} />
                </mesh>
              </group>
              <mesh geometry={face.lashUp} material={m.lash} scale={[s, 1, 1]} />
              <mesh geometry={face.lashLow} material={m.lash} />
            </group>
          </group>
        ))}

        {/* Cejas castañas definidas */}
        <group ref={(g) => (brows.current[0] = g)} position={BROW_PIVOT.toArray()}>
          <mesh geometry={face.browL} material={m.brow} />
        </group>
        <group ref={(g) => (brows.current[1] = g)} position={[-BROW_PIVOT.x, BROW_PIVOT.y, BROW_PIVOT.z]}>
          <mesh geometry={face.browR} material={m.brow} />
        </group>

        {/* Rubor */}
        {[-1, 1].map((s, i) => (
          <mesh
            key={s}
            ref={(c) => (cheeks.current[i] = c)}
            position={[s * 0.05, 0.09, faceZ(0.05, 0.09) + 0.0012]}
            rotation-y={s * 0.55}
            material={m.blush}
          >
            <circleGeometry args={[0.024, 20]} />
          </mesh>
        ))}

        {/* Boca */}
        <group position={[0, 0.0545, faceZ(0, 0.0545) + 0.0006]}>
          <mesh geometry={mouth.upper} material={m.lips} />
          <mesh geometry={mouth.lower} material={m.lips} />
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
          <meshPhysicalMaterial color="#35211a" roughness={0.6} sheen={0.35} sheenColor="#b07a4a" />
        </mesh>
        <mesh geometry={hair.geo} material={hair.material} castShadow />
        {/* Volumen interior para que no se vea a través */}
        <Ellipsoid pos={[0, -0.12, -0.115]} scale={[0.17, 0.28, 0.05]} mat={m.hairFill} seg={16} />
      </group>
    </group>
  );
}
