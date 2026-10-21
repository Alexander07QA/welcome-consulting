import { useMemo } from 'react';
import * as THREE from 'three';
import { ROOM, WINDOW } from './DayNight';
import { plaster, roundRug, skyTexture, stripeRug, woodFloor } from './textures';
import type { TimeOfDay } from '../store/sceneStore';

const T = 0.16; // grosor de muros
const WAINSCOT = 0.95;
const SAGE = '#93a78d';
const TRIM = '#f3ede2';

interface WallBoxProps {
  pos: [number, number, number];
  size: [number, number, number];
  map?: THREE.Texture;
  color?: string;
}

function WallBox({ pos, size, map, color = '#ffffff' }: WallBoxProps) {
  return (
    <mesh position={pos} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} map={map} roughness={0.95} />
    </mesh>
  );
}

/** Muro con zócalo verde salvia, moldura y guardaescoba. Recorre el eje x o z. */
function DecoratedWall({
  axis,
  at,
  from,
  to,
  wallMap,
  inward,
}: {
  axis: 'x' | 'z';
  at: number;
  from: number;
  to: number;
  wallMap: THREE.Texture;
  inward: number;
}) {
  const len = to - from;
  const mid = (from + to) / 2;
  const H = ROOM.height;
  const place = (offset: number, y: number): [number, number, number] =>
    axis === 'x' ? [mid, y, at + offset * inward] : [at + offset * inward, y, mid];
  const sz = (w: number, h: number, d: number): [number, number, number] =>
    axis === 'x' ? [w, h, d] : [d, h, w];
  return (
    <group>
      <WallBox pos={place(-T / 2, H / 2)} size={sz(len + T * 2, H, T)} map={wallMap} />
      <WallBox pos={place(0.01, WAINSCOT / 2)} size={sz(len, WAINSCOT, 0.02)} color={SAGE} />
      <WallBox pos={place(0.03, WAINSCOT)} size={sz(len, 0.05, 0.04)} color={TRIM} />
      <WallBox pos={place(0.025, 0.06)} size={sz(len, 0.12, 0.03)} color={TRIM} />
    </group>
  );
}

export function Room({ time }: { time: TimeOfDay }) {
  const floor = useMemo(woodFloor, []);
  const wall = useMemo(() => plaster('#ecdcc6'), []);
  const wallSide = useMemo(() => plaster('#e8d5bd', 8), []);
  const rug = useMemo(roundRug, []);
  const rug2 = useMemo(stripeRug, []);
  const skyDay = useMemo(() => skyTexture(false), []);
  const skyNight = useMemo(() => skyTexture(true), []);

  const W = ROOM.maxX - ROOM.minX;
  const D = ROOM.maxZ - ROOM.minZ;
  const cx = (ROOM.minX + ROOM.maxX) / 2;
  const cz = (ROOM.minZ + ROOM.maxZ) / 2;
  const H = ROOM.height;
  const lx = ROOM.minX;
  const wz = (WINDOW.z0 + WINDOW.z1) / 2;
  const ww = WINDOW.z1 - WINDOW.z0;
  const wh = WINDOW.y1 - WINDOW.y0;

  return (
    <group>
      {/* Piso */}
      <mesh rotation-x={-Math.PI / 2} position={[cx, 0, cz]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial map={floor} roughness={0.62} metalness={0.02} />
      </mesh>
      {/* Techo */}
      <mesh position={[cx, H + T / 2, cz]} castShadow>
        <boxGeometry args={[W + T * 2, T, D + T * 2]} />
        <meshStandardMaterial color="#f4ede3" emissive="#a8927a" emissiveIntensity={time === 'noche' ? 0.12 : 0.45} roughness={1} />
      </mesh>

      {/* Pared de fondo y pared derecha */}
      <DecoratedWall axis="x" at={ROOM.minZ} from={lx} to={ROOM.maxX} wallMap={wall} inward={1} />
      <DecoratedWall axis="z" at={ROOM.maxX} from={ROOM.minZ} to={ROOM.maxZ} wallMap={wallSide} inward={-1} />
      {/* Pared frontal (detrás de la cámara) */}
      <WallBox pos={[cx, H / 2, ROOM.maxZ + T / 2]} size={[W + T * 2, H, T]} map={wallSide} />

      {/* Pared izquierda con ventana: cuatro bloques alrededor del vano */}
      <group>
        <WallBox
          pos={[lx - T / 2, H / 2, (ROOM.minZ + WINDOW.z0) / 2]}
          size={[T, H, WINDOW.z0 - ROOM.minZ]}
          map={wallSide}
        />
        <WallBox
          pos={[lx - T / 2, H / 2, (WINDOW.z1 + ROOM.maxZ) / 2]}
          size={[T, H, ROOM.maxZ - WINDOW.z1]}
          map={wallSide}
        />
        <WallBox pos={[lx - T / 2, WINDOW.y0 / 2, wz]} size={[T, WINDOW.y0, ww]} map={wallSide} />
        <WallBox
          pos={[lx - T / 2, (WINDOW.y1 + H) / 2, wz]}
          size={[T, H - WINDOW.y1, ww]}
          map={wallSide}
        />
        {/* Zócalo de la pared izquierda (dos tramos) */}
        <WallBox
          pos={[lx + 0.01, WAINSCOT / 2, (ROOM.minZ + WINDOW.z0) / 2]}
          size={[0.02, WAINSCOT, WINDOW.z0 - ROOM.minZ]}
          color={SAGE}
        />
        <WallBox
          pos={[lx + 0.01, WAINSCOT / 2, (WINDOW.z1 + ROOM.maxZ) / 2]}
          size={[0.02, WAINSCOT, ROOM.maxZ - WINDOW.z1]}
          color={SAGE}
        />
        <WallBox pos={[lx + 0.01, WINDOW.y0 / 2, wz]} size={[0.02, WINDOW.y0, ww]} color={SAGE} />
        <WallBox pos={[lx + 0.025, 0.06, cz]} size={[0.03, 0.12, D]} color={TRIM} />
      </group>

      {/* Ventana: marco, travesaños, alféizar y vidrio */}
      <group position={[lx, 0, wz]}>
        {[
          [0, WINDOW.y1, ww + 0.12, 0.08],
          [0, WINDOW.y0, ww + 0.12, 0.08],
        ].map(([z, y, w, h], i) => (
          <mesh key={i} position={[0, y, z]} castShadow>
            <boxGeometry args={[0.2, h, w]} />
            <meshStandardMaterial color={TRIM} roughness={0.6} />
          </mesh>
        ))}
        {[-ww / 2, 0, ww / 2].map((z, i) => (
          <mesh key={i} position={[0, (WINDOW.y0 + WINDOW.y1) / 2, z]} castShadow>
            <boxGeometry args={[0.18, wh, i === 1 ? 0.045 : 0.07]} />
            <meshStandardMaterial color={TRIM} roughness={0.6} />
          </mesh>
        ))}
        <mesh position={[0, WINDOW.y0 + wh * 0.62, 0]} castShadow>
          <boxGeometry args={[0.16, 0.04, ww]} />
          <meshStandardMaterial color={TRIM} roughness={0.6} />
        </mesh>
        <mesh position={[0.12, WINDOW.y0 - 0.02, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.3, 0.04, ww + 0.3]} />
          <meshStandardMaterial color={TRIM} roughness={0.5} />
        </mesh>
        <mesh position={[-0.05, (WINDOW.y0 + WINDOW.y1) / 2, 0]} rotation-y={Math.PI / 2}>
          <planeGeometry args={[ww, wh]} />
          <meshPhysicalMaterial
            color="#ffffff"
            transparent
            opacity={0.08}
            roughness={0.05}
            metalness={0}
            depthWrite={false}
          />
        </mesh>
      </group>
      {/* Paisaje exterior */}
      <mesh position={[lx - 2.2, 1.6, wz + 0.4]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[9, 6.5]} />
        <meshBasicMaterial map={time === 'noche' ? skyNight : skyDay} toneMapped={false} />
      </mesh>

      {/* Tapetes */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.006, -0.75]} receiveShadow>
        <circleGeometry args={[1.85, 96]} />
        <meshStandardMaterial map={rug} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[4.35, 0.006, 0.2]} receiveShadow>
        <planeGeometry args={[2.0, 2.8]} />
        <meshStandardMaterial map={rug2} roughness={1} />
      </mesh>
    </group>
  );
}
