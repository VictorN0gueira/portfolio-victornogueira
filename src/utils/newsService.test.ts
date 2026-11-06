import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as newsService from './newsService';
import { safeHttpUrl, safeImageUrl } from './newsSanitize';
import { detectCategory, getNewsArticles, getTimeAgo, type NewsArticle } from './newsService';
import { CACHE_KEY, GOOD_IMAGE, article, devToItem, stubFeeds } from '../test/newsFixtures';
import { jsonResponse, stubPublicFeeds } from '../test/news';

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
    expect(articles[0]).toMatchObject({
      title: 'Um artigo',
      url: 'https://example.com/a',
      image: GOOD_IMAGE,
      language: 'pt',
    });
  });

  it('drops an article whose link is not http or https', async () => {
    stubFeeds({
      articles: [
        article({ url: 'javascript:alert(1)' }),
        article({ url: 'data:text/html,x' }),
        article({ title: 'Bom' }),
      ],
    });

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
      articles: [
        article({ title: '' }),
        article({ title: 42 }),
        article({ publishedAt: 'ontem' }),
        null,
        'texto',
        article({ title: 'Fica' }),
      ],
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
    const poisoned = [
      article({ url: 'javascript:alert(1)' }),
      article({ title: 'Seguro', image: 'https://tracker.example.net/x.png' }),
    ];
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
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({}, 503)),
    );
    expect((await getNewsArticles()).origin).toBe('stale-browser-cache');
  });

  it('says fallback for the fixed list', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({}, 503)),
    );

    expect((await getNewsArticles()).origin).toBe('fallback');
  });
});
