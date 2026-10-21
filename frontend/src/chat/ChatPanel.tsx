import { useChatStore } from '../store/chatStore';
import { sendMessage } from '../services/conversation';
import { MessageList } from './MessageList';
import { Composer } from './Composer';

const CHIPS = ['Hoy me siento con ansiedad', 'Últimamente no duermo bien', 'Quiero desahogarme', '¿Tú eres psicóloga?'];

export function ChatPanel({ onBreathe }: { onBreathe: () => void }) {
  const empty = useChatStore((s) => s.messages.length === 0);
  const mode = useChatStore((s) => s.mode);

  return (
    <aside className="chat" aria-label="Conversación con Gabi">
      <header className="chat-head">
        <div>
          <h2>Conversa con Gabi</h2>
          <p>Aquí puedes hablar a tu ritmo.</p>
        </div>
        {mode === 'demo' && (
          <span className="badge" title="Sin backend: respuestas de ejemplo, sin IA real">
            Modo demostración
          </span>
        )}
      </header>

      {empty ? (
        <div className="welcome">
          <p>
            Hola, soy <strong>Gabi</strong>. Estoy aquí para escucharte, sin juicios. ¿Por dónde quieres
            empezar?
          </p>
          <div className="chips">
            {CHIPS.map((c) => (
              <button key={c} className="chip" onClick={() => void sendMessage(c)}>
                {c}
              </button>
            ))}
            <button className="chip breathe" onClick={onBreathe}>
              Respirar juntos
            </button>
          </div>
        </div>
      ) : (
        <MessageList onBreathe={onBreathe} />
      )}

      <Composer />
      <p className="ai-notice">
        Gabi es una inteligencia artificial. No reemplaza a un profesional de salud mental.
      </p>
    </aside>
  );
}
