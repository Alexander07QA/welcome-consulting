import { lazy, Suspense, useEffect, useState } from 'react';
import { ChatPanel } from './chat/ChatPanel';
import { CrisisCard } from './chat/CrisisCard';
import { BreathingGuide } from './breathing/BreathingGuide';
import { Greeting } from './greeting/Greeting';
import { ConsentScreen } from './consent/ConsentScreen';
import { CRISIS } from './safety/crisis';
import { useChatStore } from './store/chatStore';
import { useSceneStore, type View } from './store/sceneStore';
import { endSession, startSession } from './services/conversation';
import { browserVoiceAvailable, stopSpeaking } from './services/voice';

const Scene = lazy(() => import('./scene/Scene').then((m) => ({ default: m.Scene })));

// Por ahora solo se muestra el consultorio: sin encabezado, panel de conversación ni
// botón de ayuda urgente. Al volver a activar la conversación, la ayuda urgente vuelve con ella.
const SHOW_PANELS = false;

const VIEWS: { id: View; label: string }[] = [
  { id: 'frente', label: 'Frente' },
  { id: 'cerca', label: 'Cerca' },
  { id: 'amplia', label: 'Amplia' },
];

function readConsent(): boolean {
  try {
    return localStorage.getItem('gabi.consent') === '1';
  } catch {
    return false;
  }
}

export default function App() {
  const [consented, setConsented] = useState(readConsent);
  const urgentOpen = useChatStore((s) => s.urgentOpen);
  const breathingOpen = useChatStore((s) => s.breathingOpen);
  const voiceOn = useChatStore((s) => s.voiceOn);
  const setChat = useChatStore((s) => s.set);
  const { time, view, manualTime, setTime, setView } = useSceneStore();

  useEffect(() => {
    if (consented) void startSession();
  }, [consented]);

  // Modo tarde/noche sigue el tema del sistema hasta que la persona lo cambie a mano
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = (e: MediaQueryListEvent) =>
      !manualTime && setTime(e.matches ? 'noche' : 'tarde', false);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [manualTime, setTime]);

  useEffect(() => {
    document.documentElement.dataset.theme = time === 'noche' ? 'dark' : 'light';
  }, [time]);

  const accept = () => {
    try {
      localStorage.setItem('gabi.consent', '1');
    } catch {
      // Sin almacenamiento: el consentimiento vale solo para esta visita.
    }
    setConsented(true);
  };

  const erase = async () => {
    if (!window.confirm('¿Borrar esta conversación y tus datos? No se puede deshacer.')) return;
    await endSession();
    setConsented(false);
  };

  const breathe = () => setChat({ breathingOpen: true });

  return (
    <div className={SHOW_PANELS ? 'app' : 'app solo-escena'}>
      {SHOW_PANELS && (
        <header className="topbar">
          <div className="brand">
            <span className="logo" aria-hidden>
              G
            </span>
            <div>
              <strong>Gabi</strong>
              <small>acompañamiento emocional</small>
            </div>
          </div>
          <nav className="actions" aria-label="Opciones">
            <button className="btn soft" onClick={breathe}>
              Respirar
            </button>
            <div className="segmented" role="group" aria-label="Vista de cámara">
              {VIEWS.map((v) => (
                <button key={v.id} aria-pressed={view === v.id} onClick={() => setView(v.id)}>
                  {v.label}
                </button>
              ))}
            </div>
            <button
              className="btn soft"
              aria-pressed={time === 'noche'}
              onClick={() => setTime(time === 'tarde' ? 'noche' : 'tarde')}
            >
              {time === 'tarde' ? 'Tarde' : 'Noche'}
            </button>
            {browserVoiceAvailable() && (
              <button
                className="btn soft"
                aria-pressed={voiceOn}
                onClick={() => {
                  if (voiceOn) stopSpeaking();
                  setChat({ voiceOn: !voiceOn });
                }}
              >
                {voiceOn ? 'Voz activa' : 'Voz apagada'}
              </button>
            )}
            {consented && (
              <button className="btn ghost" onClick={() => void erase()}>
                Borrar mis datos
              </button>
            )}
            <button className="btn danger" onClick={() => setChat({ urgentOpen: true })}>
              Ayuda urgente
            </button>
          </nav>
        </header>
      )}

      <main className="layout">
        <section className="stage" aria-label="Consultorio">
          <Suspense fallback={<div className="stage-loading">Preparando el consultorio…</div>}>
            <Scene />
            <Greeting />
          </Suspense>
          {breathingOpen && <BreathingGuide onClose={() => setChat({ breathingOpen: false })} />}
        </section>
        {SHOW_PANELS &&
          (consented ? <ChatPanel onBreathe={breathe} /> : <ConsentScreen onAccept={accept} />)}
      </main>

      {urgentOpen && (
        <div className="modal-backdrop" onClick={() => setChat({ urgentOpen: false })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <CrisisCard content={CRISIS} onClose={() => setChat({ urgentOpen: false })} />
          </div>
        </div>
      )}
    </div>
  );
}
