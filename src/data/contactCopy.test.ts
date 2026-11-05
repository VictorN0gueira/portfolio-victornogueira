// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { contactCopy } from './contactCopy';

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);
const DASH = new RegExp(`[${EM_DASH}${EN_DASH}]`);

function everyText(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (value && typeof value === 'object') return Object.values(value).flatMap(everyText);
  return [];
}

describe('contactCopy', () => {
  const texts = everyText(contactCopy);

  it('holds the words of the page: kicker, title, lead and the three channel labels', () => {
    expect(contactCopy.kicker).toBe('contato');
    expect(contactCopy.title).toBe('Conta o que você precisa');
    expect(contactCopy.lead).not.toBe('');
    expect(contactCopy.channels.email).toBe('E-mail');
    expect(contactCopy.channels.whatsapp).toBe('WhatsApp');
    expect(contactCopy.channels.location).toBe('Localização');
    expect(contactCopy.channels.locationValue).toBe('Recife e remoto');
  });

  it('uses no em dash and no en dash', () => {
    expect(texts.filter((text) => DASH.test(text))).toEqual([]);
  });

  it('writes no phone number: the number comes from lib/constants', () => {
    expect(texts.filter((text) => /\d{4}/.test(text))).toEqual([]);
  });

  it('asks in the informal imperative, without the formal "Conte" or the old word of the product', () => {
    expect(contactCopy.title).toMatch(/^Conta /);
    expect(texts.filter((text) => /(?<!\p{L})conte(?!\p{L})|chat[\s-]?bot/iu.test(text))).toEqual([]);
  });
});
