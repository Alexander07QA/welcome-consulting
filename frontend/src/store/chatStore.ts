import { create } from 'zustand';
import type { Emotion, Gesture } from '../types';
import type { CrisisContent } from '../safety/crisis';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'crisis' | 'notice';
  text: string;
  emotion?: Emotion;
  gesture?: Gesture;
  crisis?: CrisisContent;
  streaming?: boolean;
}

export type Mode = 'live' | 'demo';

interface ChatStore {
  messages: ChatMessage[];
  pending: boolean;
  mode: Mode;
  sessionId: string | null;
  voiceOn: boolean;
  urgentOpen: boolean;
  breathingOpen: boolean;
  add(m: Omit<ChatMessage, 'id'>): string;
  patch(id: string, p: Partial<ChatMessage>): void;
  set(p: Partial<Omit<ChatStore, 'add' | 'patch' | 'set' | 'reset'>>): void;
  reset(): void;
}

let seq = 0;
const nextId = (): string => `m${Date.now().toString(36)}${(seq++).toString(36)}`;

const initial = {
  messages: [] as ChatMessage[],
  pending: false,
  mode: 'demo' as Mode,
  sessionId: null,
  voiceOn: false,
  urgentOpen: false,
  breathingOpen: false,
};

export const useChatStore = create<ChatStore>((set) => ({
  ...initial,
  add: (m) => {
    const id = nextId();
    set((s) => ({ messages: [...s.messages, { ...m, id }] }));
    return id;
  },
  patch: (id, p) =>
    set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, ...p } : m)) })),
  set: (p) => set(p),
  reset: () => set({ ...initial, messages: [] }),
}));
