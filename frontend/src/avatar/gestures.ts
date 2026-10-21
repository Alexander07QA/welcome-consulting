import type { Gesture } from '../types';

const DURATION: Partial<Record<Gesture, number>> = { asentir: 1100, inclinar: 1600 };

/** Desplazamientos de cabeza (radianes) para el gesto en curso. */
export function gestureOffsets(
  g: { kind: Gesture; startedAt: number } | null,
  now: number,
): { pitch: number; roll: number; done: boolean } {
  if (!g) return { pitch: 0, roll: 0, done: false };
  const dur = DURATION[g.kind] ?? 0;
  const p = (now - g.startedAt) / dur;
  if (!dur || p >= 1) return { pitch: 0, roll: 0, done: true };
  if (g.kind === 'asentir') return { pitch: 0.11 * Math.sin(p * Math.PI * 2) ** 2, roll: 0, done: false };
  return { pitch: 0.04 * Math.sin(p * Math.PI), roll: 0.13 * Math.sin(p * Math.PI), done: false };
}
