import { describe, expect, it } from 'vitest';
import { testArticle } from './articleFixtures';
import { filterArticles } from './useBlogFilters';

const ARTICLES = [
  testArticle({ title: 'Workflow n8n', description: 'Resumo um', url: 'https://example.com/1', language: 'pt' }),
  testArticle({
    title: 'Autonomous agent loop',
    description: 'An English summary',
    url: 'https://example.com/2',
    language: 'en',
  }),
  testArticle({ title: 'Outro tema', description: 'Fala de N8N tambem', url: 'https://example.com/3', language: 'pt' }),
];
const NONE = { language: 'all', category: 'all', query: '' } as const;

const titles = (articles: ReturnType<typeof filterArticles>) => articles.map((article) => article.title);

describe('filterArticles', () => {
  it('keeps every article when no filter is on, in the order they came', () => {
    expect(titles(filterArticles(ARTICLES, NONE))).toEqual(['Workflow n8n', 'Autonomous agent loop', 'Outro tema']);
  });

  it('filters by language', () => {
    expect(titles(filterArticles(ARTICLES, { ...NONE, language: 'en' }))).toEqual(['Autonomous agent loop']);
  });

  it('filters by the topic of the article', () => {
    expect(titles(filterArticles(ARTICLES, { ...NONE, category: 'agentes' }))).toEqual(['Autonomous agent loop']);
  });

  it('searches the title and the summary, whatever the case', () => {
    expect(titles(filterArticles(ARTICLES, { ...NONE, query: 'n8n' }))).toEqual(['Workflow n8n', 'Outro tema']);
  });

  it('puts the filters together', () => {
    expect(filterArticles(ARTICLES, { language: 'en', category: 'all', query: 'workflow' })).toEqual([]);
  });
});
