// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getNewsArticles } from './newsService';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../lib/constants';

// Freeze localStorage so tests don't bleed through
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

const NOW = new Date('2026-11-06T12:00:00Z');

function makeDbRows(count: number, daysAgo = 1) {
  const pub = new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
  return Array.from({ length: count }, (_, i) => ({
    url: `https://test.example/article-${i + 1}`,
    title: `Article ${i + 1}`,
    summary: 'A short summary.',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
    published_at: pub,
    source: 'Test Source',
    language: 'en',
  }));
}

function mockFetch(supabaseResponse: { ok: boolean; status: number; body?: unknown }) {
  vi.mocked(fetch).mockImplementation(async (url: RequestInfo | URL) => {
    const urlStr = typeof url === 'string' ? url : url.toString();
    if (urlStr.includes('/rest/v1/articles')) {
      return {
        ok: supabaseResponse.ok,
        status: supabaseResponse.status,
        json: async () => supabaseResponse.body ?? [],
      } as Response;
    }
    // Dev.to and TabNews: return empty arrays so they don't interfere
    return { ok: false, status: 503, json: async () => [] } as unknown as Response;
  });
}

describe('readSupabaseArticles (via getNewsArticles)', () => {
  it('uses Supabase articles when they are fresh and valid', async () => {
    mockFetch({ ok: true, status: 200, body: makeDbRows(5) });
    const result = await getNewsArticles({ forceRefresh: true });
    expect(result.articles.length).toBeGreaterThan(0);
    expect(result.origin).toBe('live');
    expect(result.source).toBe('supabase');
  });

  it('falls through to public feeds when Supabase returns 500', async () => {
    vi.mocked(fetch).mockImplementation(async (url: RequestInfo | URL) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('/rest/v1/articles')) {
        return { ok: false, status: 500, json: async () => ({ message: 'server error' }) } as Response;
      }
      // public feeds: also fail so we can verify fallback chain
      return { ok: false, status: 503, json: async () => [] } as unknown as Response;
    });
    const result = await getNewsArticles({ forceRefresh: true });
    // Falls through to stale cache (empty) or fallback
    expect(['stale-browser-cache', 'fallback']).toContain(result.origin);
    expect(result.failures?.some((f) => f.source === 'supabase')).toBe(true);
  });

  it('falls through when Supabase returns an empty array', async () => {
    mockFetch({ ok: true, status: 200, body: [] });
    const result = await getNewsArticles({ forceRefresh: true });
    expect(result.failures?.some((f) => f.source === 'supabase')).toBe(true);
  });

  it('falls through when the newest article is older than 7 days', async () => {
    mockFetch({ ok: true, status: 200, body: makeDbRows(5, 8) }); // 8 days old
    const result = await getNewsArticles({ forceRefresh: true });
    expect(result.failures?.some((f) => f.source === 'supabase')).toBe(true);
  });

  it('discards articles with javascript: URLs from Supabase', async () => {
    const rows = [
      ...makeDbRows(3),
      {
        url: 'javascript:alert(1)',
        title: 'Bad',
        summary: '',
        image: '',
        published_at: makeDbRows(1)[0].published_at,
        source: 'evil',
        language: 'en',
      },
    ];
    mockFetch({ ok: true, status: 200, body: rows });
    const result = await getNewsArticles({ forceRefresh: true });
    if (result.source === 'supabase') {
      expect(result.articles.every((a) => !a.url.startsWith('javascript:'))).toBe(true);
    }
  });

  it('uses SUPABASE_URL and SUPABASE_ANON_KEY from constants', async () => {
    const seenUrls: string[] = [];
    const seenHeaders: string[] = [];
    vi.mocked(fetch).mockImplementation(async (url: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      seenUrls.push(urlStr);
      const h = (init?.headers ?? {}) as Record<string, string>;
      if (h['apikey']) seenHeaders.push(h['apikey']);
      return { ok: true, status: 200, json: async () => makeDbRows(3) } as Response;
    });
    await getNewsArticles({ forceRefresh: true });
    expect(seenUrls.some((u) => u.startsWith(SUPABASE_URL))).toBe(true);
    expect(seenHeaders.some((k) => k === SUPABASE_ANON_KEY)).toBe(true);
  });
});

describe('no service_role key in source', () => {
  it('src/ does not contain a JWT with role:service_role', async () => {
    const { readdir, readFile } = await import('node:fs/promises');
    const { resolve, join } = await import('node:path');

    // Decode JWT payload without a library
    function decodePayload(jwt: string) {
      try {
        const [, payload] = jwt.split('.');
        return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      } catch {
        return null;
      }
    }

    const srcDir = resolve('src');
    const findings: string[] = [];

    async function walk(dir: string) {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
        } else if (/\.(ts|tsx|js|mjs|json)$/.test(entry.name)) {
          const content = await readFile(full, 'utf8');
          // Find JWT-shaped tokens
          const jwtRe = /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g;
          for (const match of content.matchAll(jwtRe)) {
            const payload = decodePayload(match[0]);
            if (payload?.role === 'service_role') {
              findings.push(`${full}: contains service_role JWT`);
            }
          }
        }
      }
    }

    await walk(srcDir);
    expect(findings).toHaveLength(0);
  });
});
