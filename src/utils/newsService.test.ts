import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as newsService from './newsService';
import { safeHttpUrl, safeImageUrl } from './newsSanitize';
import { detectCategory, getNewsArticles, getTimeAgo, type NewsArticle } from './newsService';
import { jsonResponse, stubPublicFeeds } from '../test/news';

const CACHE_KEY = 'blog_news_cache';
const EDGE_HOST = 'qpcwoioflaxiasmcdfbd.supabase.co';
const GOOD_IMAGE = 'https://images.unsplash.com/photo-1?w=800';

function article(overrides: Record<string, unknown> = {}): Record<string, unknown> {
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
function stubFeeds(edgeBody: unknown) {
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

beforeEach(() => {
  localStorage.clear();
});

describe('safeHttpUrl', () => {
  it.each(['https://example.com/a', 'http://example.com/a?x=1#y'])('keeps %s', (value) => {
    expect(safeHttpUrl(value)).toBe(new URL(value).href);
  });

  it.each([
    'javascript:alert(1)',
    ' JavaScript:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=',
    'vbscript:x',
    'file:///etc/passwd',
    'ftp://example.com/x',
    '//example.com/x',
    '/relative/path',
    'not a url',
    '',
  ])('refuses %j', (value) => {
    expect(safeHttpUrl(value)).toBeUndefined();
  });

  it('refuses a value that is not a string', () => {
    expect(safeHttpUrl(undefined)).toBeUndefined();
    expect(safeHttpUrl(null)).toBeUndefined();
    expect(safeHttpUrl({ href: 'https://example.com' })).toBeUndefined();
  });
});

describe('safeImageUrl', () => {
  it.each([
    'https://images.unsplash.com/photo-1?w=800',
    'https://media2.dev.to/dynamic/image/a.png',
    'https://dev-to-uploads.s3.amazonaws.com/uploads/a.png',
    'https://res.cloudinary.com/practicaldev/image/fetch/a.png',
  ])('keeps the listed https host %s', (value) => {
    expect(safeImageUrl(value)).toBe(value);
  });

  it.each([
    ['an unknown host', 'https://tracker.example.net/pixel.png'],
    ['a plain http image', 'http://images.unsplash.com/photo-1'],
    ['a data image', 'data:image/svg+xml,%3Csvg%3E'],
    ['a javascript url', 'javascript:alert(1)'],
    ['a look alike host', 'https://images.unsplash.com.evil.example/a.png'],
    ['a host with the listed one as a user', 'https://images.unsplash.com@evil.example/a.png'],
    ['an empty value', ''],
  ])('drops %s', (_name, value) => {
    expect(safeImageUrl(value)).toBe('');
  });

  it('drops a value that is not a string', () => {
    expect(safeImageUrl(undefined)).toBe('');
    expect(safeImageUrl(42)).toBe('');
  });
});

describe('getNewsArticles from the edge function', () => {
  it('keeps a well formed article as it is', async () => {
    stubFeeds({ articles: [article()], source: 'gnews' });

    const { articles, source } = await getNewsArticles();

    expect(source).toBe('gnews');
    expect(articles).toHaveLength(1);
    expect(articles[0]).toMatchObject({ title: 'Um artigo', url: 'https://example.com/a', image: GOOD_IMAGE, language: 'pt' });
  });

  it('drops an article whose link is not http or https', async () => {
    stubFeeds({ articles: [article({ url: 'javascript:alert(1)' }), article({ url: 'data:text/html,x' }), article({ title: 'Bom' })] });

    const { articles } = await getNewsArticles();

    expect(articles.map((item) => item.title)).toEqual(['Bom']);
    expect(articles.every((item) => /^https?:\/\//.test(item.url))).toBe(true);
  });

  it('empties the image of an unknown host, so the page shows its own fallback', async () => {
    stubFeeds({ articles: [article({ image: 'https://tracker.example.net/pixel.png' })] });

    const { articles } = await getNewsArticles();

    expect(articles[0].image).toBe('');
  });

  it('empties an unsafe source link and keeps the source name', async () => {
    stubFeeds({ articles: [article({ source: { name: 'Fonte', url: 'javascript:alert(1)' } })] });

    const { articles } = await getNewsArticles();

    expect(articles[0].source).toEqual({ name: 'Fonte', url: '' });
  });

  it('drops an item that has no title, a non text title or no date, and keeps the rest', async () => {
    stubFeeds({
      articles: [article({ title: '' }), article({ title: 42 }), article({ publishedAt: 'ontem' }), null, 'texto', article({ title: 'Fica' })],
    });

    const { articles } = await getNewsArticles();

    expect(articles.map((item) => item.title)).toEqual(['Fica']);
  });

  it('does not cache nor return a response of another shape, and goes on to the public feeds', async () => {
    const asked = stubFeeds({ articles: 'nao e uma lista' });

    const { source } = await getNewsArticles();

    expect(source).toBe('fallback');
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
    expect(asked.some((address) => address.includes('dev.to'))).toBe(true);
  });

  it('caches only the articles that passed the check', async () => {
    stubFeeds({ articles: [article({ url: 'javascript:x' }), article({ title: 'Bom' })] });

    await getNewsArticles();

    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as { articles: NewsArticle[] };
    expect(cached.articles.map((item) => item.title)).toEqual(['Bom']);
  });
});

describe('getNewsArticles from the cache', () => {
  it('checks what it reads back, since anything could have written the key', async () => {
    const poisoned = [article({ url: 'javascript:alert(1)' }), article({ title: 'Seguro', image: 'https://tracker.example.net/x.png' })];
    localStorage.setItem(CACHE_KEY, JSON.stringify({ articles: poisoned, timestamp: Date.now(), source: 'cache' }));
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const { articles, source } = await getNewsArticles();

    expect(source).toBe('cache');
    expect(articles.map((item) => item.title)).toEqual(['Seguro']);
    expect(articles[0].image).toBe('');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('treats a cache that is not an article list as empty', async () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ articles: { not: 'a list' }, timestamp: Date.now() }));
    stubFeeds({ articles: [] });

    const { source } = await getNewsArticles();

    expect(source).toBe('fallback');
  });
});

describe('the blog and the GNews key', () => {
  it('never calls gnews.io, whatever the edge function answers', async () => {
    const asked = stubFeeds({ articles: [] });

    await getNewsArticles();

    expect(asked.length).toBeGreaterThan(0);
    expect(asked.some((address) => address.includes('gnews.io') || address.includes('apikey'))).toBe(false);
  });

  it('has no key, no GNews address and no env read of a key in its source', () => {
    const source = readFileSync(resolve(__dirname, 'newsService.ts'), 'utf8');

    expect(source).not.toMatch(/gnews\.io/i);
    expect(source).not.toMatch(/apikey/i);
    expect(source).not.toMatch(/VITE_GNEWS/);
    expect(source).not.toMatch(/import\.meta\.env/);
  });
});

function devToItem(overrides: Record<string, unknown> = {}): Record<string, unknown> {
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

function tabNewsItem(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { slug: 's1', title: 'IA no trabalho', source_url: 'javascript:alert(1)', published_at: '2026-10-02T10:00:00Z', owner_username: 'ana', tabcoins: 3, ...overrides };
}

describe('getNewsArticles from the public feeds', () => {
  it('merges dev.to and TabNews, checks every link and cover, and shows each article once', async () => {
    stubPublicFeeds(
      [devToItem(), devToItem({ title: 'Dev PT', url: 'https://dev.to/a/2', language: 'pt', cover_image: 'https://media2.dev.to/c.png' })],
      [tabNewsItem(), tabNewsItem({ slug: 's2', title: 'Receita de bolo' }), tabNewsItem({ slug: 's3', title: 'Agentes com n8n', source_url: 'https://exemplo.com/x' })],
    );

    const { articles, source } = await getNewsArticles();

    expect(source).toBe('tabnews+devto');
    expect(articles.map((item) => item.title).sort()).toEqual(['Agentes com n8n', 'Dev A', 'Dev PT', 'IA no trabalho']);
    expect(articles.every((item) => /^https?:\/\//.test(item.url))).toBe(true);
    expect(articles.find((item) => item.title === 'IA no trabalho')?.url).toBe('https://www.tabnews.com.br/ana/s1');
    expect(articles.find((item) => item.title === 'Agentes com n8n')?.url).toBe('https://exemplo.com/x');
    expect(articles.find((item) => item.title === 'Dev A')?.image.startsWith('https://images.unsplash.com/')).toBe(true);
    expect(articles.find((item) => item.title === 'Dev PT')?.image).toBe('https://media2.dev.to/c.png');
    expect(articles.find((item) => item.title === 'Dev A')?.source.url).toBe('');
  });

  it('works with dev.to alone when TabNews answers with another shape', async () => {
    stubPublicFeeds([devToItem()], { not: 'a list' });

    const { articles, source } = await getNewsArticles();

    expect(source).toBe('devto');
    expect(articles).toHaveLength(1);
  });

  it('uses the stale cache, and then the curated articles, when every source fails', async () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ articles: [article({ title: 'Do cache' })], timestamp: 1, source: 'cache' }));
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, 503)));

    expect((await getNewsArticles()).source).toBe('stale-cache');

    localStorage.clear();
    const { articles, source } = await getNewsArticles();
    expect(source).toBe('fallback');
    expect(articles.every((item) => /^https:\/\//.test(item.url))).toBe(true);
  });

  it('treats a cache that is not JSON as no cache', async () => {
    localStorage.setItem(CACHE_KEY, '{broken');
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, 503)));

    expect((await getNewsArticles()).source).toBe('fallback');
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
  });
});

describe('getNewsArticles with odd answers', () => {
  it('describes a TabNews article by the site of its author link, or by its author when the link is unusable', async () => {
    stubPublicFeeds(
      [],
      [
        tabNewsItem({ title: 'IA e IA', slug: 'a', source_url: 'https://www.exemplo.com/post' }),
        tabNewsItem({ title: 'IA sem link', slug: 'b', source_url: null }),
        tabNewsItem({ title: 'IA com link torto', slug: 'c', source_url: 'not a url' }),
        { title: 42 },
      ],
    );

    const { articles } = await getNewsArticles();
    const description = (title: string) => articles.find((item) => item.title === title)?.description;

    expect(description('IA e IA')).toContain('Via exemplo.com');
    expect(description('IA sem link')).toContain('Publicado por @ana');
    expect(description('IA com link torto')).toContain('Publicado por @ana');
  });

  it('names a dev.to article by its organization, its author, or the site, and fills a missing summary', async () => {
    stubPublicFeeds(
      [
        devToItem({ title: 'Da org', url: 'https://dev.to/o/1', organization: { name: 'Org' }, description: null, cover_image: null }),
        devToItem({ title: 'Do autor', url: 'https://dev.to/o/2', user: { name: 'Pessoa', website_url: 'https://pessoa.example' } }),
        devToItem({ title: 'Sem autor', url: 'https://dev.to/o/3', user: undefined }),
      ],
      [],
    );

    const { articles } = await getNewsArticles();
    const named = (title: string) => articles.find((item) => item.title === title);

    expect(named('Da org')?.source.name).toBe('Org');
    expect(named('Da org')?.description).toBe('');
    expect(named('Do autor')?.source).toEqual({ name: 'Pessoa', url: 'https://pessoa.example/' });
    expect(named('Sem autor')?.source).toEqual({ name: 'Dev.to', url: 'https://dev.to/' });
  });

  it('goes on past an edge function that answers null, with no source name or a broken cache', async () => {
    localStorage.setItem(CACHE_KEY, 'null');
    stubFeeds(null);

    expect((await getNewsArticles()).source).toBe('fallback');
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();

    localStorage.setItem(CACHE_KEY, JSON.stringify({ articles: [], source: 4 }));
    expect((await getNewsArticles()).source).toBe('fallback');
  });

  it('names the source of the edge function answer, or says edge-function when it gives none', async () => {
    stubFeeds({ articles: [article()] });

    expect((await getNewsArticles()).source).toBe('edge-function');
  });

  it('survives a localStorage that refuses to write', async () => {
    stubFeeds({ articles: [article()] });
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('quota');
    };

    try {
      expect((await getNewsArticles()).articles).toHaveLength(1);
    } finally {
      Storage.prototype.setItem = original;
    }
  });

  it('still loads the articles when localStorage is blocked and refuses to read (cookies off, in-app browsers)', async () => {
    stubFeeds({ articles: [article()] });
    const blocked = () => {
      throw new DOMException('blocked', 'SecurityError');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(blocked);

    try {
      expect((await getNewsArticles()).articles).toHaveLength(1);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('ignores a dev.to tag that fails and one that answers with another shape', async () => {
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const address = String(input);
        if (address.includes('dev.to')) {
          calls += 1;
          if (calls === 1) return jsonResponse({}, 500);
          if (calls === 2) return jsonResponse({ not: 'a list' });
          return jsonResponse([devToItem()]);
        }
        return jsonResponse({}, 503);
      }),
    );

    expect((await getNewsArticles()).source).toBe('devto');
  });
});

describe('detectCategory and getTimeAgo', () => {
  const titled = (title: string) => ({ ...(article({ title }) as unknown as NewsArticle) });

  it.each([
    ['Workflow com n8n', 'n8n'],
    ['Autonomous agent loop', 'agentes'],
    ['GPT chega ao mercado', 'llms'],
    ['Machine learning em producao', 'ml'],
    ['Zapier e no-code', 'automação'],
    ['Notícia qualquer', 'ia'],
  ])('puts "%s" under %s', (title, category) => {
    expect(detectCategory(titled(title))).toBe(category);
  });

  it('says how long ago an article came out', () => {
    const ago = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    expect(getTimeAgo(ago(0))).toBe('Agora mesmo');
    expect(getTimeAgo(ago(30))).toBe('Ontem');
    expect(getTimeAgo(ago(24 * 3))).toBe('3 dias atrás');
    expect(getTimeAgo(ago(24 * 40))).toMatch(/\d{4}$/);
  });
});

describe('what the module exports', () => {
  it('keeps formatDate private: the page only needs getTimeAgo', () => {
    expect('formatDate' in newsService).toBe(false);
    expect(getTimeAgo(new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString())).toBe('5h atrás');
  });
});

describe('getNewsArticles origin', () => {
  it('says live for an answer of the edge function, whatever source name the server reports', async () => {
    stubFeeds({ articles: [article()], source: 'cache' });

    const result = await getNewsArticles();

    expect(result.origin).toBe('live');
    expect(result.source).toBe('cache');
  });

  it('says live for the public feeds, browser-cache for a valid cache, and stale-browser-cache for an expired one', async () => {
    stubPublicFeeds([devToItem({ title: 'Do feed', url: 'https://dev.to/o/9' })], []);
    expect((await getNewsArticles()).origin).toBe('live');

    expect((await getNewsArticles()).origin).toBe('browser-cache');

    localStorage.setItem(CACHE_KEY, JSON.stringify({ articles: [article()], timestamp: 1, source: 'edge-function' }));
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, 503)));
    expect((await getNewsArticles()).origin).toBe('stale-browser-cache');
  });

  it('says fallback for the fixed list', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, 503)));

    expect((await getNewsArticles()).origin).toBe('fallback');
  });
});
