# Gabi · consultorio 3D

Acompañante virtual de bienestar emocional en un consultorio 3D. Especificación: `docs/LIA_SPEC.pdf`
(el personaje se llama **Gabi**; ver `docs/NOTAS.md`).

> Gabi es una inteligencia artificial. No reemplaza a un profesional de salud mental.

## Probarlo en local

```bash
# Frontend (consultorio 3D + chat)
cd frontend
npm install
npm run dev          # http://localhost:5173

# Backend (Fase 0: solo /api/health)
cd backend
python -m venv .venv
.venv/Scripts/pip install -e ".[dev]"     # en Linux/macOS: .venv/bin/pip
.venv/Scripts/uvicorn app.main:app --reload --port 8000
```

Sin el backend de la Fase 1, el chat funciona en **modo demostración** (respuestas de ejemplo,
marcado en pantalla). El botón **Ayuda urgente** funciona siempre, incluso sin conexión.

## Qué hay en el consultorio

- Habitación amplia (~9 × 8 m): zona de conversación con el sillón de Gabi, mesa auxiliar con taza
  humeante, pañuelos y libreta; lámpara de pie; biblioteca; cuadro; reloj con la hora real; escritorio
  con repisas; rincón de lectura con sofá, mesa de centro y vela; plantas; ventana lateral con cortinas.
- Luz de tarde (sol por la ventana, sombras suaves y polvo flotando en el haz) y de noche (luna, lámparas
  encendidas). Sigue el tema del sistema y se puede cambiar a mano.
- Tres vistas de cámara: **Frente** (a la altura de los ojos de quien está sentado), **Cerca** y **Amplia**;
  paralaje con el puntero y encuadre más cerrado en celular.
- Gabi: avatar provisional con sus rasgos (cabello largo ondulado con balayage miel, ojos café, sonrisa
  amplia, aretes y collares dorados con perla, camisa blanca sobre top verde salvia, jean). Respira,
  parpadea, sigue el puntero con la mirada, cambia de expresión según la etiqueta `[emocion|gesto]`,
  asiente, inclina la cabeza y mueve la boca al hablar. Respeta `prefers-reduced-motion`.
- Respiración guiada 4·4·6 (3 ciclos) con círculo guía y el pecho de Gabi sincronizado.
- Consentimiento informado, aviso de IA permanente y “Borrar mis datos”.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `make dev` | backend en :8000 y frontend en :5173 |
| `make test` | pytest + vitest |
| `make check` | ruff, mypy, eslint, tsc |
| `make up` / `make down` | docker compose (db, backend, frontend) |

## Estado por fases

- [x] Fase 0 · base del repositorio
- [x] Fase 2 (parcial) · escena 3D, avatar provisional y chat (conectado al contrato WebSocket; demo local mientras no hay backend)
- [x] Fase 4 (parcial, frontend) · respiración, consentimiento, borrar datos, tarde/noche
- [ ] Fase 1 · backend de conversación y protocolo de crisis
- [ ] Fase 3 · voz de Azure con visemas (hoy hay respaldo con la voz del navegador)
- [ ] Fase 5 · modelo GLB de Gabi
- [ ] Fase 6 · despliegue en el VPS
