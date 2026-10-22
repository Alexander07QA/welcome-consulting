import { create } from 'zustand';

export type TimeOfDay = 'tarde' | 'noche';
export type View = 'frente' | 'cerca' | 'amplia';

const prefersDark = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

interface SceneStore {
  time: TimeOfDay;
  view: View;
  manualTime: boolean;
  /** La persona que llega ya se sentó frente a Gabi. */
  visitorSeated: boolean;
  setTime(t: TimeOfDay, manual?: boolean): void;
  setView(v: View): void;
  markVisitorSeated(): void;
}

export const useSceneStore = create<SceneStore>((set) => ({
  time: prefersDark() ? 'noche' : 'tarde',
  // Arranca en amplia: el saludo inicial acerca la cámara a Gabi y luego pasa a frente.
  view: 'amplia',
  manualTime: false,
  visitorSeated: false,
  setTime: (time, manual = true) => set({ time, manualTime: manual }),
  setView: (view) => set({ view }),
  markVisitorSeated: () => set({ visitorSeated: true }),
}));
