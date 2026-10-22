import { describe, expect, it } from 'vitest';
import {
  ANKLE_H,
  FLOOR_Y,
  WALK_S,
  seatedFoot,
  turnStep,
  walkDistance,
  walkFoot,
  type FootPose,
} from './gait';

const samples = (fn: (t: number) => FootPose, total: number, dt = 1 / 120) => {
  const out: FootPose[] = [];
  for (let t = 0; t <= total; t += dt) out.push(fn(t));
  return out;
};

const walk = (leg: number) =>
  samples((t) => {
    const { dist, speed } = walkDistance(t);
    return walkFoot(leg, dist, speed);
  }, WALK_S + 0.2);

describe('marcha del visitante', () => {
  it('mueve cada pie sin saltos entre cuadros', () => {
    for (const leg of [0, 1]) {
      const poses = walk(leg);
      for (let i = 1; i < poses.length; i++) {
        const a = poses[i - 1];
        const b = poses[i];
        expect(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)).toBeLessThan(0.04);
        expect(Math.abs(b.pitch - a.pitch)).toBeLessThan(0.15);
      }
    }
  });

  it('no deja resbalar el pie mientras está plano en el piso', () => {
    for (const leg of [0, 1]) {
      const poses = walk(leg);
      for (let i = 1; i < poses.length; i++) {
        const a = poses[i - 1];
        const b = poses[i];
        const flat = (p: FootPose) => p.pitch === 0 && Math.abs(p.y - FLOOR_Y - ANKLE_H) < 1e-9;
        if (flat(a) && flat(b)) expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeLessThan(1e-9);
      }
    }
  });

  it('nunca mete el pie bajo el piso', () => {
    for (const leg of [0, 1])
      for (const p of walk(leg)) expect(p.y).toBeGreaterThanOrEqual(FLOOR_Y + 0.05);
  });

  it('termina el giro con los pies frente al sillón', () => {
    const end = walkFoot(0, walkDistance(WALK_S).dist, 0);
    expect(turnStep(end, seatedFoot(0), 1)).toEqual(seatedFoot(0));
    expect(end.pitch).toBeCloseTo(0);
  });
});
