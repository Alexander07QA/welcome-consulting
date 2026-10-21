import { useEffect, useRef, useState } from 'react';
import { avatarController } from '../avatar/rig';
import { useAvatarStore } from '../store/avatarStore';
import { useChatStore } from '../store/chatStore';
import { speak, stopSpeaking } from '../services/voice';

// Respiración 4·4·6 durante 3 ciclos.
const PHASES = [
  { label: 'Inhala', secs: 4 },
  { label: 'Sostén', secs: 4 },
  { label: 'Exhala', secs: 6 },
] as const;
const CYCLES = 3;
const CYCLE_SECS = PHASES.reduce((a, p) => a + p.secs, 0);

function levelAt(phase: number, p: number): number {
  if (phase === 0) return p;
  if (phase === 1) return 1;
  return 1 - p;
}

export function BreathingGuide({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState({ phase: 0, cycle: 0, remaining: 4, level: 0, done: false });
  const lastPhase = useRef(-1);
  const voiceOn = useChatStore((s) => s.voiceOn);
  const setActivity = useAvatarStore((s) => s.setActivity);

  useEffect(() => {
    setActivity('respirando');
    avatarController.setEmotion('calma');
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      if (t >= CYCLE_SECS * CYCLES) {
        avatarController.setBreathing(null);
        setState((s) => ({ ...s, done: true, level: 0 }));
        if (voiceOn) void speak('Muy bien. Tómate un momento para notar cómo te sientes.');
        return;
      }
      const cycle = Math.floor(t / CYCLE_SECS);
      let within = t - cycle * CYCLE_SECS;
      let phase = 0;
      while (within >= PHASES[phase].secs) {
        within -= PHASES[phase].secs;
        phase++;
      }
      const p = within / PHASES[phase].secs;
      const level = levelAt(phase, p);
      avatarController.setBreathing(level);
      const key = cycle * 3 + phase;
      if (key !== lastPhase.current) {
        lastPhase.current = key;
        if (voiceOn) void speak(PHASES[phase].label);
      }
      setState({ phase, cycle, remaining: Math.ceil(PHASES[phase].secs - within), level, done: false });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      avatarController.setBreathing(null);
      stopSpeaking();
      setActivity('reposo');
    };
  }, [voiceOn, setActivity]);

  const scale = 0.55 + state.level * 0.45;

  return (
    <div className="breathing" role="dialog" aria-label="Respiración guiada 4·4·6">
      <div className="breath-circle" style={{ transform: `scale(${scale})` }} aria-hidden />
      <div className="breath-text" aria-live="polite">
        {state.done ? (
          <>
            <strong>Muy bien</strong>
            <span>Nota cómo te sientes ahora.</span>
          </>
        ) : (
          <>
            <strong>{PHASES[state.phase].label}</strong>
            <span>
              {state.remaining} · ciclo {state.cycle + 1} de {CYCLES}
            </span>
          </>
        )}
      </div>
      <button className="btn ghost light" onClick={onClose}>
        {state.done ? 'Terminar' : 'Detener'}
      </button>
    </div>
  );
}
