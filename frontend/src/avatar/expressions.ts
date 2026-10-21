import type { Emotion } from '../types';

export interface ExpressionWeights {
  browInnerUp: number;
  browDown: number;
  mouthSmile: number;
  mouthFrown: number;
  cheekSquint: number;
  /** Inclinación lateral de la cabeza en grados. */
  headTilt: number;
  lookUp: number;
}

// Tabla de la sección 10B del PDF.
export const EXPRESSIONS: Record<Emotion, ExpressionWeights> = {
  calma: { browInnerUp: 0, browDown: 0, mouthSmile: 0.45, mouthFrown: 0, cheekSquint: 0.1, headTilt: 2, lookUp: 0 },
  empatia: { browInnerUp: 0.55, browDown: 0, mouthSmile: 0.2, mouthFrown: 0.1, cheekSquint: 0, headTilt: 7, lookUp: 0 },
  alegria: { browInnerUp: 0.1, browDown: 0, mouthSmile: 0.8, mouthFrown: 0, cheekSquint: 0.5, headTilt: -3, lookUp: 0 },
  preocupacion: { browInnerUp: 0.7, browDown: 0.15, mouthSmile: 0, mouthFrown: 0.25, cheekSquint: 0, headTilt: 5, lookUp: 0 },
  escucha: { browInnerUp: 0.2, browDown: 0, mouthSmile: 0.3, mouthFrown: 0, cheekSquint: 0, headTilt: 9, lookUp: 0 },
  reflexion: { browInnerUp: 0.25, browDown: 0.1, mouthSmile: 0.15, mouthFrown: 0, cheekSquint: 0.2, headTilt: -6, lookUp: 1 },
};
