// Copia local del protocolo de crisis (sección 9). En producción la detección corre en el
// backend antes del LLM; aquí sirve para el botón "Ayuda urgente" (sin conexión) y el modo demo.

export interface CrisisLine {
  number: string;
  label: string;
}

export interface CrisisContent {
  title: string;
  body: string;
  lines: CrisisLine[];
  closing: string;
}

export const CRISIS: CrisisContent = {
  title: 'Si estás en peligro o piensas en hacerte daño.',
  body: 'No tienes que pasar por esto sin compañía. Habla ahora con una persona:',
  lines: [
    { number: '123', label: 'línea de emergencias (todo Colombia)' },
    { number: '192, opción 4', label: 'orientación en salud mental, Ministerio de Salud' },
    { number: '106', label: 'línea de escucha y apoyo emocional en Bogotá' },
  ],
  closing: 'Si puedes, busca también a alguien de confianza y no te quedes a solas.',
};

const PATTERNS: RegExp[] = [
  /suicid/,
  /matarme/,
  /quitarme la vida/,
  /no quiero vivir/,
  /no quiero seguir viviendo/,
  /quiero morir/,
  /me quiero morir/,
  /hacerme da(n)?o/,
  /cortarme/,
  /autolesi/,
  /acabar con todo/,
  /desaparecer para siempre/,
  /me van a matar/,
  /me estan pegando/,
  /me pega\b/,
  /abus(a|an|o) de mi\b/,
];

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function detectCrisis(text: string): boolean {
  const t = normalize(text);
  return PATTERNS.some((p) => p.test(t));
}
