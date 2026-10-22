import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { LIGHTING, ROOM, SUN_DIR, WINDOW } from './DayNight';
import { softDot } from './textures';
import type { TimeOfDay } from '../store/sceneStore';

const SUN_TARGET = new THREE.Vector3(0.2, 0, -1.6);

const BEAM: Record<TimeOfDay, { strength: number; color: string }> = {
  dia: { strength: 0.8, color: '#fff1d6' },
  tarde: { strength: 1, color: '#ffd9a0' },
  noche: { strength: 0.35, color: '#9fb3e6' },
};

export function Lights({ time, mobile }: { time: TimeOfDay; mobile: boolean }) {
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const lamp = useRef<THREE.PointLight>(null);
  const desk = useRef<THREE.PointLight>(null);
  const pendant = useRef<THREE.PointLight>(null);
  const { gl, scene } = useThree();
  const tmp = useMemo(
    () => ({ c: new THREE.Color(), s: new THREE.Color(), g: new THREE.Color() }),
    [],
  );

  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.copy(SUN_TARGET);
    return o;
  }, []);

  useFrame((_, dt) => {
    const p = LIGHTING[time];
    const k = 1 - Math.exp(-dt * 3);
    if (sun.current) {
      sun.current.intensity += (p.sun - sun.current.intensity) * k;
      sun.current.color.lerp(tmp.c.set(p.sunColor), k);
    }
    if (hemi.current) {
      hemi.current.intensity += (p.hemi - hemi.current.intensity) * k;
      hemi.current.color.lerp(tmp.s.set(p.hemiSky), k);
      hemi.current.groundColor.lerp(tmp.g.set(p.hemiGround), k);
    }
    if (lamp.current) lamp.current.intensity += (p.lamp - lamp.current.intensity) * k;
    if (desk.current) desk.current.intensity += (p.deskLamp - desk.current.intensity) * k;
    if (pendant.current)
      pendant.current.intensity += (p.lamp * 0.35 - pendant.current.intensity) * k;
    gl.toneMappingExposure += (p.exposure - gl.toneMappingExposure) * k;
    if (scene.background instanceof THREE.Color) scene.background.lerp(tmp.c.set(p.fog), k);
  });

  const sunPos = SUN_TARGET.clone().addScaledVector(SUN_DIR, 9);

  return (
    <>
      <hemisphereLight ref={hemi} args={['#fff1df', '#a07a5c', 0.8]} />
      <primitive object={target} />
      <directionalLight
        ref={sun}
        position={sunPos}
        target={target}
        intensity={4}
        castShadow
        // En escritorio, mapa más fino para que pies y piernas dejen sombra nítida.
        shadow-mapSize={mobile ? [1024, 1024] : [2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-6.5}
        shadow-camera-right={6.5}
        shadow-camera-top={6.5}
        shadow-camera-bottom={-6.5}
        shadow-camera-near={0.5}
        shadow-camera-far={22}
      />
      <pointLight
        ref={lamp}
        position={[-0.95, 1.5, -2.32]}
        color="#ffb46b"
        intensity={0}
        distance={9}
        decay={1.6}
        castShadow={!mobile}
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.002}
      />
      <pointLight
        ref={desk}
        position={[2.95, 1.05, -3.7]}
        color="#ffc98a"
        intensity={0}
        distance={4}
        decay={2}
      />
      <pointLight
        ref={pendant}
        position={[0, 2.5, -0.7]}
        color="#ffd49a"
        intensity={0}
        distance={7}
        decay={1.8}
      />
      {/* Luz suave de rostro, desde el lado de la persona */}
      <pointLight
        position={[0.7, 1.95, 0.1]}
        color={time === 'noche' ? '#ffd2a8' : '#fff0e2'}
        intensity={time === 'noche' ? 2.6 : 3.2}
        distance={6}
        decay={2}
      />
      {/* Relleno suave del lado de la cámara */}
      <pointLight
        position={[0.5, 2.2, 2.5]}
        color="#ffe9d2"
        intensity={time === 'noche' ? 0.25 : 1.2}
        distance={8}
        decay={2}
      />
    </>
  );
}

/** Haz de luz que entra por la ventana y polvo flotando dentro de él. */
export function SunBeam({ time, reducedMotion }: { time: TimeOfDay; reducedMotion: boolean }) {
  const { geo, from, to } = useMemo(() => {
    const x = ROOM.minX + 0.02;
    const corners = [
      new THREE.Vector3(x, WINDOW.y0, WINDOW.z0),
      new THREE.Vector3(x, WINDOW.y0, WINDOW.z1),
      new THREE.Vector3(x, WINDOW.y1, WINDOW.z1),
      new THREE.Vector3(x, WINDOW.y1, WINDOW.z0),
    ];
    const travel = SUN_DIR.clone().negate();
    const floor = corners.map((c) => c.clone().addScaledVector(travel, c.y / -travel.y));
    const pos: number[] = [];
    const fade: number[] = [];
    const quad = (
      a: THREE.Vector3,
      b: THREE.Vector3,
      c: THREE.Vector3,
      d: THREE.Vector3,
      fa: number[],
    ) => {
      for (const [v, f] of [
        [a, fa[0]],
        [b, fa[1]],
        [c, fa[2]],
        [a, fa[0]],
        [c, fa[2]],
        [d, fa[3]],
      ] as [THREE.Vector3, number][]) {
        pos.push(v.x, v.y, v.z);
        fade.push(f);
      }
    };
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      quad(corners[i], corners[j], floor[j], floor[i], [1, 1, 0.15, 0.15]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('fade', new THREE.Float32BufferAttribute(fade, 1));
    const center = (vs: THREE.Vector3[]) =>
      vs.reduce((a, v) => a.add(v), new THREE.Vector3()).multiplyScalar(0.25);
    return { geo: g, from: center(corners), to: center(floor) };
  }, []);

  const beamMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uStrength: { value: 1 }, uColor: { value: new THREE.Color('#ffd9a0') } },
        vertexShader: `attribute float fade; varying float vFade; void main(){ vFade = fade; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform float uStrength; uniform vec3 uColor; varying float vFade; void main(){ gl_FragColor = vec4(uColor, vFade * 0.075 * uStrength); }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [],
  );

  const count = 260;
  const dust = useMemo(() => {
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count * 4; i++) seeds[i] = Math.random();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    return { g, seeds };
  }, []);
  const dot = useMemo(softDot, []);
  const dustMat = useRef<THREE.PointsMaterial>(null);

  useFrame(({ clock }, dt) => {
    const strength = BEAM[time].strength;
    const u = beamMat.uniforms.uStrength;
    u.value += (strength - u.value) * (1 - Math.exp(-dt * 3));
    beamMat.uniforms.uColor.value.set(BEAM[time].color);
    if (dustMat.current) dustMat.current.opacity = 0.55 * u.value;
    const t = clock.elapsedTime * (reducedMotion ? 0.3 : 1);
    const arr = dust.g.attributes.position.array as Float32Array;
    const halfW = (WINDOW.z1 - WINDOW.z0) / 2;
    const halfH = (WINDOW.y1 - WINDOW.y0) / 2;
    for (let i = 0; i < count; i++) {
      const [a, b, c, d] = [
        dust.seeds[i * 4],
        dust.seeds[i * 4 + 1],
        dust.seeds[i * 4 + 2],
        dust.seeds[i * 4 + 3],
      ];
      const along = (a + t * 0.004 * (0.5 + d)) % 1;
      const p = from.clone().lerp(to, along * 0.9);
      arr[i * 3] = p.x + Math.sin(t * 0.3 + d * 20) * 0.05;
      arr[i * 3 + 1] =
        p.y + (b - 0.5) * halfH * 1.6 * (1 - along * 0.6) + Math.sin(t * 0.21 + a * 30) * 0.04;
      arr[i * 3 + 2] = p.z + (c - 0.5) * halfW * 1.7 + Math.cos(t * 0.25 + b * 25) * 0.04;
    }
    dust.g.attributes.position.needsUpdate = true;
  });

  return (
    <group>
      <mesh geometry={geo} material={beamMat} renderOrder={2} />
      <points geometry={dust.g} renderOrder={3}>
        <pointsMaterial
          ref={dustMat}
          map={dot}
          size={0.018}
          color="#fff2d6"
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

/** Cortinas de lino a ambos lados de la ventana, con un leve vaivén. */
export function Curtains({ reducedMotion }: { reducedMotion: boolean }) {
  const geos = useMemo(
    () =>
      [WINDOW.z0 - 0.25, WINDOW.z1 + 0.25].map(() => {
        const g = new THREE.PlaneGeometry(0.55, 2.65, 28, 12);
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const u = p.getX(i);
          p.setZ(i, Math.sin(u * 34) * 0.035);
        }
        g.computeVertexNormals();
        return g;
      }),
    [],
  );
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (m) m.rotation.x = Math.sin(t * 0.6 + i) * 0.012 * (reducedMotion ? 0.3 : 1);
    });
  });
  const x = ROOM.minX + 0.1;
  return (
    <group>
      <mesh position={[x, 2.72, (WINDOW.z0 + WINDOW.z1) / 2]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.012, 0.012, WINDOW.z1 - WINDOW.z0 + 1.1, 8]} />
        <meshStandardMaterial color="#8a6a48" roughness={0.4} />
      </mesh>
      {[WINDOW.z0 - 0.25, WINDOW.z1 + 0.25].map((z, i) => (
        <group key={z} position={[x, 2.7, z]}>
          <mesh
            ref={(m) => (refs.current[i] = m)}
            geometry={geos[i]}
            position={[0, -1.32, 0]}
            rotation-y={Math.PI / 2}
            castShadow
          >
            <meshStandardMaterial
              color="#f4ecdf"
              roughness={1}
              side={THREE.DoubleSide}
              transparent
              opacity={0.88}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
