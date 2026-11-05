import { describe, expect, it } from 'vitest';
import { CAT_LABELS, LANG_LABELS, blogCopy, countLabel } from './blogCopy';

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

function stringsOf(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (typeof value === 'object' && value !== null) return Object.values(value).flatMap(stringsOf);
  return [];
}

const ALL_TEXT = stringsOf([blogCopy, LANG_LABELS, CAT_LABELS]);

describe('blogCopy', () => {
  it('keeps the words that were live on the page', () => {
    expect(blogCopy.title).toBe('Leituras sobre IA e automação');
    expect(blogCopy.lead).toBe(
      'A gente junta artigos sobre inteligência artificial e automação, em português e em inglês. Dá para filtrar por idioma e por tópico.',
    );
    expect(blogCopy.thirdPartyNote).toBe('Os artigos vêm de sites de terceiros e os links levam aos sites de quem publicou.');
    expect(blogCopy.states.errorTitle).toBe('Ops! Algo deu errado');
  });

  it('has no em dash, no en dash, no slash separator and not the word chatbot', () => {
    expect(ALL_TEXT.length).toBeGreaterThan(30);
    for (const text of ALL_TEXT) {
      expect(text).not.toContain(EM_DASH);
      expect(text).not.toContain(EN_DASH);
      expect(text).not.toContain(' / ');
      expect(text).not.toMatch(/chat[\s-]?bot/i);
    }
  });

  it('has a label for every language and every topic filter', () => {
    expect(Object.keys(LANG_LABELS)).toEqual(['all', 'pt', 'en']);
    expect(Object.keys(CAT_LABELS)).toEqual(['all', 'ia', 'automação', 'n8n', 'agentes', 'llms', 'ml']);
  });
});

describe('countLabel', () => {
  it('agrees the words with the number', () => {
    expect(countLabel(0)).toBe('0 artigos encontrados');
    expect(countLabel(1)).toBe('1 artigo encontrado');
    expect(countLabel(7)).toBe('7 artigos encontrados');
  });
});
