import { create } from 'zustand';

export type TimeOfDay = 'tarde' | 'noche';
export type View = 'frente' | 'cerca' | 'amplia';

const prefersDark = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

interface SceneStore {
  time: TimeOfDay;
  view: View;
  manualTime: boolean;
  setTime(t: TimeOfDay, manual?: boolean): void;
  setView(v: View): void;
}

export const useSceneStore = create<SceneStore>((set) => ({
  time: prefersDark() ? 'noche' : 'tarde',
  view: 'frente',
  manualTime: false,
  setTime: (time, manual = true) => set({ time, manualTime: manual }),
  setView: (view) => set({ view }),
}));
