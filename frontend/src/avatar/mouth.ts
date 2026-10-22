import * as THREE from 'three';

// Boca del avatar provisional: labio superior, labio inferior (con volumen), interior y
// dientes. La forma se recalcula en el sitio a partir de sonrisa, ceño, apertura y ancho.
// Los labios quedan cerrados en reposo; los dientes asoman solo con una sonrisa amplia.
const N = 22;
const ROWS = 5;

export interface MouthParams {
  smile: number;
  frown: number;
  open: number;
  wide: number;
}

export interface MouthMeshes {
  upper: THREE.BufferGeometry;
  lower: THREE.BufferGeometry;
  inner: THREE.BufferGeometry;
  teeth: THREE.BufferGeometry;
  update(p: MouthParams): void;
}

function strip(rows: number): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((N + 1) * (rows + 1) * 3), 3));
  const idx: number[] = [];
  for (let i = 0; i < N; i++) {
    for (let r = 0; r < rows; r++) {
      const a = i * (rows + 1) + r;
      const b = a + rows + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  g.setIndex(idx);
  return g;
}

const bump = (u: number) => 1 - u * u;

export function createMouth(curvature = 6.5): MouthMeshes {
  const upper = strip(ROWS);
  const lower = strip(ROWS);
  const inner = strip(1);
  const teeth = strip(1);

  /** Rellena una franja entre `from` (v=0) y `to` (v=1); `bulge` adelanta el centro. */
  const write = (
    g: THREE.BufferGeometry,
    halfW: number,
    from: (u: number) => number,
    to: (u: number) => number,
    dz: number,
    bulge = 0,
  ) => {
    const pos = g.attributes.position as THREE.BufferAttribute;
    const rows = pos.count / (N + 1) - 1;
    for (let i = 0; i <= N; i++) {
      const u = (i / N) * 2 - 1;
      const x = u * halfW;
      const z = dz - curvature * x * x;
      for (let r = 0; r <= rows; r++) {
        const v = r / rows;
        const y = THREE.MathUtils.lerp(from(u), to(u), v);
        const round = Math.sin(Math.PI * Math.min(1, v * 1.15)) * Math.sqrt(bump(u));
        pos.setXYZ(i * (rows + 1) + r, x, y, z + bulge * round - 0.0006 * (1 - v));
      }
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    g.computeBoundingSphere();
  };

  return {
    upper,
    lower,
    inner,
    teeth,
    update({ smile, frown, open, wide }) {
      const grin = THREE.MathUtils.smoothstep(smile, 0.5, 0.85);
      const halfW = 0.0232 + 0.0065 * smile + 0.004 * wide - 0.002 * frown;
      const corner = (u: number) => (0.0058 * smile - 0.006 * frown) * u * u;
      const up = (u: number) => corner(u) + bump(u) * (0.0042 * open + 0.0018 * grin);
      const lo = (u: number) => corner(u) - bump(u) * (0.017 * open + 0.0075 * grin);
      // Arco de cupido marcado: valle al centro y dos picos suaves
      const bow = (u: number) =>
        -0.0011 * Math.exp(-((u / 0.14) ** 2)) + 0.0005 * Math.exp(-(((Math.abs(u) - 0.3) / 0.14) ** 2));
      const thinUp = (u: number) => 0.0062 * bump(u) ** 0.55 + bow(u);
      const thinLo = (u: number) => 0.0092 * bump(u) ** 0.7;
      write(upper, halfW, up, (u) => up(u) + thinUp(u), 0, 0.0032);
      write(lower, halfW, lo, (u) => lo(u) - thinLo(u), 0, 0.0044);
      write(inner, halfW * 0.98, up, lo, -0.0018);
      const teethH = 0.0055 + 0.003 * open;
      write(teeth, halfW * 0.84, (u) => up(u * 0.84), (u) => Math.max(lo(u * 0.84), up(u * 0.84) - bump(u) * teethH), -0.001);
    },
  };
}
