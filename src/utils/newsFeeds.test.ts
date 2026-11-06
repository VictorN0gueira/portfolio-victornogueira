import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse } from '../test/news';
import { getNewsArticles } from './newsService';

function stubFeeds(tabNews: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('tabnews')) return jsonResponse(tabNews);
      return jsonResponse({}, 503);
    }),
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the TabNews feed and an item that is not what it should be', () => {
  const item = (overrides: Record<string, unknown>) => ({
    slug: 's1',
    title: 'IA no trabalho',
    source_url: null,
    published_at: '2026-10-02T10:00:00Z',
    owner_username: 'ana',
    tabcoins: 3,
    ...overrides,
  });

  it('skips an item with no slug and keeps the others, instead of failing the whole feed', async () => {
    stubFeeds([item({ slug: undefined, title: 'IA sem slug' }), item({ slug: 'ok', title: 'IA com slug' })]);

    const result = await getNewsArticles();

    expect(result.origin).toBe('live');
    expect(result.articles.map((article) => article.title)).toEqual(['IA com slug']);
    expect(result.failures?.some((failure) => failure.source === 'tabnews')).toBeFalsy();
  });

  it('skips an item whose slug is not text, a number or an object', async () => {
    stubFeeds([
      item({ slug: 42, title: 'IA com numero' }),
      item({ slug: { a: 1 }, title: 'IA com objeto' }),
      item({ slug: 'ok' }),
    ]);

    const result = await getNewsArticles();

    expect(result.articles.map((article) => article.title)).toEqual(['IA no trabalho']);
  });
});

describe('the timeouts of the feeds', () => {
  it('asks every feed with the one constant, not a number written in place', () => {
    const source = readFileSync(resolve(__dirname, 'newsFeeds.ts'), 'utf8');

    expect(source).not.toMatch(/AbortSignal\.timeout\(\s*\d/);
    expect(source.match(/AbortSignal\.timeout\(FEED_TIMEOUT_MS\)/g)).toHaveLength(2);
  });
});
