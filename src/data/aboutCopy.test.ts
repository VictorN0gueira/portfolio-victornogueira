// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { SITE } from '../lib/site';
import { aboutCopy } from './aboutCopy';
import { faqs } from './faqs';
import { processSteps } from './process';

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

/** Every string of the module, in order. */
function stringsOf(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(stringsOf);
  if (value && typeof value === 'object') return Object.values(value).flatMap(stringsOf);
  return [];
}

const texts = stringsOf(aboutCopy);
// What the site already says in public: the facts the copy of this page is made of.
const PUBLIC_TEXT = [SITE.description, ...faqs.map((faq) => faq.answer), ...processSteps.map((step) => `${step.duration} ${step.description}`)].join(' ');
// The only number: the 30 minute conversation (SITE, the FAQ and the closing band of the page say it).
const ALLOWED_NUMBERS = new Set(['30']);

describe('aboutCopy', () => {
  it('has strings, and none of them is empty', () => {
    expect(texts.length).toBeGreaterThan(10);
    expect(texts.filter((text) => text.trim() === '')).toEqual([]);
  });

  it('has no em dash, no en dash and no " / " separator', () => {
    expect(texts.filter((text) => text.includes(EM_DASH) || text.includes(EN_DASH) || text.includes(' / '))).toEqual([]);
  });

  it('never says "chatbot": the company sells AI agents', () => {
    expect(texts.filter((text) => /chat[\s-]?bot/i.test(text))).toEqual([]);
  });

  it('has no price and no percentage', () => {
    expect(texts.filter((text) => /R\$|\d\s*%/.test(text))).toEqual([]);
  });

  it('has no number that the site does not already say: only the 30 minute conversation', () => {
    const numbers = texts.flatMap((text) => text.match(/\d+/g) ?? []);

    expect(numbers.filter((number) => !ALLOWED_NUMBERS.has(number))).toEqual([]);
    expect(PUBLIC_TEXT).toContain('30 minutos');
  });

  it('says "a gente" and never "nós" or a verb in the first person plural', () => {
    expect(texts.filter((text) => /(?<!\p{L})(nós|\p{L}{2,}amos)(?!\p{L})/iu.test(text))).toEqual([]);
    expect(aboutCopy.company.paragraphs[1]).toMatch(/^A gente /);
  });

  it('describes the work with facts of data/process.ts and data/faqs.ts: weekly cycles, partial deliveries, monitoring and documentation', () => {
    expect(PUBLIC_TEXT).toMatch(/ciclos semanais/);
    expect(PUBLIC_TEXT).toMatch(/entregas parciais/);
    expect(PUBLIC_TEXT).toMatch(/monitoramento e documentação/);
    expect(aboutCopy.company.how.map((row) => row.title)).toEqual(['Ciclos semanais', 'Entregas parciais', 'No ar com suporte']);
  });

  it('keeps the closing band as it was before the redesign, with a WhatsApp message that names the site', () => {
    expect(aboutCopy.cta.heading).toBe('Pronto para automatizar?');
    expect(aboutCopy.cta.label).toBe('Vamos conversar');
    expect(aboutCopy.cta.whatsappMessage).toMatch(/^Olá! Vim pelo site da VN One/);
  });
});
