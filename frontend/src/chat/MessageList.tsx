import { useEffect, useRef } from 'react';
import { useChatStore } from '../store/chatStore';
import { CrisisCard } from './CrisisCard';

export function MessageList({ onBreathe }: { onBreathe: () => void }) {
  const messages = useChatStore((s) => s.messages);
  const pending = useChatStore((s) => s.pending);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages, pending]);

  const waiting = pending && !messages.some((m) => m.streaming);

  return (
    <div className="messages" aria-live="polite">
      {messages.map((m) => {
        if (m.role === 'crisis' && m.crisis) return <CrisisCard key={m.id} content={m.crisis} />;
        if (m.role === 'notice')
          return (
            <p key={m.id} className="notice">
              {m.text}
            </p>
          );
        return (
          <div key={m.id} className={`bubble ${m.role}`}>
            {m.role === 'assistant' && <span className="who">Gabi</span>}
            <p>
              {m.text}
              {m.streaming && <span className="caret" aria-hidden />}
            </p>
            {m.role === 'assistant' && m.gesture === 'respirar' && !m.streaming && (
              <button className="btn soft small" onClick={onBreathe}>
                Hacer la respiración guiada
              </button>
            )}
          </div>
        );
      })}
      {waiting && (
        <div className="bubble assistant typing" aria-label="Gabi está pensando">
          <span />
          <span />
          <span />
        </div>
      )}
      <div ref={end} />
    </div>
  );
}
