import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { clockFace, painting, softDot } from './textures';
import { compose, mergeColored, rng, type Part } from './geometry';

const OAK = '#a9764a';
const OAK_DARK = '#7a5232';
const LINEN = '#efe7da';

type V3 = [number, number, number];

function Soft({
  size,
  pos,
  color,
  radius = 0.04,
  rot,
  sheen = false,
}: {
  size: V3;
  pos: V3;
  color: string;
  radius?: number;
  rot?: V3;
  sheen?: boolean;
}) {
  return (
    <RoundedBox args={size} radius={radius} smoothness={3} position={pos} rotation={rot} castShadow receiveShadow>
      {sheen ? (
        <meshPhysicalMaterial color={color} roughness={0.85} sheen={1} sheenRoughness={0.5} sheenColor="#ffffff" />
      ) : (
        <meshStandardMaterial color={color} roughness={0.85} />
      )}
    </RoundedBox>
  );
}

function Leg({ pos, h, r = 0.022, color = OAK_DARK, tilt = [0, 0, 0] as V3 }: { pos: V3; h: number; r?: number; color?: string; tilt?: V3 }) {
  return (
    <mesh position={pos} rotation={tilt} castShadow>
      <cylinderGeometry args={[r, r * 0.7, h, 10]} />
      <meshStandardMaterial color={color} roughness={0.55} />
    </mesh>
  );
}

export function Armchair({ color, pos, rotY = 0 }: { color: string; pos: V3; rotY?: number }) {
  return (
    <group position={pos} rotation-y={rotY}>
      <Soft size={[0.8, 0.18, 0.66]} pos={[0, 0.38, 0]} color={color} sheen />
      <Soft size={[0.6, 0.12, 0.58]} pos={[0, 0.52, 0.03]} color={color} radius={0.05} sheen />
      <Soft size={[0.8, 0.66, 0.17]} pos={[0, 0.78, -0.27]} rot={[-0.1, 0, 0]} color={color} radius={0.07} sheen />
      {[-1, 1].map((s) => (
        <Soft key={s} size={[0.13, 0.3, 0.66]} pos={[s * 0.36, 0.6, 0]} color={color} radius={0.06} sheen />
      ))}
      {[
        [-0.33, -0.26],
        [0.33, -0.26],
        [-0.33, 0.26],
        [0.33, 0.26],
      ].map(([x, z], i) => (
        <Leg key={i} pos={[x, 0.15, z]} h={0.3} tilt={[z > 0 ? 0.12 : -0.12, 0, x > 0 ? -0.12 : 0.12]} />
      ))}
    </group>
  );
}

function Sofa({ pos, rotY }: { pos: V3; rotY: number }) {
  const body = '#e6dccd';
  return (
    <group position={pos} rotation-y={rotY}>
      <Soft size={[2.3, 0.24, 0.92]} pos={[0, 0.26, 0]} color={body} />
      {[-0.7, 0, 0.7].map((x) => (
        <Soft key={x} size={[0.69, 0.15, 0.74]} pos={[x, 0.45, 0.06]} color={body} radius={0.06} sheen />
      ))}
      {[-0.7, 0, 0.7].map((x) => (
        <Soft key={x} size={[0.68, 0.46, 0.2]} pos={[x, 0.74, -0.32]} rot={[-0.12, 0, 0]} color={body} radius={0.08} sheen />
      ))}
      {[-1, 1].map((s) => (
        <Soft key={s} size={[0.2, 0.52, 0.92]} pos={[s * 1.05, 0.42, 0]} color={body} radius={0.08} />
      ))}
      <Soft size={[0.4, 0.38, 0.12]} pos={[-0.72, 0.72, -0.16]} rot={[-0.2, 0.25, 0.05]} color="#93a78d" radius={0.06} sheen />
      <Soft size={[0.36, 0.34, 0.12]} pos={[0.78, 0.71, -0.16]} rot={[-0.2, -0.2, -0.06]} color="#c47b5a" radius={0.06} sheen />
      <Soft size={[0.32, 0.3, 0.11]} pos={[0.5, 0.68, -0.08]} rot={[-0.25, 0.1, 0.1]} color="#d9b77e" radius={0.05} sheen />
      {/* Cobija doblada sobre el brazo */}
      <Soft size={[0.26, 0.06, 0.94]} pos={[1.05, 0.71, 0]} color="#c9a77f" radius={0.03} />
      <Soft size={[0.06, 0.34, 0.94]} pos={[0.93, 0.55, 0]} color="#c9a77f" radius={0.03} />
      {[-1.05, 1.05].flatMap((x) => [-0.38, 0.38].map((z) => <Leg key={`${x}${z}`} pos={[x, 0.07, z]} h={0.14} r={0.025} />))}
    </group>
  );
}

/** Plato con papaya picada en cubos y un tenedor. */
function PapayaPlate({ pos }: { pos: V3 }) {
  const pieces = useMemo(() => {
    const r = rng(31);
    const out: { pos: V3; rot: V3; size: V3; color: string }[] = [];
    const tones = ['#f07f35', '#f39243', '#ec7230', '#f5a052'];
    for (let i = 0; i < 16; i++) {
      const layer = i < 11 ? 0 : 1;
      const a = r() * Math.PI * 2;
      const d = layer ? r() * 0.022 : 0.012 + r() * 0.038;
      const s = 0.019 + r() * 0.007;
      out.push({
        pos: [Math.cos(a) * d, 0.022 + layer * 0.018 + r() * 0.003, Math.sin(a) * d],
        rot: [(r() - 0.5) * 0.5, r() * Math.PI, (r() - 0.5) * 0.5],
        size: [s, s * (0.85 + r() * 0.2), s * (0.9 + r() * 0.3)],
        color: tones[Math.floor(r() * tones.length)],
      });
    }
    return out;
  }, []);
  return (
    <group position={pos}>
      <mesh position={[0, 0.006, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.078, 0.055, 0.012, 32]} />
        <meshPhysicalMaterial color="#f7f3ec" roughness={0.25} clearcoat={0.6} />
      </mesh>
      <mesh position={[0, 0.0115, 0]} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[0.072, 0.004, 8, 40]} />
        <meshPhysicalMaterial color="#f7f3ec" roughness={0.25} clearcoat={0.6} />
      </mesh>
      {pieces.map((p, i) => (
        <mesh key={i} position={p.pos} rotation={p.rot} castShadow>
          <boxGeometry args={p.size} />
          <meshPhysicalMaterial color={p.color} roughness={0.35} clearcoat={0.5} clearcoatRoughness={0.3} />
        </mesh>
      ))}
      {/* Tenedor apoyado en el borde */}
      <group position={[0.035, 0.022, 0.035]} rotation={[0, -0.8, 0.08]}>
        <mesh position={[0.05, 0, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.0028, 0.0035, 0.09, 8]} />
          <meshStandardMaterial color="#c9ccd0" metalness={0.9} roughness={0.25} />
        </mesh>
        {[-1, 0, 1].map((k) => (
          <mesh key={k} position={[-0.012, 0, k * 0.0045]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.0011, 0.0011, 0.028, 5]} />
            <meshStandardMaterial color="#c9ccd0" metalness={0.9} roughness={0.25} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function SideTable({ pos }: { pos: V3 }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.56, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.035, 40]} />
        <meshStandardMaterial color={OAK} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.05, 0.54, 12]} />
        <meshStandardMaterial color={OAK_DARK} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.015, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.16, 0.18, 0.03, 30]} />
        <meshStandardMaterial color={OAK_DARK} roughness={0.5} />
      </mesh>
      {/* Taza humeante */}
      <group position={[-0.08, 0.578, 0.08]}>
        <mesh position={[0, 0.045, 0]} castShadow>
          <cylinderGeometry args={[0.042, 0.034, 0.09, 24, 1, true]} />
          <meshStandardMaterial color="#f3efe8" roughness={0.3} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.078, 0]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.038, 24]} />
          <meshStandardMaterial color="#9a6b3e" roughness={0.2} />
        </mesh>
        <mesh position={[0.05, 0.048, 0]} rotation-y={Math.PI / 2}>
          <torusGeometry args={[0.022, 0.006, 8, 16, Math.PI * 1.4]} />
          <meshStandardMaterial color="#f3efe8" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.002, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.006, 24]} />
          <meshStandardMaterial color="#e8ddd0" roughness={0.4} />
        </mesh>
        <Steam />
      </group>
      <PapayaPlate pos={[-0.11, 0.578, -0.11]} />
      {/* Caja de pañuelos */}
      <group position={[0.09, 0.578, -0.06]} rotation-y={0.5}>
        <mesh position={[0, 0.05, 0]} castShadow>
          <boxGeometry args={[0.2, 0.1, 0.11]} />
          <meshStandardMaterial color="#b7c7b0" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.115, 0]} rotation={[0.2, 0, 0.1]}>
          <planeGeometry args={[0.07, 0.06]} />
          <meshStandardMaterial color="#ffffff" roughness={1} side={THREE.DoubleSide} />
        </mesh>
      </group>
      {/* Libreta y lápiz */}
      <group position={[0.06, 0.579, 0.12]} rotation-y={-0.35}>
        <mesh position={[0, 0.008, 0]} castShadow>
          <boxGeometry args={[0.15, 0.016, 0.2]} />
          <meshStandardMaterial color="#c47b5a" roughness={0.7} />
        </mesh>
        <mesh position={[0.02, 0.022, 0]} rotation={[0, 0.4, Math.PI / 2]}>
          <cylinderGeometry args={[0.0045, 0.0045, 0.16, 6]} />
          <meshStandardMaterial color="#e2b34a" roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

function Steam() {
  const dot = useMemo(softDot, []);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const p = (t * 0.32 + i / 4) % 1;
      m.position.set(Math.sin(t * 1.4 + i * 2) * 0.012 * (1 + p * 2), 0.09 + p * 0.26, 0);
      m.scale.setScalar(0.04 + p * 0.09);
      (m.material as THREE.MeshBasicMaterial).opacity = Math.sin(p * Math.PI) * 0.22;
    });
  });
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <Billboard key={i}>
          <mesh ref={(m) => (refs.current[i] = m)}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial map={dot} transparent depthWrite={false} color="#ffffff" />
          </mesh>
        </Billboard>
      ))}
    </>
  );
}

export function FloorLamp({ pos, on }: { pos: V3; on: boolean }) {
  return (
    <group position={pos}>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return <Leg key={i} pos={[Math.cos(a) * 0.12, 0.72, Math.sin(a) * 0.12]} h={1.46} r={0.014} tilt={[Math.sin(a) * 0.16, 0, -Math.cos(a) * 0.16]} />;
      })}
      <mesh position={[0, 1.58, 0]}>
        <cylinderGeometry args={[0.19, 0.24, 0.32, 40, 1, true]} />
        <meshStandardMaterial
          color={LINEN}
          emissive="#ffb764"
          emissiveIntensity={on ? 1.4 : 0}
          roughness={0.9}
          side={THREE.DoubleSide}
          transparent
          opacity={0.96}
        />
      </mesh>
      <mesh position={[0, 1.52, 0]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshBasicMaterial color={on ? '#fff1d0' : '#d8d2c4'} />
      </mesh>
    </group>
  );
}

function Leaves({ seed, kind }: { seed: number; kind: 'ficus' | 'sansevieria' | 'pothos' | 'suculenta' }) {
  const geo = useMemo(() => {
    const r = rng(seed);
    const parts: Part[] = [];
    const greens = ['#4f7a45', '#5f8c4f', '#3f6a3b', '#6d9a58'];
    const leaf = new THREE.SphereGeometry(1, 10, 6);
    if (kind === 'ficus') {
      const trunk = new THREE.CylinderGeometry(0.02, 0.03, 1.2, 8);
      parts.push({ geo: trunk, color: '#6b4c32', matrix: compose([0, 0.6, 0]) });
      for (let i = 0; i < 46; i++) {
        const y = 0.75 + r() * 0.95;
        const a = r() * Math.PI * 2;
        const rad = 0.08 + r() * 0.26 * (1 - (y - 0.75) / 1.3);
        parts.push({
          geo: leaf,
          color: greens[i % greens.length],
          matrix: compose([Math.cos(a) * rad, y, Math.sin(a) * rad], [r() * 0.9 - 0.2, -a, 0.5 + r() * 0.6], [0.075, 0.012, 0.12]),
        });
      }
    } else if (kind === 'sansevieria') {
      const blade = new THREE.ConeGeometry(0.035, 1, 4);
      for (let i = 0; i < 16; i++) {
        const a = r() * Math.PI * 2;
        const h = 0.6 + r() * 0.6;
        parts.push({
          geo: blade,
          color: i % 3 ? '#3d6b3f' : '#7f9e4a',
          matrix: compose([Math.cos(a) * 0.06, h / 2, Math.sin(a) * 0.06], [Math.sin(a) * 0.15, a, Math.cos(a) * 0.15], [1, h, 0.25]),
        });
      }
    } else if (kind === 'pothos') {
      for (let v = 0; v < 5; v++) {
        const a = (v / 5) * Math.PI * 2 + r();
        const len = 6 + Math.floor(r() * 8);
        for (let i = 0; i < len; i++) {
          const d = 0.06 + i * 0.03;
          parts.push({
            geo: leaf,
            color: greens[(i + v) % greens.length],
            matrix: compose([Math.cos(a) * d, -i * 0.07, Math.sin(a) * d + 0.05], [r(), r() * 3, 1.2], [0.035, 0.008, 0.045]),
          });
        }
      }
    } else {
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        parts.push({
          geo: leaf,
          color: '#8aa877',
          matrix: compose([Math.cos(a) * 0.03, 0.03, Math.sin(a) * 0.03], [0, -a, 0.9], [0.03, 0.012, 0.05]),
        });
      }
    }
    return mergeColored(parts);
  }, [seed, kind]);
  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.7} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Plant({ pos, kind, pot = '#e9e1d4', size = 1, seed = 1 }: { pos: V3; kind: 'ficus' | 'sansevieria' | 'pothos' | 'suculenta'; pot?: string; size?: number; seed?: number }) {
  const potH = kind === 'suculenta' ? 0.07 : kind === 'pothos' ? 0.14 : 0.36;
  const potR = kind === 'suculenta' ? 0.05 : kind === 'pothos' ? 0.09 : 0.2;
  return (
    <group position={pos} scale={size}>
      <mesh position={[0, potH / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[potR, potR * 0.78, potH, 28]} />
        <meshStandardMaterial color={pot} roughness={0.6} />
      </mesh>
      <mesh position={[0, potH - 0.01, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[potR * 0.92, 20]} />
        <meshStandardMaterial color="#4a3627" roughness={1} />
      </mesh>
      <group position={[0, kind === 'pothos' ? potH : potH - 0.02, 0]}>
        <Leaves seed={seed} kind={kind} />
      </group>
    </group>
  );
}

function Bookcase({ pos }: { pos: V3 }) {
  const W = 1.5;
  const H = 2.15;
  const D = 0.36;
  const shelves = [0.08, 0.5, 0.92, 1.34, 1.76];
  const books = useMemo(() => {
    const r = rng(42);
    const cols = ['#8fa48a', '#c47b5a', '#e6d5b8', '#6d7f99', '#d9b77e', '#a85d4a', '#f1ebe0', '#55684f', '#b89a7a'];
    const parts: Part[] = [];
    shelves.slice(0, 4).forEach((y, si) => {
      let x = -W / 2 + 0.06;
      const end = si === 1 ? 0.15 : W / 2 - 0.06;
      while (x < end) {
        const w = 0.025 + r() * 0.035;
        const h = 0.24 + r() * 0.12;
        const lean = r() > 0.92 ? 0.18 : 0;
        parts.push({
          geo: new THREE.BoxGeometry(w, h, 0.2 + r() * 0.06),
          color: cols[Math.floor(r() * cols.length)],
          matrix: compose([x + w / 2, y + 0.02 + h / 2, 0.02], [0, 0, lean]),
        });
        x += w + 0.004 + (lean ? 0.04 : 0);
        if (r() > 0.93) x += 0.12;
      }
    });
    return mergeColored(parts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <group position={pos}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * W) / 2, H / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.04, H, D]} />
          <meshStandardMaterial color={OAK} roughness={0.6} />
        </mesh>
      ))}
      {[...shelves, H - 0.02].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow receiveShadow>
          <boxGeometry args={[W, 0.035, D]} />
          <meshStandardMaterial color={OAK} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, H / 2, -D / 2 + 0.01]} receiveShadow>
        <boxGeometry args={[W, H, 0.02]} />
        <meshStandardMaterial color="#d9c6ab" roughness={0.9} />
      </mesh>
      <mesh geometry={books} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.75} />
      </mesh>
      {/* Objetos decorativos */}
      <mesh position={[0.45, 0.62, 0.02]} castShadow>
        <sphereGeometry args={[0.08, 20, 16]} />
        <meshStandardMaterial color="#c47b5a" roughness={0.5} />
      </mesh>
      <mesh position={[0.3, 1.82, 0.02]} castShadow>
        <cylinderGeometry args={[0.04, 0.06, 0.2, 16]} />
        <meshStandardMaterial color="#f1ebe0" roughness={0.4} />
      </mesh>
      <Plant pos={[-0.45, 1.795, 0.05]} kind="pothos" pot="#c47b5a" seed={9} />
      <Plant pos={[0.5, 2.14, 0]} kind="pothos" pot="#e9e1d4" seed={4} />
    </group>
  );
}

function Painting({ pos, rotY = 0, w = 1.15, h = 0.78 }: { pos: V3; rotY?: number; w?: number; h?: number }) {
  const tex = useMemo(painting, []);
  return (
    <group position={pos} rotation-y={rotY}>
      <mesh castShadow>
        <boxGeometry args={[w + 0.08, h + 0.08, 0.04]} />
        <meshStandardMaterial color={OAK} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.021]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={tex} roughness={0.9} />
      </mesh>
    </group>
  );
}

function WallClock({ pos }: { pos: V3 }) {
  const face = useMemo(clockFace, []);
  const h = useRef<THREE.Group>(null);
  const m = useRef<THREE.Group>(null);
  const s = useRef<THREE.Group>(null);
  useFrame(() => {
    const d = new Date();
    const sec = d.getSeconds() + d.getMilliseconds() / 1000;
    const min = d.getMinutes() + sec / 60;
    const hr = (d.getHours() % 12) + min / 60;
    if (s.current) s.current.rotation.z = -(sec / 60) * Math.PI * 2;
    if (m.current) m.current.rotation.z = -(min / 60) * Math.PI * 2;
    if (h.current) h.current.rotation.z = -(hr / 12) * Math.PI * 2;
  });
  const hand = (len: number, w: number, color: string) => (
    <mesh position={[0, len / 2 - 0.02, 0]}>
      <boxGeometry args={[w, len, 0.004]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
  return (
    <group position={pos}>
      <mesh rotation-x={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.23, 0.23, 0.04, 48]} />
        <meshStandardMaterial color={OAK} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.021]}>
        <circleGeometry args={[0.205, 48]} />
        <meshStandardMaterial map={face} roughness={0.8} />
      </mesh>
      <group position={[0, 0, 0.026]}>
        <group ref={h}>{hand(0.11, 0.012, '#2f2f2a')}</group>
        <group ref={m} position-z={0.003}>{hand(0.16, 0.008, '#2f2f2a')}</group>
        <group ref={s} position-z={0.006}>{hand(0.17, 0.003, '#c0563b')}</group>
        <mesh position-z={0.008}>
          <circleGeometry args={[0.01, 12]} />
          <meshStandardMaterial color="#2f2f2a" />
        </mesh>
      </group>
    </group>
  );
}

function CoffeeTable({ pos, night }: { pos: V3; night: boolean }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.4, 0]} scale={[0.65, 1, 1]} castShadow receiveShadow>
        <cylinderGeometry args={[0.55, 0.55, 0.04, 48]} />
        <meshStandardMaterial color={OAK} roughness={0.45} />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return <Leg key={i} pos={[Math.cos(a) * 0.26, 0.19, Math.sin(a) * 0.4]} h={0.38} r={0.02} />;
      })}
      {/* Libros apilados */}
      <Soft size={[0.22, 0.03, 0.3]} pos={[0.05, 0.437, -0.18]} color="#6d7f99" radius={0.005} />
      <Soft size={[0.2, 0.03, 0.27]} pos={[0.05, 0.467, -0.17]} rot={[0, 0.2, 0]} color="#e6d5b8" radius={0.005} />
      {/* Florero con pampas */}
      <group position={[-0.05, 0.42, 0.18]}>
        <mesh position={[0, 0.1, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.07, 0.2, 20]} />
          <meshStandardMaterial color="#f1ebe0" roughness={0.4} />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <group key={i} rotation={[Math.sin(i * 2) * 0.35, i, Math.cos(i * 1.7) * 0.35]}>
            <mesh position={[0, 0.4, 0]}>
              <cylinderGeometry args={[0.003, 0.003, 0.4, 4]} />
              <meshStandardMaterial color="#cdb48c" />
            </mesh>
            <mesh position={[0, 0.62, 0]} castShadow>
              <coneGeometry args={[0.035, 0.2, 8]} />
              <meshStandardMaterial color="#eadcc2" roughness={1} />
            </mesh>
          </group>
        ))}
      </group>
      {/* Vela */}
      <group position={[0.14, 0.42, 0.06]}>
        <mesh position={[0, 0.04, 0]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 0.08, 20]} />
          <meshStandardMaterial color="#f6efe2" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.1, 0]} visible={night}>
          <sphereGeometry args={[0.009, 8, 8]} />
          <meshBasicMaterial color="#ffcf7a" />
        </mesh>
        {night && <pointLight position={[0, 0.14, 0]} color="#ffb35a" intensity={0.5} distance={2.2} decay={2} />}
      </group>
    </group>
  );
}

function Desk({ pos, lampOn }: { pos: V3; lampOn: boolean }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.3, 0.035, 0.6]} />
        <meshStandardMaterial color={OAK} roughness={0.5} />
      </mesh>
      <mesh position={[0.4, 0.66, 0]} castShadow>
        <boxGeometry args={[0.45, 0.14, 0.55]} />
        <meshStandardMaterial color={LINEN} roughness={0.6} />
      </mesh>
      {[-0.6, 0.6].flatMap((x) => [-0.25, 0.25].map((z) => <Leg key={`${x}${z}`} pos={[x, 0.37, z]} h={0.74} r={0.018} />))}
      {/* Portátil cerrado */}
      <Soft size={[0.34, 0.02, 0.24]} pos={[-0.1, 0.78, 0.05]} rot={[0, 0.15, 0]} color="#c9cbcc" radius={0.008} />
      {/* Portalápices */}
      <mesh position={[0.42, 0.82, -0.12]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.1, 16]} />
        <meshStandardMaterial color="#93a78d" roughness={0.6} />
      </mesh>
      {/* Lámpara de escritorio */}
      <group position={[-0.48, 0.77, -0.16]}>
        <mesh position={[0, 0.01, 0]}>
          <cylinderGeometry args={[0.07, 0.08, 0.02, 20]} />
          <meshStandardMaterial color="#2f2f2a" roughness={0.4} />
        </mesh>
        <mesh position={[0.05, 0.2, 0]} rotation-z={-0.3}>
          <cylinderGeometry args={[0.008, 0.008, 0.4, 8]} />
          <meshStandardMaterial color="#2f2f2a" />
        </mesh>
        <mesh position={[0.13, 0.38, 0.02]} rotation-z={0.9}>
          <coneGeometry args={[0.08, 0.13, 20, 1, true]} />
          <meshStandardMaterial color="#e3b35a" emissive="#ffcc80" emissiveIntensity={lampOn ? 0.6 : 0} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <Plant pos={[0.2, 0.77, -0.15]} kind="suculenta" pot="#c47b5a" seed={3} size={1.3} />
      {/* Silla */}
      <group position={[-0.05, 0, 0.5]} rotation-y={Math.PI + 0.3}>
        <Soft size={[0.44, 0.05, 0.42]} pos={[0, 0.46, 0]} color={OAK} radius={0.015} />
        <Soft size={[0.42, 0.28, 0.04]} pos={[0, 0.72, -0.2]} rot={[-0.1, 0, 0]} color={OAK} radius={0.015} />
        <Soft size={[0.38, 0.05, 0.36]} pos={[0, 0.5, 0.01]} color={LINEN} radius={0.02} />
        {[-0.18, 0.18].flatMap((x) => [-0.18, 0.18].map((z) => <Leg key={`${x}${z}`} pos={[x, 0.23, z]} h={0.46} r={0.016} />))}
      </group>
    </group>
  );
}

function WallShelves({ pos }: { pos: V3 }) {
  return (
    <group position={pos}>
      {[0, 0.42].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.1, 0.03, 0.22]} />
          <meshStandardMaterial color={OAK} roughness={0.5} />
        </mesh>
      ))}
      <Plant pos={[-0.38, 0.015, 0]} kind="pothos" pot="#f1ebe0" seed={12} />
      <Soft size={[0.18, 0.24, 0.16]} pos={[0.05, 0.135, 0]} color="#6d7f99" radius={0.005} />
      <Soft size={[0.05, 0.22, 0.16]} pos={[0.17, 0.125, 0]} color="#c47b5a" radius={0.005} />
      <mesh position={[0.38, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.09, 16]} />
        <meshStandardMaterial color="#e6d5b8" roughness={0.5} />
      </mesh>
      <mesh position={[-0.2, 0.5, 0]} castShadow>
        <sphereGeometry args={[0.06, 16, 12]} />
        <meshStandardMaterial color="#93a78d" roughness={0.5} />
      </mesh>
      <Plant pos={[0.3, 0.435, 0]} kind="suculenta" pot="#c47b5a" seed={8} />
    </group>
  );
}

function Pendant({ pos, on }: { pos: V3; on: boolean }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.5, 4]} />
        <meshStandardMaterial color="#3a3a34" />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[0.24, 1]} />
        <meshStandardMaterial color="#c99a6b" wireframe />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshBasicMaterial color={on ? '#ffe3b0' : '#e7dfcf'} />
      </mesh>
    </group>
  );
}

export function Props({ night }: { night: boolean }) {
  return (
    <group>
      {/* Zona de conversación */}
      <Armchair color="#b8694a" pos={[0, 0, -1.8]} />
      <SideTable pos={[0.82, 0, -1.62]} />
      <FloorLamp pos={[-0.95, 0, -2.32]} on={night} />
      <Armchair color="#8fa38a" pos={[0.15, 0, 1.6]} rotY={Math.PI} />
      <mesh position={[1.4, 0.19, -0.35]} castShadow receiveShadow>
        <cylinderGeometry args={[0.27, 0.28, 0.38, 32]} />
        <meshPhysicalMaterial color="#d9b77e" roughness={0.95} sheen={1} sheenColor="#fff4dc" />
      </mesh>

      {/* Pared de fondo */}
      <Bookcase pos={[-2.05, 0, -3.8]} />
      <Painting pos={[0.05, 2.02, -3.97]} />
      <WallClock pos={[1.45, 2.3, -3.97]} />
      <Desk pos={[3.3, 0, -3.6]} lampOn={night} />
      <WallShelves pos={[3.3, 1.55, -3.88]} />
      <Plant pos={[5.25, 0, -3.45]} kind="sansevieria" pot="#2f2f2a" seed={5} size={1.15} />

      {/* Rincón de lectura junto a la pared derecha */}
      <Sofa pos={[5.3, 0, 0.25]} rotY={-Math.PI / 2} />
      <CoffeeTable pos={[4.2, 0, 0.25]} night={night} />
      <Painting pos={[5.77, 1.8, 0.25]} rotY={-Math.PI / 2} w={0.9} h={0.62} />

      {/* Junto a la ventana */}
      <Plant pos={[-2.7, 0, -0.25]} kind="ficus" pot="#e9e1d4" seed={2} />
      <Plant pos={[-3.06, 0.85, -1.65]} kind="suculenta" pot="#c47b5a" seed={7} size={1.4} />
      <Plant pos={[-3.06, 0.85, -2.6]} kind="suculenta" pot="#f1ebe0" seed={6} size={1.2} />

      <Pendant pos={[0, 2.55, -0.7]} on={night} />
    </group>
  );
}
