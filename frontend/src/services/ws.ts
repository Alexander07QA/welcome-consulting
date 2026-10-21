import type { Emotion, Gesture } from '../types';

// Contrato de la sección 7.
export type ServerEvent =
  | { type: 'crisis'; level: string; title: string; body: string; lines: string[] }
  | { type: 'reply_start'; emotion: Emotion; gesture: Gesture }
  | { type: 'reply_delta'; text: string }
  | { type: 'reply_done'; text: string; emotion: Emotion; gesture: Gesture }
  | { type: 'tts'; audio_b64: string; mime: string; visemes: { t_ms: number; id: number }[] }
  | { type: 'error'; code: string; message: string };

export type ClientEvent = { type: 'user_message'; text: string } | { type: 'cancel' };

export async function createSession(): Promise<string | null> {
  try {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consent: true }),
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (typeof data === 'object' && data && 'session_id' in data && typeof data.session_id === 'string')
      return data.session_id;
    return null;
  } catch {
    return null;
  }
}

export async function deleteSession(id: string): Promise<void> {
  try {
    await fetch(`/api/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch {
    // Sin conexión: el estado local se limpia igual.
  }
}

export class ChatSocket {
  private ws: WebSocket | null = null;

  constructor(
    private sessionId: string,
    private onEvent: (e: ServerEvent) => void,
    private onClose: () => void,
  ) {}

  open(): Promise<boolean> {
    return new Promise((resolve) => {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      const ws = new WebSocket(
        `${proto}://${location.host}/ws/chat?session_id=${encodeURIComponent(this.sessionId)}`,
      );
      ws.onopen = () => resolve(true);
      ws.onerror = () => resolve(false);
      ws.onclose = () => this.onClose();
      ws.onmessage = (m) => {
        try {
          this.onEvent(JSON.parse(String(m.data)) as ServerEvent);
        } catch {
          // Evento mal formado: se ignora.
        }
      };
      this.ws = ws;
    });
  }

  send(e: ClientEvent): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(e));
  }

  close(): void {
    this.ws?.close();
  }
}
