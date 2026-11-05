// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { servicesCopy } from './servicesCopy';

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);
const DASH_PATTERN = new RegExp(`[${EM_DASH}${EN_DASH}]`);
const SLASH_SEPARATOR = / \/ /;
const PRICE_PATTERN = /R\$/;
const PERCENT_PATTERN = /\d+\s*%/;
const SALES_WORDS = new RegExp(
  [
    'revolucion',
    'potencializ',
    'desbloque',
    'jornada',
    'inova(dor|ç)',
    '\\btransforma',
    'alavanc',
    'ecossistema',
    'sinergia',
    '\\bescal(ar|e|am|ável)\\b',
    'robust',
    'modern[ao]s?\\b',
  ].join('|'),
  'i',
);
const CHATBOT = /chat[\s-]?bot/i;

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap(collectStrings);
  return [];
}

describe('servicesCopy', () => {
  const strings = collectStrings(servicesCopy);

  it('has text in every field', () => {
    expect(strings.length).toBeGreaterThan(8);
    for (const text of strings) expect(text.trim(), text).not.toBe('');
  });

  it('uses no em dash, no en dash and no " / " separator', () => {
    for (const text of strings) {
      expect(text, text).not.toMatch(DASH_PATTERN);
      expect(text, text).not.toMatch(SLASH_SEPARATOR);
    }
  });

  it('carries no price, no percentage and no sales word, and never says chatbot', () => {
    for (const text of strings) {
      expect(text, text).not.toMatch(PRICE_PATTERN);
      expect(text, text).not.toMatch(PERCENT_PATTERN);
      expect(text, text).not.toMatch(SALES_WORDS);
      expect(text, text).not.toMatch(CHATBOT);
    }
  });

  it('does not promise a discount in the combos kicker', () => {
    expect(servicesCopy.combos.kicker).not.toMatch(/desconto/i);
  });

  it('keeps the closing invitation in the informal imperative', () => {
    expect(servicesCopy.cta.label).toBe('Agenda uma consulta gratuita');
    expect(servicesCopy.cta.whatsappMessage).toMatch(/^Olá!/);
  });
});
