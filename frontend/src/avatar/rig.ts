import type { AvatarController, Emotion, Gesture, VisemeName } from '../types';
import { EXPRESSIONS, type ExpressionWeights } from './expressions';

/**
 * Estado mutable que lee el avatar en cada frame. Se mantiene fuera de React para no
 * provocar renders a 60 FPS. Cualquier avatar (provisional o GLB) consume este mismo estado.
 */
export interface RigState {
  emotion: Emotion;
  target: ExpressionWeights;
  current: ExpressionWeights;
  gesture: { kind: Gesture; startedAt: number } | null;
  mouthOpen: number;
  mouthWide: number;
  talkUntil: number;
  /** Saludo con la mano derecha en curso. */
  wave: { startedAt: number; duration: number } | null;
  breathing: number | null;
  look: { x: number; y: number };
}

export const rig: RigState = {
  emotion: 'calma',
  target: { ...EXPRESSIONS.calma },
  current: { ...EXPRESSIONS.calma },
  gesture: null,
  mouthOpen: 0,
  mouthWide: 0,
  talkUntil: 0,
  wave: null,
  breathing: null,
  look: { x: 0, y: 0 },
};

// Apertura y ancho de boca aproximados por visema, para el avatar provisional.
const VISEME_SHAPE: Record<VisemeName, [open: number, wide: number]> = {
  sil: [0, 0], PP: [0, -0.2], FF: [0.15, 0.1], TH: [0.2, 0.1], DD: [0.3, 0.1],
  kk: [0.35, 0.05], CH: [0.3, -0.3], SS: [0.15, 0.3], nn: [0.2, 0.1], RR: [0.3, -0.1],
  aa: [0.9, 0.2], E: [0.55, 0.45], I: [0.35, 0.5], O: [0.7, -0.45], U: [0.4, -0.6],
};

export const avatarController: AvatarController & { talk(ms: number): void; wave(ms: number): void } = {
  setEmotion(e) {
    rig.emotion = e;
    rig.target = { ...EXPRESSIONS[e] };
  },
  playGesture(g) {
    if (g === 'asentir' || g === 'inclinar') rig.gesture = { kind: g, startedAt: performance.now() };
  },
  setMouthOpen(v) {
    rig.mouthOpen = Math.min(1, Math.max(0, v));
  },
  setViseme(id, w) {
    const [open, wide] = VISEME_SHAPE[id];
    rig.mouthOpen = open * w;
    rig.mouthWide = wide * w;
  },
  setBreathing(level) {
    rig.breathing = level;
  },
  lookAt(x, y) {
    rig.look.x = Math.max(-1, Math.min(1, x));
    rig.look.y = Math.max(-1, Math.min(1, y));
  },
  /** Movimiento de boca sin audio mientras llega el texto. */
  talk(ms) {
    rig.talkUntil = Math.max(rig.talkUntil, performance.now()) + ms;
  },
  /** Levanta la mano derecha y saluda durante ms milisegundos. */
  wave(ms) {
    rig.wave = { startedAt: performance.now(), duration: ms };
  },
};
