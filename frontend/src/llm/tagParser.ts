import { EMOTIONS, GESTURES, type Emotion, type Gesture } from '../types';
import { normalize } from '../safety/crisis';

const TAG_RE = /^\s*\[\s*([a-z]+)\s*\|\s*([a-z]+)\s*\]\s*/;

export interface ParsedTag {
  emotion: Emotion;
  gesture: Gesture;
  valid: boolean;
}

export function parseTag(raw: string): { tag: ParsedTag; rest: string } {
  const m = TAG_RE.exec(normalize(raw.slice(0, 64)));
  if (!m) return { tag: { emotion: 'calma', gesture: 'ninguno', valid: false }, rest: raw.trimStart() };
  const emotion = (EMOTIONS as readonly string[]).includes(m[1]) ? (m[1] as Emotion) : null;
  const gesture = (GESTURES as readonly string[]).includes(m[2]) ? (m[2] as Gesture) : null;
  // La normalización no cambia la longitud del prefijo ASCII de la etiqueta.
  const rest = raw.slice(raw.indexOf(']') + 1).trimStart();
  return {
    tag: { emotion: emotion ?? 'calma', gesture: gesture ?? 'ninguno', valid: !!emotion && !!gesture },
    rest,
  };
}

/** Acumula fragmentos en streaming y no libera texto hasta cerrar la etiqueta. */
export class StreamingTagParser {
  private buffer = '';
  private done = false;
  tag: ParsedTag | null = null;

  push(chunk: string): { tag: ParsedTag | null; text: string } {
    if (this.done) return { tag: null, text: chunk };
    this.buffer += chunk;
    const trimmed = this.buffer.trimStart();
    const closes = trimmed.indexOf(']');
    if (trimmed.startsWith('[') && closes === -1 && trimmed.length < 64) return { tag: null, text: '' };
    this.done = true;
    const { tag, rest } = parseTag(this.buffer);
    this.tag = tag;
    return { tag, text: rest };
  }
}
