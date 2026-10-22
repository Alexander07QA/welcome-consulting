import { useEffect, useState } from 'react';
import { avatarController } from '../avatar/rig';
import { useAvatarStore } from '../store/avatarStore';
import { useSceneStore } from '../store/sceneStore';

// Saludo al abrir el consultorio: cuando la persona se sienta, la cámara pasa de la vista
// amplia a la cara de Gabi, ella sonríe con el mensaje y luego la cámara pasa a la vista de frente.
const ZOOM_AT_MS = 800;
const SHOW_AT_MS = 3000;
const HIDE_AT_MS = 9000;

export function Greeting() {
  const [visible, setVisible] = useState(false);
  const [done, setDone] = useState(false);
  const seated = useSceneStore((s) => s.visitorSeated);

  useEffect(() => {
    if (!seated || done) return;
    const zoomId = setTimeout(() => useSceneStore.getState().setView('cerca'), ZOOM_AT_MS);
    const showId = setTimeout(() => {
      setVisible(true);
      useAvatarStore.getState().setEmotion('alegria');
      avatarController.playGesture('asentir');
      avatarController.wave(3600);
    }, SHOW_AT_MS);
    const hideId = setTimeout(() => setDone(true), HIDE_AT_MS);
    return () => {
      clearTimeout(zoomId);
      clearTimeout(showId);
      clearTimeout(hideId);
    };
  }, [seated, done]);

  useEffect(() => {
    if (!done) return;
    setVisible(false);
    useAvatarStore.getState().setEmotion('calma');
    useSceneStore.getState().setView('frente');
  }, [done]);

  if (!visible) return null;
  return (
    <button className="greeting" onClick={() => setDone(true)} aria-live="polite">
      ¡Hola! Soy Gabi, pronto estaré contigo para acompañarte a <strong>VIVIR</strong>{' '}
      <svg className="heart" viewBox="0 0 24 24" role="img" aria-label="con amor">
        <path
          fill="currentColor"
          d="M12 20.6c-.3 0-.6-.1-.8-.3C6.4 16.4 3 13.4 3 9.6 3 7 5 5 7.5 5c1.8 0 3.3 1 4.5 2.6C13.2 6 14.7 5 16.5 5 19 5 21 7 21 9.6c0 3.8-3.4 6.8-8.2 10.7-.2.2-.5.3-.8.3z"
        />
      </svg>
    </button>
  );
}
