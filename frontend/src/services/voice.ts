import { avatarController } from '../avatar/rig';

let cachedVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis?.getVoices() ?? [];
  cachedVoice =
    voices.find((v) => v.lang === 'es-CO') ??
    voices.find(
      (v) => v.lang.startsWith('es-') && /female|mujer|salom|paulina|helena|sabina/i.test(v.name),
    ) ??
    voices.find((v) => v.lang.startsWith('es')) ??
    null;
  return cachedVoice;
}

export const browserVoiceAvailable = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window;

/** Respaldo de voz con speechSynthesis; mueve la boca por palabra. */
export function speak(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!browserVoiceAvailable() || !text.trim()) return resolve();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-CO';
    u.rate = 0.98;
    u.pitch = 1.08;
    const v = pickVoice();
    if (v) u.voice = v;
    u.onboundary = (e) => {
      const word = text.slice(e.charIndex).split(/\s/)[0] ?? '';
      avatarController.talk(Math.max(160, word.length * 75));
    };
    u.onstart = () => avatarController.talk(400);
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

export function stopSpeaking(): void {
  if (browserVoiceAvailable()) window.speechSynthesis.cancel();
}
