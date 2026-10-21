import { describe, expect, it } from 'vitest';
import { detectCrisis } from './crisis';
import { parseTag, StreamingTagParser } from '../llm/tagParser';
import { demoReply } from '../services/demo';

describe('detectCrisis', () => {
  it.each([
    'Ya no quiero vivir',
    'me quiero morir',
    'He pensado en quitarme la vida',
    'quiero hacerme daño',
    'a veces pienso en cortarme',
    'Siento que voy a acabar con todo',
    'me están pegando en la casa',
    'Mi pareja abusa de mí',
    'pensamientos suicidas',
  ])('detecta riesgo: %s', (t) => expect(detectCrisis(t)).toBe(true));

  it.each([
    'Hoy me siento ansioso y no sé por qué',
    'Últimamente no duermo bien',
    'Me quiero desaparecer de este trabajo',
    'Gracias, ya me siento mejor',
    'Mi mamá me pegó un susto',
  ])('no bloquea: %s', (t) => expect(detectCrisis(t)).toBe(false));
});

describe('parseTag', () => {
  it('extrae emoción y gesto ignorando mayúsculas y tildes', () => {
    const { tag, rest } = parseTag('[Empatía|Asentir] Suena pesado.');
    expect(tag).toEqual({ emotion: 'empatia', gesture: 'asentir', valid: true });
    expect(rest).toBe('Suena pesado.');
  });

  it('usa calma|ninguno si falta la etiqueta', () => {
    const { tag, rest } = parseTag('Hola, ¿cómo estás?');
    expect(tag.emotion).toBe('calma');
    expect(tag.gesture).toBe('ninguno');
    expect(tag.valid).toBe(false);
    expect(rest).toBe('Hola, ¿cómo estás?');
  });

  it('no libera texto hasta cerrar la etiqueta en streaming', () => {
    const p = new StreamingTagParser();
    expect(p.push('[empa')).toEqual({ tag: null, text: '' });
    expect(p.push('tia|incl').text).toBe('');
    const r = p.push('inar] Te');
    expect(r.tag?.emotion).toBe('empatia');
    expect(r.text).toBe('Te');
    expect(p.push(' escucho').text).toBe(' escucho');
  });
});

describe('demoReply', () => {
  it('aclara que es una IA', () => expect(demoReply('¿Tú eres psicóloga?')).toMatch(/inteligencia artificial/));
  it('no recomienda medicamentos', () =>
    expect(demoReply('¿Qué pastilla me tomo para dormir?')).toMatch(/no te puedo orientar/));
});
