import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { Room } from './Room';
import { Props } from './Props';
import { Curtains, Lights, SunBeam } from './Lights';
import { Visitor } from './Visitor';
import { Avatar } from '../avatar/Avatar';
import { avatarController } from '../avatar/rig';
import { useSceneStore, type View } from '../store/sceneStore';

const GABI_POS: [number, number, number] = [0, 0, -1.8];

interface Shot {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
}

const SHOTS: Record<View, Shot> = {
  frente: { pos: new THREE.Vector3(0.28, 1.2, 0.55), look: new THREE.Vector3(-0.08, 0.98, -1.85), fov: 42 },
  cerca: { pos: new THREE.Vector3(0.08, 1.3, -0.72), look: new THREE.Vector3(-0.04, 1.25, -1.85), fov: 36 },
  amplia: { pos: new THREE.Vector3(4.9, 1.75, 3.5), look: new THREE.Vector3(0.4, 0.95, -1.4), fov: 56 },
};

// Pantallas verticales (celular): el ancho visible es poco, así que la amplia mira a lo largo
// del eje de los dos sillones y la cercana se aleja para que quepan la cara y la mano del saludo.
const PORTRAIT_SHOTS: Record<View, Shot> = {
  frente: { pos: new THREE.Vector3(0.12, 1.22, -0.15), look: new THREE.Vector3(0, 1.08, -1.85), fov: 46 },
  cerca: { pos: new THREE.Vector3(0.02, 1.27, -0.4), look: new THREE.Vector3(-0.1, 1.2, -1.85), fov: 44 },
  amplia: { pos: new THREE.Vector3(1.5, 1.85, 3.7), look: new THREE.Vector3(0.15, 0.75, -0.4), fov: 64 },
};

const isPortrait = (w: number, h: number): boolean => w / h < 1.15;
const shotFor = (view: View, w: number, h: number): Shot =>
  isPortrait(w, h) ? PORTRAIT_SHOTS[view] : SHOTS[view];

function CameraRig({ view, reducedMotion }: { view: View; reducedMotion: boolean }) {
  const { camera, size, pointer } = useThree();
  const look = useRef(shotFor(view, size.width, size.height).look.clone());
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    const shot = shotFor(view, size.width, size.height);
    const k = 1 - Math.exp(-dt * 2.2);
    const par = reducedMotion ? 0.3 : 1;
    tmp.copy(shot.pos);
    tmp.x += pointer.x * 0.14 * par;
    tmp.y += pointer.y * 0.06 * par;
    camera.position.lerp(tmp, k);
    look.current.lerp(shot.look, k);
    camera.lookAt(look.current);
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov += (shot.fov - cam.fov) * k;
    cam.updateProjectionMatrix();
    // Gabi sigue el puntero con la mirada
    avatarController.lookAt(pointer.x * 0.8, pointer.y * 0.6);
  });
  return null;
}

function useReducedMotion(): boolean {
  const [r, setR] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setR(mq.matches);
    const on = (e: MediaQueryListEvent) => setR(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return r;
}

export function Scene() {
  const time = useSceneStore((s) => s.time);
  const view = useSceneStore((s) => s.view);
  const reducedMotion = useReducedMotion();
  const mobile = useMemo(() => window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768, []);
  const [dpr, setDpr] = useState(Math.min(2, window.devicePixelRatio));
  const night = time === 'noche';
  const [firstShot] = useState(() => shotFor(view, window.innerWidth, window.innerHeight));

  return (
    <Canvas
      shadows="soft"
      dpr={dpr}
      camera={{ position: firstShot.pos.toArray(), fov: firstShot.fov, near: 0.05, far: 60 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        scene.background = new THREE.Color('#e9d6bd');
      }}
      aria-label="Consultorio 3D con Gabi sentada en su sillón"
    >
      {/* Baja a 1.5 si el FPS cae por debajo de ~40 de forma sostenida */}
      <PerformanceMonitor bounds={() => [40, 120]} onDecline={() => setDpr(1.5)} flipflops={2} />
      <Suspense fallback={null}>
        <Lights time={time} mobile={mobile} />
        <Room time={time} />
        <Curtains reducedMotion={reducedMotion} />
        <SunBeam time={time} reducedMotion={reducedMotion} />
        <Props night={night} />
        <Avatar position={GABI_POS} reducedMotion={reducedMotion} />
        <Visitor />
      </Suspense>
      <CameraRig view={view} reducedMotion={reducedMotion} />
    </Canvas>
  );
}
