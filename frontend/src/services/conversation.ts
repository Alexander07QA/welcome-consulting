import { avatarController } from '../avatar/rig';
import { CRISIS, detectCrisis, type CrisisContent } from '../safety/crisis';
import { StreamingTagParser } from '../llm/tagParser';
import { useAvatarStore } from '../store/avatarStore';
import { useChatStore } from '../store/chatStore';
import { CRISIS_DEMO_REPLY, demoReply, streamDemo } from './demo';
import { speak, stopSpeaking } from './voice';
import { ChatSocket, createSession, deleteSession, type ServerEvent } from './ws';
import type { Emotion, Gesture } from '../types';

const MAX_LEN = 2000;
let socket: ChatSocket | null = null;
let abort: AbortController | null = null;
let liveReplyId: string | null = null;

export async function startSession(): Promise<void> {
  const chat = useChatStore.getState();
  const id = await createSession();
  if (id) {
    const s = new ChatSocket(id, onServerEvent, () =>
      useChatStore.getState().set({ pending: false }),
    );
    if (await s.open()) {
      socket = s;
      chat.set({ mode: 'live', sessionId: id });
      return;
    }
  }
  chat.set({ mode: 'demo', sessionId: null });
}

export async function endSession(): Promise<void> {
  const { sessionId } = useChatStore.getState();
  cancelReply();
  socket?.close();
  socket = null;
  if (sessionId) await deleteSession(sessionId);
  try {
    localStorage.removeItem('gabi.consent');
    sessionStorage.clear();
  } catch {
    // Almacenamiento bloqueado: no hay nada que limpiar.
  }
  useChatStore.getState().reset();
  useAvatarStore.getState().setEmotion('calma');
}

export function cancelReply(): void {
  abort?.abort();
  socket?.send({ type: 'cancel' });
  stopSpeaking();
  useChatStore.getState().set({ pending: false });
}

export async function sendMessage(raw: string): Promise<void> {
  const chat = useChatStore.getState();
  const text = raw.trim();
  if (!text || chat.pending) return;
  if (text.length > MAX_LEN) {
    chat.add({
      role: 'notice',
      text: `Tu mensaje era muy largo; lo recorté a ${MAX_LEN} caracteres.`,
    });
  }
  const clipped = text.slice(0, MAX_LEN);
  chat.add({ role: 'user', text: clipped });
  chat.set({ pending: true });
  useAvatarStore.getState().setActivity('pensando');

  if (chat.mode === 'live' && socket) {
    liveReplyId = null;
    socket.send({ type: 'user_message', text: clipped });
    return;
  }
  await runDemo(clipped);
}

function showCrisis(content: CrisisContent): void {
  useChatStore.getState().add({ role: 'crisis', text: content.title, crisis: content });
}

function applyTag(emotion: Emotion, gesture: Gesture): void {
  useAvatarStore.getState().setEmotion(emotion);
  avatarController.playGesture(gesture);
}

async function finishReply(
  id: string,
  text: string,
  emotion: Emotion,
  gesture: Gesture,
): Promise<void> {
  const chat = useChatStore.getState();
  chat.patch(id, { text, emotion, gesture, streaming: false });
  chat.set({ pending: false });
  if (chat.voiceOn) {
    useAvatarStore.getState().setActivity('hablando');
    await speak(text);
  }
  if (useAvatarStore.getState().activity !== 'respirando')
    useAvatarStore.getState().setActivity('reposo');
}

async function runDemo(text: string): Promise<void> {
  const crisis = detectCrisis(text);
  if (crisis) showCrisis(CRISIS);
  const full = crisis ? CRISIS_DEMO_REPLY : demoReply(text);

  abort = new AbortController();
  const parser = new StreamingTagParser();
  const id = useChatStore.getState().add({ role: 'assistant', text: '', streaming: true });
  let acc = '';
  for await (const chunk of streamDemo(full, abort.signal)) {
    const { tag, text: out } = parser.push(chunk);
    if (tag) {
      applyTag(crisis ? 'preocupacion' : tag.emotion, tag.gesture);
      useAvatarStore.getState().setActivity('hablando');
    }
    if (out) {
      acc += out;
      useChatStore.getState().patch(id, { text: acc });
      if (!useChatStore.getState().voiceOn) avatarController.talk(out.length * 55);
    }
  }
  const emotion: Emotion = crisis ? 'preocupacion' : (parser.tag?.emotion ?? 'calma');
  await finishReply(id, acc, emotion, parser.tag?.gesture ?? 'ninguno');
}

function onServerEvent(e: ServerEvent): void {
  const chat = useChatStore.getState();
  switch (e.type) {
    case 'crisis':
      showCrisis({
        title: e.title,
        body: e.body,
        lines: e.lines.map((l) => {
          const [number, ...rest] = l.split(':');
          return { number: number.trim(), label: rest.join(':').trim() };
        }),
        closing: CRISIS.closing,
      });
      break;
    case 'reply_start':
      liveReplyId = chat.add({ role: 'assistant', text: '', streaming: true });
      applyTag(e.emotion, e.gesture);
      useAvatarStore.getState().setActivity('hablando');
      break;
    case 'reply_delta': {
      if (!liveReplyId) liveReplyId = chat.add({ role: 'assistant', text: '', streaming: true });
      const prev = chat.messages.find((m) => m.id === liveReplyId)?.text ?? '';
      chat.patch(liveReplyId, { text: prev + e.text });
      if (!chat.voiceOn) avatarController.talk(e.text.length * 55);
      break;
    }
    case 'reply_done':
      if (liveReplyId) void finishReply(liveReplyId, e.text, e.emotion, e.gesture);
      liveReplyId = null;
      break;
    case 'tts':
      // Fase 3: audio de Azure con visemas. Por ahora se usa la voz del navegador.
      break;
    case 'error':
      chat.add({
        role: 'notice',
        text: 'Tuve un problema para responder. ¿Me lo repites en un momento?',
      });
      chat.set({ pending: false });
      useAvatarStore.getState().setActivity('reposo');
      break;
  }
}
