import { create } from 'zustand';

export type TimeOfDay = 'dia' | 'tarde' | 'noche';
export type View = 'frente' | 'cerca' | 'amplia';

/** Momento del día según la hora local del dispositivo. */
export function timeFromClock(d: Date = new Date()): TimeOfDay {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 6 && h < 15) return 'dia';
  if (h >= 15 && h < 18.5) return 'tarde';
  return 'noche';
}

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
  time: timeFromClock(),
  // Arranca en amplia: el saludo inicial acerca la cámara a Gabi y luego pasa a frente.
  view: 'amplia',
  manualTime: false,
  visitorSeated: false,
  setTime: (time, manual = true) => set({ time, manualTime: manual }),
  setView: (view) => set({ view }),
  markVisitorSeated: () => set({ visitorSeated: true }),
}));
