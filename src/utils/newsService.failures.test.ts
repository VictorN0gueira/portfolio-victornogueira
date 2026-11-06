import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse } from '../test/news';
import { getNewsArticles } from './newsService';

const CACHE_KEY = 'blog_news_cache';
const SUPABASE_HOST = 'db.vnone.com.br';

// DB row format: what readSupabaseArticles receives from the Supabase PostgREST endpoint.
function supabaseRow(title: string): Record<string, unknown> {
  return {
    title,
    summary: 'Resumo',
    url: `https://example.com/${encodeURIComponent(title)}`,
    image: '',
    published_at: new Date().toISOString(),
    source: 'Fonte',
    language: 'pt',
  };
}

// NewsArticle shape stored in and read from the browser cache.
function cachedArticle(title: string): Record<string, unknown> {
  return {
    title,
    description: 'Resumo',
    url: `https://example.com/${encodeURIComponent(title)}`,
    image: '',
    publishedAt: new Date().toISOString(),
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

/** Every request goes to the handler of its host: Supabase, dev.to and TabNews. Nothing reaches the network. */
function stubSources(handlers: { supabase: Handler; devTo: Handler; tabNews: Handler }): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const address = String(input);
      if (address.includes(SUPABASE_HOST)) return handlers.supabase(address);
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
      supabase: () => jsonResponse([supabaseRow('Do supabase')]),
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
      JSON.stringify({ articles: [cachedArticle('Do cache')], timestamp: Date.now(), source: 'cache' }),
    );
    stubSources({ supabase: offline(), devTo: offline(), tabNews: offline() });

    const result = await getNewsArticles();

    expect(result.origin).toBe('browser-cache');
    expect('failures' in result).toBe(false);
  });

  it('records the status of Supabase when it answers with an error, and still answers from the next source', async () => {
    stubSources({ supabase: down(502), devTo: () => jsonResponse([devToItem('Dev A')]), tabNews: down() });

    const result = await getNewsArticles();

    expect(result.articles.map((item) => item.title)).toEqual(['Dev A']);
    expect(result.origin).toBe('live');
    expect(result.failures).toContainEqual({ source: 'supabase', reason: 'Supabase error: 502' });
  });

  it('records the cause when Supabase cannot be reached at all', async () => {
    stubSources({ supabase: offline(), devTo: () => jsonResponse([devToItem('Dev A')]), tabNews: down() });

    const result = await getNewsArticles();

    expect(result.failures).toContainEqual({ source: 'supabase', reason: 'Failed to fetch' });
  });

  it('records that Supabase answered with no article', async () => {
    stubSources({
      supabase: () => jsonResponse([]),
      devTo: () => jsonResponse([devToItem('Dev A')]),
      tabNews: down(),
    });

    const result = await getNewsArticles();

    expect(result.failures).toContainEqual({
      source: 'supabase',
      reason: 'Supabase returned no articles',
    });
  });

  it('records the feed that failed when the other one answers, so TabNews can fail without hiding it', async () => {
    stubSources({ supabase: down(), devTo: () => jsonResponse([devToItem('Dev A')]), tabNews: down(500) });

    const result = await getNewsArticles();

    expect(result.articles).toHaveLength(1);
    expect(result.failures).toContainEqual({ source: 'tabnews', reason: 'TabNews error: 500' });
    expect(result.failures?.map((failure) => failure.source)).not.toContain('devto');
  });

  it('records dev.to when it is the one that fails', async () => {
    stubSources({ supabase: down(), devTo: offline(), tabNews: () => jsonResponse([tabNewsItem()]) });

    const result = await getNewsArticles();

    expect(result.articles.map((item) => item.title)).toEqual(['IA no trabalho']);
    expect(result.failures).toContainEqual({ source: 'devto', reason: 'No articles from Dev.to' });
  });

  it('records every source, and the fixed list is still what answers, when all of them fail', async () => {
    stubSources({ supabase: down(), devTo: offline(), tabNews: offline() });

    const result = await getNewsArticles();

    expect(result.origin).toBe('fallback');
    expect(result.articles.length).toBeGreaterThan(0);
    expect(result.failures?.map((failure) => failure.source)).toEqual(['supabase', 'devto', 'tabnews', 'public-apis']);
    expect(result.failures?.find((failure) => failure.source === 'tabnews')?.reason).toBe('Failed to fetch');
    expect(result.failures?.find((failure) => failure.source === 'public-apis')?.reason).toBe('All public APIs failed');
  });

  it('records a cache that cannot be read, drops it, and goes on to the sources', async () => {
    localStorage.setItem(CACHE_KEY, 'this is not json');
    stubSources({ supabase: () => jsonResponse([supabaseRow('Do supabase')]), devTo: down(), tabNews: down() });

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
    stubSources({ supabase: () => jsonResponse([supabaseRow('Do supabase')]), devTo: down(), tabNews: down() });

    const result = await getNewsArticles();

    expect(result.articles.map((item) => item.title)).toEqual(['Do supabase']);
    expect(result.failures).toContainEqual({ source: 'cache-write', reason: 'quota' });
  });

  it('records a TabNews address that is not an address, and still shows the article', async () => {
    stubSources({
      supabase: down(),
      devTo: down(),
      tabNews: () => jsonResponse([tabNewsItem({ source_url: 'not an address' })]),
    });

    const result = await getNewsArticles();

    expect(result.articles.map((item) => item.title)).toEqual(['IA no trabalho']);
    expect(result.failures?.map((failure) => failure.source)).toContain('tabnews');
    expect(result.failures?.find((failure) => failure.source === 'tabnews')?.reason).toMatch(/invalid url/i);
  });

  it('records the TabNews addresses that are not addresses once, with a count, not once per article', async () => {
    const items = Array.from({ length: 6 }, (_, index) =>
      tabNewsItem({ slug: `s${index}`, title: `IA numero ${index}`, source_url: 'not an address' }),
    );
    stubSources({ supabase: down(), devTo: down(), tabNews: () => jsonResponse(items) });

    const result = await getNewsArticles();

    expect(result.articles).toHaveLength(6);
    const notes = result.failures?.filter((failure) => failure.source === 'tabnews') ?? [];
    expect(notes).toHaveLength(1);
    expect(notes[0].count).toBe(6);
  });

  it('records a cache that cannot be read once, even when it cannot be removed either', async () => {
    localStorage.setItem(CACHE_KEY, 'this is not json');
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    stubSources({ supabase: () => jsonResponse([supabaseRow('Do supabase')]), devTo: down(), tabNews: down() });

    const result = await getNewsArticles();

    expect(result.failures?.filter((failure) => failure.source === 'cache')).toHaveLength(1);
  });

  it('keeps the data: the fixed list and the answers are what they were, with the field added beside them', async () => {
    stubSources({ supabase: down(), devTo: down(), tabNews: down() });

    const result = await getNewsArticles();

    expect(Object.keys(result).sort()).toEqual(['articles', 'failures', 'origin', 'source']);
    expect(result.source).toBe('fallback');
  });
});

describe('getNewsArticles when the visitor asks for a refresh', () => {
  const SAVED = [cachedArticle('Da lista salva')];

  function saveList(timestamp: number): void {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ articles: SAVED, timestamp, source: 'supabase' }));
  }

  it('asks the sources even though the saved list is still valid', async () => {
    saveList(Date.now());
    stubSources({ supabase: () => jsonResponse([supabaseRow('Da fonte')]), devTo: down(), tabNews: down() });

    const result = await getNewsArticles({ forceRefresh: true });

    expect(result.origin).toBe('live');
    expect(result.articles.map((item) => item.title)).toEqual(['Da fonte']);
  });

  it('keeps the saved list, and says so, when every source fails: the fixed list does not replace it', async () => {
    saveList(Date.now());
    stubSources({ supabase: down(), devTo: offline(), tabNews: offline() });

    const result = await getNewsArticles({ forceRefresh: true });

    expect(result.origin).toBe('stale-browser-cache');
    expect(result.articles.map((item) => item.title)).toEqual(['Da lista salva']);
    expect(localStorage.getItem(CACHE_KEY)).not.toBeNull();
  });

  it('is the fixed list only when there is no saved list at all', async () => {
    stubSources({ supabase: down(), devTo: offline(), tabNews: offline() });

    const result = await getNewsArticles({ forceRefresh: true });

    expect(result.origin).toBe('fallback');
  });

  it('still answers from a valid saved list when the visitor did not ask for a refresh', async () => {
    saveList(Date.now());
    stubSources({ supabase: offline(), devTo: offline(), tabNews: offline() });

    expect((await getNewsArticles()).origin).toBe('browser-cache');
  });
});
