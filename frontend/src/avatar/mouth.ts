import * as THREE from 'three';

// Boca del avatar provisional: tres franjas (labios, interior, dientes) cuya forma se
// recalcula en el sitio a partir de sonrisa, ceño, apertura y ancho.
const N = 18;

export interface MouthParams {
  smile: number;
  frown: number;
  open: number;
  wide: number;
}

export interface MouthMeshes {
  lips: THREE.BufferGeometry;
  inner: THREE.BufferGeometry;
  teeth: THREE.BufferGeometry;
  update(p: MouthParams): void;
}

function strip(): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((N + 1) * 2 * 3), 3));
  const idx: number[] = [];
  for (let i = 0; i < N; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  g.setIndex(idx);
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array((N + 1) * 2 * 3).map((_, k) => (k % 3 === 2 ? 1 : 0)), 3));
  return g;
}

export function createMouth(curvature = 6.5): MouthMeshes {
  const lips = strip();
  const inner = strip();
  const teeth = strip();

  const write = (g: THREE.BufferGeometry, halfW: number, top: (u: number) => number, bottom: (u: number) => number, dz: number) => {
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i <= N; i++) {
      const u = (i / N) * 2 - 1;
      const x = u * halfW;
      const z = dz - curvature * x * x;
      pos.setXYZ(i * 2, x, top(u), z);
      pos.setXYZ(i * 2 + 1, x, bottom(u), z);
    }
    pos.needsUpdate = true;
    g.computeBoundingSphere();
  };

  return {
    lips,
    inner,
    teeth,
    update({ smile, frown, open, wide }) {
      const halfW = 0.0235 + 0.0075 * smile + 0.004 * wide - 0.002 * frown;
      const corner = (u: number) => (0.0068 * smile - 0.0062 * frown) * u * u;
      const bump = (u: number) => 1 - u * u;
      const up = (u: number) => corner(u) + bump(u) * (0.0012 + 0.0045 * open + 0.0022 * smile);
      const lo = (u: number) => corner(u) - bump(u) * (0.0012 + 0.019 * open + 0.0085 * smile);
      const bow = (u: number) => -0.0011 * Math.exp(-((u / 0.2) ** 2));
      write(lips, halfW * 1.07, (u) => up(u) + bump(u) * 0.0062 + 0.0009 + bow(u), (u) => lo(u) - bump(u) * 0.0078 - 0.0009, 0);
      write(inner, halfW, up, lo, 0.0004);
      const teethH = 0.0055 + 0.003 * open;
      write(teeth, halfW * 0.86, (u) => up(u * 0.86), (u) => Math.max(lo(u * 0.86), up(u * 0.86) - bump(u) * teethH), 0.0008);
    },
  };
}
