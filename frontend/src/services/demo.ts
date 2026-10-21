import { normalize } from '../safety/crisis';

// Respuestas de ejemplo para ver al avatar sin backend. No usan LLM y se marcan como demo.
interface Rule {
  test: RegExp;
  reply: string;
}

const RULES: Rule[] = [
  // Primero: nunca orientar sobre medicamentos, aunque el mensaje hable de sueño.
  {
    test: /pastilla|medicament|remedio|dosis|receta/,
    reply:
      '[preocupacion|ninguno] Sobre medicamentos no te puedo orientar; eso lo debe revisar un profesional de la salud que conozca tu caso. Lo que sí puedo es acompañarte con algunas ideas para descansar mejor, si te sirve.',
  },
  {
    test: /ansios|ansiedad|nervios|estres|angusti|panico|acelerad/,
    reply:
      '[empatia|respirar] Sentir ansiedad sin saber bien de dónde viene puede ser muy desconcertante, y qué bueno que lo estés contando. Si quieres, hacemos una respiración guiada 4·4·6 para que el cuerpo baje un poquito el ritmo.',
  },
  {
    test: /dormir|duermo|sueno|insomnio|desvelo|cansad/,
    reply:
      '[escucha|asentir] Dormir mal desgasta muchísimo; se nota en todo el día. Cuéntame un poco más: ¿qué suele pasar por tu mente cuando te acuestas?',
  },
  {
    test: /psicolog|terapeuta|eres real|eres humana|eres una ia|eres un robot|quien eres/,
    reply:
      '[calma|inclinar] Buena pregunta. Soy Gabi, una inteligencia artificial de acompañamiento emocional; no soy psicóloga ni terapeuta. Puedo escucharte y, si lo necesitas, ayudarte a pensar cómo buscar a un profesional.',
  },
  {
    test: /gracias|me siento mejor|ya estoy mejor|me ayudo/,
    reply:
      '[alegria|asentir] Me alegra mucho leer eso. Gracias a ti por darte este espacio; aquí voy a estar cuando quieras volver.',
  },
  {
    test: /triste|llor|sol[ao]\b|vacio|desanim|deprim/,
    reply:
      '[empatia|inclinar] Lamento que te estés sintiendo así; tiene sentido que pese. No tienes que tenerlo todo resuelto ahora. ¿Qué es lo que más te ha dolido hoy?',
  },
  {
    test: /trabajo|jefe|estudi|universidad|examen|plata|deuda/,
    reply:
      '[escucha|asentir] Suena a que tienes bastante presión encima. A veces ayuda ponerle nombre a lo que más carga. ¿Qué parte de todo eso te está quitando más energía?',
  },
  {
    test: /desahog|hablar|contarte/,
    reply:
      '[escucha|asentir] Aquí estoy, sin afán y sin juicios. Cuéntame lo que quieras, por donde te salga más fácil empezar.',
  },
  {
    test: /^(hola|buenas|buenos|holi|que mas)/,
    reply:
      '[alegria|asentir] ¡Hola! Qué bueno que viniste. Tómate tu tiempo, aquí puedes hablar a tu ritmo. ¿Cómo llegas hoy?',
  },
];

const FALLBACK = [
  '[reflexion|inclinar] Gracias por contármelo. Me quedo pensando en lo que dices… ¿Cómo se siente eso en tu cuerpo ahora mismo?',
  '[empatia|asentir] Te entiendo; no es poca cosa lo que estás cargando. ¿Qué te gustaría que fuera distinto esta semana?',
  '[escucha|inclinar] Te sigo. ¿Qué fue lo que más te movió de todo eso?',
];

export const CRISIS_DEMO_REPLY =
  '[preocupacion|ninguno] Gracias por decírmelo; lo que sientes importa mucho y no tienes que atravesarlo sin compañía. Por favor, habla ya mismo con una de las líneas que te muestro o con alguien de confianza. Aquí sigo contigo.';

let fallbackIdx = 0;

export function demoReply(text: string): string {
  const t = normalize(text);
  const rule = RULES.find((r) => r.test.test(t));
  if (rule) return rule.reply;
  return FALLBACK[fallbackIdx++ % FALLBACK.length];
}

/** Simula el streaming en fragmentos pequeños. */
export async function* streamDemo(full: string, signal: AbortSignal): AsyncGenerator<string> {
  await wait(650, signal);
  let i = 0;
  while (i < full.length && !signal.aborted) {
    const n = 2 + Math.floor(Math.random() * 5);
    yield full.slice(i, i + n);
    i += n;
    await wait(28 + Math.random() * 30, signal);
  }
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const id = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(id);
      resolve();
    });
  });
}
