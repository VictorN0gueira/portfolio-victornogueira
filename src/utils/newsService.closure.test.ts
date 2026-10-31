import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getNewsArticles, getTimeAgo } from './newsService';

const CACHE_KEY = 'blog_news_cache';
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const CACHE_TTL_MS = 6 * HOUR_MS;
const NOW = Date.parse('2026-12-01T12:00:00Z');

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function devTo(day: number, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: `Dev dia ${String(day).padStart(2, '0')}`,
    description: 'd',
    url: `https://dev.to/a/${day}`,
    cover_image: null,
    published_at: `2026-10-${String(day).padStart(2, '0')}T10:00:00Z`,
    language: 'en',
    user: { name: 'Autora', website_url: null },
    organization: null,
    ...overrides,
  };
}

function tabNews(index: number, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    slug: `s${index}`,
    title: `IA numero ${index}`,
    source_url: null,
    published_at: '2026-10-02T10:00:00Z',
    owner_username: 'ana',
    tabcoins: 1,
    ...overrides,
  };
}

/** The edge function is down. dev.to answers every tag with `devToBody`, TabNews with `tabNewsBody`. */
function stubPublicFeeds(devToBody: unknown, tabNewsBody: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const address = String(input);
      if (address.includes('dev.to')) return jsonResponse(devToBody);
      if (address.includes('tabnews')) return jsonResponse(tabNewsBody);
      return jsonResponse({}, 503);
    }),
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('one bad item drops only that item (F-2)', () => {
  it('keeps the good dev.to articles around a null, a number, a text, an item with no title and one with a link that is not text', async () => {
    stubPublicFeeds([null, 5, 'x', { published_at: '2026-10-01T10:00:00Z', url: 'https://dev.to/n/1' }, devTo(5, { url: 7 }), devTo(3), devTo(4)], []);

    const { articles, source } = await getNewsArticles();

    expect(source).toBe('devto');
    expect(articles.map((item) => item.title).sort()).toEqual(['Dev dia 03', 'Dev dia 04']);
  });

  it('keeps the good TabNews articles around items that are not objects, and a dev.to answer that is a list of junk', async () => {
    stubPublicFeeds([null, 1], [null, 5, 'x', tabNews(1)]);

    const { articles, source } = await getNewsArticles();

    expect(source).toBe('tabnews');
    expect(articles.map((item) => item.title)).toEqual(['IA numero 1']);
  });
});

describe('the cut and the order of the public feeds (F-7)', () => {
  it('shows the 20 newest dev.to articles, newest first, out of 25 that arrive in a shuffled order', async () => {
    const days = Array.from({ length: 25 }, (_, index) => index + 1);
    const shuffled = [...days.filter((day) => day % 2 === 0), ...days.filter((day) => day % 2 === 1)];
    stubPublicFeeds(shuffled.map((day) => devTo(day)), []);

    const { articles } = await getNewsArticles();

    expect(articles).toHaveLength(20);
    expect(articles.map((item) => item.title)).toEqual(days.slice(5).reverse().map((day) => `Dev dia ${String(day).padStart(2, '0')}`));
  });

  it('shows at most 8 TabNews articles, the first 8 that are about AI', async () => {
    const relevant = Array.from({ length: 9 }, (_, index) => tabNews(index + 1));
    stubPublicFeeds([], [tabNews(99, { title: 'Receita de bolo' }), ...relevant]);

    const { articles } = await getNewsArticles();

    expect(articles.map((item) => item.title)).toEqual(relevant.slice(0, 8).map((item) => item.title));
  });

  it('keeps the interleave of Portuguese and English, one then the other', async () => {
    stubPublicFeeds([devTo(1, { language: 'en' }), devTo(2, { language: 'pt' })], [tabNews(1)]);

    const { articles } = await getNewsArticles();

    expect(articles.map((item) => item.language)).toEqual(['pt', 'en', 'pt']);
  });
});

describe('how long the cache lives (F-7)', () => {
  const cachedAt = (age: number) =>
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        articles: [{ title: 'Do cache', description: '', url: 'https://example.com/c', image: '', publishedAt: '2026-10-01T10:00:00Z', source: { name: 'F', url: '' }, language: 'pt' }],
        timestamp: NOW - age,
        source: 'cache',
      }),
    );

  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, 503)));
  });

  it('answers from the cache until it is 6 hours old', async () => {
    cachedAt(CACHE_TTL_MS - 1);

    expect((await getNewsArticles()).source).toBe('cache');
  });

  it('asks the sources again once the cache is 6 hours old, and falls back to the stale one', async () => {
    cachedAt(CACHE_TTL_MS);

    expect((await getNewsArticles()).source).toBe('stale-cache');
    expect(vi.mocked(fetch)).toHaveBeenCalled();
  });
});

describe('getTimeAgo', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const ago = (ms: number) => new Date(NOW - ms).toISOString();

  it('says days up to the 6th and the date from the 7th (F-7)', () => {
    expect(getTimeAgo(ago(6 * DAY_MS))).toBe('6 dias atrás');
    expect(getTimeAgo(ago(7 * DAY_MS))).toMatch(/de \w+ de 2026$/);
    expect(getTimeAgo(ago(2 * DAY_MS))).toBe('2 dias atrás');
    expect(getTimeAgo(ago(DAY_MS))).toBe('Ontem');
    expect(getTimeAgo(ago(23 * HOUR_MS))).toBe('23h atrás');
    expect(getTimeAgo(ago(HOUR_MS - 1))).toBe('Agora mesmo');
  });

  it('never prints Invalid Date: a value that is not a date gives an empty text (F-6)', () => {
    for (const value of ['garbage', '', '1', '2026-02-31', 'Invalid Date']) {
      expect(getTimeAgo(value)).toBe('');
    }
  });
});

// The reader is in Brazil: a date must show the day the feed wrote, in the zone of the reader (F-6).
describe.each([
  ['America/Fortaleza', { dayOnly: '30 de outubro de 2026', utcMidnightPlus30: '30 de outubro de 2026', offsetMinusThree: '30 de outubro de 2026' }],
  ['UTC', { dayOnly: '30 de outubro de 2026', utcMidnightPlus30: '31 de outubro de 2026', offsetMinusThree: '31 de outubro de 2026' }],
])('dates in %s', (zone, expected) => {
  const previous = process.env.TZ;

  beforeEach(() => {
    process.env.TZ = zone;
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  });

  it('runs in the zone it names', () => {
    expect(new Date(2026, 9, 30).getTimezoneOffset()).toBe(zone === 'UTC' ? 0 : 180);
  });

  it('shows a date with no time as that same day', () => {
    expect(getTimeAgo('2026-10-30')).toBe(expected.dayOnly);
  });

  it('shows 00:30 UTC of the 31st as the evening of the 30th in Fortaleza and as the 31st in UTC', () => {
    expect(getTimeAgo('2026-10-31T00:30:00Z')).toBe(expected.utcMidnightPlus30);
  });

  it('shows 23:59:59 at -03:00 on the 30th as the 30th in Fortaleza and as the 31st in UTC', () => {
    expect(getTimeAgo('2026-10-30T23:59:59-03:00')).toBe(expected.offsetMinusThree);
  });
});
