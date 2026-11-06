import { beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, stubPublicFeeds } from '../test/news';
import { CACHE_KEY, article, dbRow, devToItem, stubFeeds, stubSupabase, tabNewsItem } from '../test/newsFixtures';
import { getNewsArticles } from './newsService';

beforeEach(() => {
  localStorage.clear();
});

describe('getNewsArticles from the public feeds', () => {
  it('merges dev.to and TabNews, checks every link and cover, and shows each article once', async () => {
    stubPublicFeeds(
      [
        devToItem(),
        devToItem({
          title: 'Dev PT',
          url: 'https://dev.to/a/2',
          language: 'pt',
          cover_image: 'https://media2.dev.to/c.png',
        }),
      ],
      [
        tabNewsItem(),
        tabNewsItem({ slug: 's2', title: 'Receita de bolo' }),
        tabNewsItem({ slug: 's3', title: 'Agentes com n8n', source_url: 'https://exemplo.com/x' }),
      ],
    );

    const { articles, source } = await getNewsArticles();

    expect(source).toBe('tabnews+devto');
    expect(articles.map((item) => item.title).sort()).toEqual(['Agentes com n8n', 'Dev A', 'Dev PT', 'IA no trabalho']);
    expect(articles.every((item) => /^https?:\/\//.test(item.url))).toBe(true);
    expect(articles.find((item) => item.title === 'IA no trabalho')?.url).toBe('https://www.tabnews.com.br/ana/s1');
    expect(articles.find((item) => item.title === 'Agentes com n8n')?.url).toBe('https://exemplo.com/x');
    expect(articles.find((item) => item.title === 'Dev A')?.image.startsWith('https://images.unsplash.com/')).toBe(
      true,
    );
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
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ articles: [article({ title: 'Do cache' })], timestamp: 1, source: 'cache' }),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({}, 503)),
    );

    expect((await getNewsArticles()).source).toBe('stale-cache');

    localStorage.clear();
    const { articles, source } = await getNewsArticles();
    expect(source).toBe('fallback');
    expect(articles.every((item) => /^https:\/\//.test(item.url))).toBe(true);
  });

  it('treats a cache that is not JSON as no cache', async () => {
    localStorage.setItem(CACHE_KEY, '{broken');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({}, 503)),
    );

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
        devToItem({
          title: 'Da org',
          url: 'https://dev.to/o/1',
          organization: { name: 'Org' },
          description: null,
          cover_image: null,
        }),
        devToItem({
          title: 'Do autor',
          url: 'https://dev.to/o/2',
          user: { name: 'Pessoa', website_url: 'https://pessoa.example' },
        }),
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

  it('goes on past Supabase that fails, with no source name or a broken cache', async () => {
    localStorage.setItem(CACHE_KEY, 'null');
    stubFeeds(null);

    expect((await getNewsArticles()).source).toBe('fallback');
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();

    localStorage.setItem(CACHE_KEY, JSON.stringify({ articles: [], source: 4 }));
    expect((await getNewsArticles()).source).toBe('fallback');
  });

  it('names the source of the Supabase answer', async () => {
    stubSupabase([dbRow()]);

    expect((await getNewsArticles()).source).toBe('supabase');
  });

  it('survives a localStorage that refuses to write', async () => {
    stubSupabase([dbRow()]);
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
    stubSupabase([dbRow()]);
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
