import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export interface Part {
  geo: THREE.BufferGeometry;
  color: THREE.ColorRepresentation;
  matrix?: THREE.Matrix4;
}

/** Une muchas piezas en una sola geometría con color por vértice (menos draw calls). */
export function mergeColored(parts: Part[]): THREE.BufferGeometry {
  const prepared = parts.map(({ geo, color, matrix }) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (matrix) g.applyMatrix4(matrix);
    const c = new THREE.Color(color);
    const n = g.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    for (const k of Object.keys(g.attributes)) {
      if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
    }
    return g;
  });
  const merged = mergeGeometries(prepared, false);
  if (!merged) throw new Error('No se pudieron unir las geometrías');
  return merged;
}

export function compose(
  pos: [number, number, number],
  rot: [number, number, number] = [0, 0, 0],
  scale: [number, number, number] = [1, 1, 1],
): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...pos),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
    new THREE.Vector3(...scale),
  );
}

/** Matriz que orienta un cilindro/cápsula (eje Y) entre dos puntos. */
export function between(a: THREE.Vector3, b: THREE.Vector3): { mid: THREE.Vector3; quat: THREE.Quaternion; len: number } {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return { mid: new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5), quat, len };
}
