export const EMOTIONS = ['calma', 'empatia', 'alegria', 'preocupacion', 'escucha', 'reflexion'] as const;
export type Emotion = (typeof EMOTIONS)[number];

export const GESTURES = ['ninguno', 'asentir', 'inclinar', 'respirar'] as const;
export type Gesture = (typeof GESTURES)[number];

export type VisemeName =
  | 'sil' | 'PP' | 'FF' | 'TH' | 'DD' | 'kk' | 'CH' | 'SS'
  | 'nn' | 'RR' | 'aa' | 'E' | 'I' | 'O' | 'U';

export interface AvatarController {
  setEmotion(e: Emotion): void;
  playGesture(g: Gesture): void;
  setMouthOpen(v: number): void;
  setViseme(id: VisemeName, w: number): void;
  setBreathing(level: number | null): void;
  lookAt(x: number, y: number): void;
}
