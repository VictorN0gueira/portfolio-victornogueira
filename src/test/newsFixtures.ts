import { vi } from 'vitest';
import { jsonResponse } from './news';

export const CACHE_KEY = 'blog_news_cache';
export const EDGE_HOST = 'qpcwoioflaxiasmcdfbd.supabase.co';
export const SUPABASE_DB_HOST = 'db.vnone.com.br';
export const GOOD_IMAGE = 'https://images.unsplash.com/photo-1?w=800';

// What the tests of the news service share: an article as the edge function sends it, a stub of the feeds, and one item of
// dev.to and of TabNews.

export function article(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: 'Um artigo',
    description: 'Resumo',
    url: 'https://example.com/a',
    image: GOOD_IMAGE,
    publishedAt: '2026-10-01T10:00:00.000Z',
    source: { name: 'Fonte', url: 'https://example.com' },
    language: 'pt',
    ...overrides,
  };
}

/** Answers the edge function with `edgeBody` and every other host with a failure, and records every address asked for. */
export function stubFeeds(edgeBody: unknown) {
  const asked: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const address = String(input);
      asked.push(address);
      if (address.includes(EDGE_HOST)) return jsonResponse(edgeBody);
      return jsonResponse({}, 503);
    }),
  );
  return asked;
}

export function devToItem(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: 'Dev A',
    description: 'd',
    url: 'https://dev.to/a/1',
    cover_image: 'https://tracker.example.net/cover.png',
    published_at: '2026-10-01T10:00:00Z',
    language: 'en',
    user: { name: 'Autora', website_url: 'javascript:alert(1)' },
    organization: null,
    ...overrides,
  };
}

/** Creates a DB-row-shaped object (Supabase `articles` table) with a `published_at` that is 1 day old. */
export function dbRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    url: 'https://example.com/a',
    title: 'Um artigo',
    summary: 'Resumo',
    image: GOOD_IMAGE,
    published_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    source: 'Fonte',
    language: 'pt',
    ...overrides,
  };
}

/** Stubs fetch so that the Supabase DB endpoint returns `rows` and every other host fails with a 503. */
export function stubSupabase(rows: unknown[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const address = String(input);
      if (address.includes(SUPABASE_DB_HOST)) return jsonResponse(rows);
      return jsonResponse({}, 503);
    }),
  );
}

export function tabNewsItem(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    slug: 's1',
    title: 'IA no trabalho',
    source_url: 'javascript:alert(1)',
    published_at: '2026-10-02T10:00:00Z',
    owner_username: 'ana',
    tabcoins: 3,
    ...overrides,
  };
}
