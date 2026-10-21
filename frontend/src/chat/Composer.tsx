import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useChatStore } from '../store/chatStore';
import { useAvatarStore } from '../store/avatarStore';
import { cancelReply, sendMessage } from '../services/conversation';

export function Composer() {
  const [text, setText] = useState('');
  const pending = useChatStore((s) => s.pending);
  const setActivity = useAvatarStore((s) => s.setActivity);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || pending) return;
    void sendMessage(text);
    setText('');
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form className="composer" onSubmit={submit}>
      <label className="sr-only" htmlFor="msg">
        Escríbele a Gabi
      </label>
      <textarea
        id="msg"
        rows={1}
        value={text}
        maxLength={5000}
        placeholder="Escribe lo que sientes…"
        onChange={(e) => {
          setText(e.target.value);
          if (!pending) setActivity('escuchando');
        }}
        onBlur={() => !pending && setActivity('reposo')}
        onKeyDown={onKey}
      />
      {pending ? (
        <button type="button" className="btn ghost" onClick={cancelReply}>
          Detener
        </button>
      ) : (
        <button type="submit" className="btn primary" disabled={!text.trim()}>
          Enviar
        </button>
      )}
    </form>
  );
}
