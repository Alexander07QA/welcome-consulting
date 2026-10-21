import { useState } from 'react';

export function ConsentScreen({ onAccept }: { onAccept: () => void }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="consent-backdrop">
      <section className="consent" role="dialog" aria-modal="true" aria-labelledby="consent-title">
        <h1 id="consent-title">Te damos la bienvenida al consultorio de Gabi</h1>
        <p className="lead">
          Gabi es una <strong>inteligencia artificial</strong> de acompañamiento emocional. No es
          psicóloga ni terapeuta, no diagnostica y no reemplaza a un profesional de salud mental.
        </p>
        <ul>
          <li>
            <strong>Qué se guarda:</strong> los mensajes de esta conversación, cifrados, asociados a
            una sesión anónima. No pedimos tu nombre ni tu correo.
          </li>
          <li>
            <strong>Por cuánto tiempo:</strong> hasta 30 días sin actividad; después se borran
            automáticamente.
          </li>
          <li>
            <strong>Cómo borrarlo:</strong> en cualquier momento con el botón “Borrar mis datos”.
          </li>
          <li>
            <strong>Si estás en peligro:</strong> usa “Ayuda urgente” o llama al 123.
          </li>
        </ul>
        <p className="legal">Tratamiento de datos según la Ley 1581 de 2012 (Colombia).</p>
        <label className="check">
          <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
          Entiendo lo anterior y acepto el tratamiento de mis datos.
        </label>
        <button className="btn primary wide" disabled={!ok} onClick={onAccept}>
          Entrar al consultorio
        </button>
      </section>
    </div>
  );
}
