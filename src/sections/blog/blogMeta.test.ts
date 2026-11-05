import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NewsArticle } from '../../utils/newsService';
import {
  NEW_TAB_HINT_ID,
  cardDescribedBy,
  describeDataSource,
  estimateReadTime,
  getCategoryTag,
  isNew,
} from './blogMeta';

function article(overrides: Partial<NewsArticle> = {}): NewsArticle {
  return {
    title: 'Um artigo',
    description: 'Um resumo',
    url: 'https://example.com/a',
    image: '',
    publishedAt: new Date().toISOString(),
    source: { name: 'Fonte', url: 'https://example.com' },
    language: 'pt',
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('describeDataSource', () => {
  it.each([
    ['live', 'Lista carregada agora'],
    ['browser-cache', 'Lista salva neste navegador'],
    ['stale-browser-cache', 'As fontes não responderam. Esta é a última lista salva neste navegador.'],
    ['fallback', 'As fontes não responderam. Esta é uma lista fixa de artigos.'],
  ] as const)('words the origin %s by what the browser did', (origin, text) => {
    expect(describeDataSource(origin)).toBe(text);
  });
});

describe('isNew', () => {
  it('is true inside six hours and false from six hours on', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-01T12:00:00Z'));

    expect(isNew('2026-11-01T06:00:01Z')).toBe(true);
    expect(isNew('2026-11-01T06:00:00Z')).toBe(false);
    expect(isNew('2026-10-30T12:00:00Z')).toBe(false);
  });

  it('is false for a date that is not a date, so a bad value never says new', () => {
    expect(isNew('')).toBe(false);
    expect(isNew('ontem')).toBe(false);
  });
});

describe('estimateReadTime', () => {
  it('never says less than 1 minute', () => {
    expect(estimateReadTime(article({ title: 'Curto', description: '' }))).toBe('1 min');
  });

  it('counts the words of the title and the summary at 200 a minute', () => {
    const description = Array.from({ length: 600 }, () => 'palavra').join(' ');

    expect(estimateReadTime(article({ title: 'Titulo', description }))).toBe('3 min');
  });
});

describe('getCategoryTag', () => {
  it('names the language and the topic of the article', () => {
    expect(getCategoryTag(article({ language: 'en', title: 'Autonomous agent loop' }))).toEqual({
      langLabel: 'English',
      topicLabel: 'Agentes',
      topicIcon: 'bot',
    });
  });

  it('uses the bolt for automation and n8n, and the robot for the rest', () => {
    expect(getCategoryTag(article({ title: 'Workflow n8n' })).topicIcon).toBe('zap');
    expect(getCategoryTag(article({ title: 'Automação de processos' })).topicIcon).toBe('zap');
    expect(getCategoryTag(article({ title: 'Outro tema', description: '' }))).toMatchObject({
      langLabel: 'Português',
      topicLabel: 'IA',
      topicIcon: 'bot',
    });
  });
});

describe('cardDescribedBy', () => {
  it('lists the ids that exist and always ends with the new tab hint', () => {
    expect(cardDescribedBy('a', 'b')).toBe(`a b ${NEW_TAB_HINT_ID}`);
  });

  it('drops the ids that are false', () => {
    expect(cardDescribedBy('a', false, 'c')).toBe(`a c ${NEW_TAB_HINT_ID}`);
    expect(cardDescribedBy()).toBe(NEW_TAB_HINT_ID);
  });
});
