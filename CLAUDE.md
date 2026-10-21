# Gabi · acompañante virtual de bienestar emocional

Fuente de verdad: docs/LIA_SPEC.pdf (el producto se llama **Gabi**, no Lía; ver docs/NOTAS.md).
Referencia visual del avatar: docs/reference/gabi-referencia.jpg (uso autorizado por Gabi, fuera de git).

## Reglas que nunca se rompen
- Gabi es una IA de acompañamiento, no terapeuta. Nada de diagnósticos ni medicamentos.
- El protocolo de crisis corre en el backend antes del LLM y su mensaje es fijo.
- El botón "Ayuda urgente" funciona sin conexión.
- Ningún secreto en el frontend ni en git. Todo en .env.
- Nunca registrar el texto de los mensajes en logs. Contenido cifrado en la base.

## Comandos
- make dev -> backend en :8000 y frontend en :5173
- make test -> pytest + vitest
- make check -> ruff, mypy, eslint, tsc
- make up / make down -> docker compose

## Convenciones
- Python: tipado estricto, funciones pequeñas, pydantic para esquemas.
- TypeScript: componentes funcionales, estado en zustand, sin any.
- Textos de la interfaz en español de Colombia, tuteo, cálidos y claros.
- Commits en español con prefijos feat, fix, chore, test, docs.
- Trabaja por fases (sección 13 del PDF) y detente al terminar cada una.
