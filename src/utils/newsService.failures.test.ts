import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse } from '../test/news';
import { getNewsArticles } from './newsService';

const CACHE_KEY = 'blog_news_cache';
const EDGE_HOST = 'qpcwoioflaxiasmcdfbd.supabase.co';

function edgeArticle(title: string): Record<string, unknown> {
  return {
    title,
    description: 'Resumo',
    url: `https://example.com/${encodeURIComponent(title)}`,
    image: '',
    publishedAt: '2026-10-01T10:00:00.000Z',
    source: { name: 'Fonte', url: 'https://example.com' },
    language: 'pt',
  };
}

function devToItem(title: string): Record<string, unknown> {
  return {
    title,
    description: 'd',
    url: `https://dev.to/a/${encodeURIComponent(title)}`,
    cover_image: null,
    published_at: '2026-10-01T10:00:00Z',
    language: 'en',
    user: { name: 'Autora', website_url: null },
    organization: null,
  };
}

function tabNewsItem(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    slug: 's1',
    title: 'IA no trabalho',
    source_url: null,
    published_at: '2026-10-02T10:00:00Z',
    owner_username: 'ana',
    tabcoins: 3,
    ...overrides,
  };
}

type Handler = (address: string) => Response | Promise<Response>;

/** Every request goes to the handler of its host: the edge function, dev.to and TabNews. Nothing reaches the network. */
function stubSources(handlers: { edge: Handler; devTo: Handler; tabNews: Handler }): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const address = String(input);
      if (address.includes(EDGE_HOST)) return handlers.edge(address);
      if (address.includes('dev.to')) return handlers.devTo(address);
      if (address.includes('tabnews')) return handlers.tabNews(address);
      throw new Error(`request to an unexpected host: ${address}`);
    }),
  );
}

const down =
  (status = 503): Handler =>
  () =>
    jsonResponse({}, status);
const offline = (): Handler => () => {
  throw new TypeError('Failed to fetch');
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('getNewsArticles says why a source failed', () => {
  it('lists nothing when every source that was asked answered', async () => {
    stubSources({
      edge: () => jsonResponse({ articles: [edgeArticle('Do edge')], source: 'edge-function' }),
      devTo: down(),
      tabNews: down(),
    });

    const result = await getNewsArticles();

    expect(result.origin).toBe('live');
    expect('failures' in result).toBe(false);
  });

  it('lists nothing when the answer comes from a valid cache', async () => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ articles: [edgeArticle('Do cache')], timestamp: Date.now(), source: 'cache' }),
    );
    stubSources({ edge: offline(), devTo: offline(), tabNews: offline() });

    const result = await getNewsArticles();

    expect(result.origin).toBe('browser-cache');
    expect('failures' in result).toBe(false);
  });

  it('records the status of the edge function when it answers with an error, and still answers from the next source', async () => {
    stubSources({ edge: down(502), devTo: () => jsonResponse([devToItem('Dev A')]), tabNews: down() });

    const result = await getNewsArticles();

    expect(result.articles.map((item) => item.title)).toEqual(['Dev A']);
    expect(result.origin).toBe('live');
    expect(result.failures).toContainEqual({ source: 'edge-function', reason: 'Edge function error: 502' });
  });

  it('records the cause when the edge function cannot be reached at all', async () => {
    stubSources({ edge: offline(), devTo: () => jsonResponse([devToItem('Dev A')]), tabNews: down() });

    const result = await getNewsArticles();

    expect(result.failures).toContainEqual({ source: 'edge-function', reason: 'Failed to fetch' });
  });

  it('records that the edge function answered with no article', async () => {
    stubSources({
      edge: () => jsonResponse({ articles: [] }),
      devTo: () => jsonResponse([devToItem('Dev A')]),
      tabNews: down(),
    });

    const result = await getNewsArticles();

    expect(result.failures).toContainEqual({
      source: 'edge-function',
      reason: 'No articles returned from edge function',
    });
  });

  it('records the feed that failed when the other one answers, so TabNews can fail without hiding it', async () => {
    stubSources({ edge: down(), devTo: () => jsonResponse([devToItem('Dev A')]), tabNews: down(500) });

    const result = await getNewsArticles();

    expect(result.articles).toHaveLength(1);
    expect(result.failures).toContainEqual({ source: 'tabnews', reason: 'TabNews error: 500' });
    expect(result.failures?.map((failure) => failure.source)).not.toContain('devto');
  });

  it('records dev.to when it is the one that fails', async () => {
    stubSources({ edge: down(), devTo: offline(), tabNews: () => jsonResponse([tabNewsItem()]) });

    const result = await getNewsArticles();

    expect(result.articles.map((item) => item.title)).toEqual(['IA no trabalho']);
    expect(result.failures).toContainEqual({ source: 'devto', reason: 'No articles from Dev.to' });
  });

  it('records every source, and the fixed list is still what answers, when all of them fail', async () => {
    stubSources({ edge: down(), devTo: offline(), tabNews: offline() });

    const result = await getNewsArticles();

    expect(result.origin).toBe('fallback');
    expect(result.articles.length).toBeGreaterThan(0);
    expect(result.failures?.map((failure) => failure.source)).toEqual([
      'edge-function',
      'devto',
      'tabnews',
      'public-apis',
    ]);
    expect(result.failures?.find((failure) => failure.source === 'tabnews')?.reason).toBe('Failed to fetch');
    expect(result.failures?.find((failure) => failure.source === 'public-apis')?.reason).toBe('All public APIs failed');
  });

  it('records a cache that cannot be read, drops it, and goes on to the sources', async () => {
    localStorage.setItem(CACHE_KEY, 'this is not json');
    stubSources({ edge: () => jsonResponse({ articles: [edgeArticle('Do edge')] }), devTo: down(), tabNews: down() });

    const result = await getNewsArticles();

    expect(result.origin).toBe('live');
    expect(result.failures).toHaveLength(1);
    expect(result.failures?.[0].source).toBe('cache');
    expect(result.failures?.[0].reason).not.toBe('');
  });

  it('records a cache that cannot be written, and still answers with the articles', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    stubSources({ edge: () => jsonResponse({ articles: [edgeArticle('Do edge')] }), devTo: down(), tabNews: down() });

    const result = await getNewsArticles();

    expect(result.articles.map((item) => item.title)).toEqual(['Do edge']);
    expect(result.failures).toContainEqual({ source: 'cache-write', reason: 'quota' });
  });

  it('records a TabNews address that is not an address, and still shows the article', async () => {
    stubSources({
      edge: down(),
      devTo: down(),
      tabNews: () => jsonResponse([tabNewsItem({ source_url: 'not an address' })]),
    });

    const result = await getNewsArticles();

    expect(result.articles.map((item) => item.title)).toEqual(['IA no trabalho']);
    expect(result.failures?.map((failure) => failure.source)).toContain('tabnews');
    expect(result.failures?.find((failure) => failure.source === 'tabnews')?.reason).toMatch(/invalid url/i);
  });

  it('keeps the data: the fixed list and the answers are what they were, with the field added beside them', async () => {
    stubSources({ edge: down(), devTo: down(), tabNews: down() });

    const result = await getNewsArticles();

    expect(Object.keys(result).sort()).toEqual(['articles', 'failures', 'origin', 'source']);
    expect(result.source).toBe('fallback');
  });
});
