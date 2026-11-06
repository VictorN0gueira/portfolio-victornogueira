import type { NewsArticle } from '../../utils/newsService';

/** An article for the tests of the blog parts. The dates, the cover and the text are overridable. */
export function testArticle(overrides: Partial<NewsArticle> = {}): NewsArticle {
  return {
    title: 'Artigo de teste',
    description: 'Resumo do artigo',
    url: 'https://example.com/artigo',
    image: 'https://images.unsplash.com/photo-1?w=800',
    publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    source: { name: 'Fonte', url: 'https://example.com' },
    language: 'pt',
    ...overrides,
  };
}
