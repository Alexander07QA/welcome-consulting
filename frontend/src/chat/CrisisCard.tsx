import type { CrisisContent } from '../safety/crisis';

const tel = (n: string) => `tel:${n.replace(/\D.*$/, '').replace(/\D/g, '')}`;

export function CrisisCard({ content, onClose }: { content: CrisisContent; onClose?: () => void }) {
  return (
    <section className="crisis" role="alert" aria-live="assertive">
      <p>
        <strong>{content.title}</strong> {content.body}
      </p>
      <ul>
        {content.lines.map((l) => (
          <li key={l.number}>
            <a href={tel(l.number)}>
              <strong>{l.number}</strong>
            </a>
            : {l.label}
          </li>
        ))}
      </ul>
      <p>{content.closing}</p>
      {onClose && (
        <button className="btn ghost" onClick={onClose}>
          Cerrar
        </button>
      )}
    </section>
  );
}
