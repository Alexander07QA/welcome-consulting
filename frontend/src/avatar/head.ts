import * as THREE from 'three';

// Cabeza de una sola malla: óvalo facial que se afina hacia el mentón, sin costuras.
const C = new THREE.Vector3(0, 0.108, 0);

export function buildHeadGeometry(): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, 56, 40);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const ux = p.getX(i);
    const uy = p.getY(i);
    const uz = p.getZ(i);
    const lower = uy < 0 ? uy * uy : 0;
    const wx = 0.092 * (uy < 0 ? 1 - 0.4 * lower : 1 - 0.08 * uy * uy);
    let z = uz * 0.1 * (1 - 0.14 * lower);
    if (uz > 0 && uy < 0) z += 0.013 * uz * -uy; // mandíbula y mentón hacia adelante
    if (uz < 0) z *= 1.06; // occipital
    p.setXYZ(i, C.x + ux * wx, C.y + uy * 0.112, C.z + z);
  }
  g.computeVertexNormals();
  return g;
}

const ray = new THREE.Raycaster();
let probe: THREE.Mesh | null = null;

/** Profundidad z de la superficie frontal de la cara en (x, y), para apoyar rasgos. */
export function faceZ(x: number, y: number): number {
  if (!probe) {
    probe = new THREE.Mesh(buildHeadGeometry(), new THREE.MeshBasicMaterial({ side: THREE.FrontSide }));
    probe.updateMatrixWorld();
  }
  ray.set(new THREE.Vector3(x, y, 1), new THREE.Vector3(0, 0, -1));
  const hit = ray.intersectObject(probe, false)[0];
  return hit ? hit.point.z : 0.09;
}
