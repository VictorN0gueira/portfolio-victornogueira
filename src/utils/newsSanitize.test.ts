import { describe, expect, it } from 'vitest';
import { BLOG_IMAGE_HOSTS, BLOG_IMG_SRC } from '../../config/blogImageHosts.mjs';
import { parseNewsDate, safeHttpUrl, safeImageUrl, sanitizeArticle, sanitizeArticles } from './newsSanitize';

function raw(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: 'Titulo',
    description: 'Resumo',
    url: 'https://example.com/a',
    image: 'https://images.unsplash.com/photo-1',
    publishedAt: '2026-10-01T10:00:00Z',
    source: { name: 'Fonte', url: 'https://example.com' },
    language: 'pt',
    ...overrides,
  };
}

describe('safeHttpUrl and credentials', () => {
  it.each(['https://user:pw@evil.example/x', 'http://user@evil.example/', 'https://:pw@evil.example/'])(
    'refuses %s',
    (value) => {
      expect(safeHttpUrl(value)).toBeUndefined();
    },
  );

  it('refuses an address longer than 2048 characters and keeps one of exactly 2048', () => {
    const base = 'https://example.com/';

    expect(safeHttpUrl(base + 'a'.repeat(2048 - base.length))).toBeDefined();
    expect(safeHttpUrl(base + 'a'.repeat(2049 - base.length))).toBeUndefined();
  });
});

describe('safeImageUrl hosts', () => {
  it('refuses credentials on a listed host (the user part could carry a tracking id)', () => {
    expect(safeImageUrl('https://user:pw@media.dev.to/x.png')).toBe('');
    expect(safeImageUrl('https://user@images.unsplash.com/x.png')).toBe('');
  });

  it('refuses a port that is not the default one, and keeps the default one written out', () => {
    expect(safeImageUrl('https://media.dev.to:8443/x.png')).toBe('');
    expect(safeImageUrl('https://media.dev.to:443/x.png')).toBe('https://media.dev.to/x.png');
  });

  it('takes Cloudinary only under the account dev.to uses, not any account', () => {
    expect(safeImageUrl('https://res.cloudinary.com/practicaldev/image/fetch/a.png')).toBe(
      'https://res.cloudinary.com/practicaldev/image/fetch/a.png',
    );
    expect(safeImageUrl('https://res.cloudinary.com/attacker/image/upload/p.png')).toBe('');
    expect(safeImageUrl('https://res.cloudinary.com/practicaldev')).toBe('');
    expect(safeImageUrl('https://res.cloudinary.com/x/practicaldev/p.png')).toBe('');
  });

  it('keeps the host list in one exported constant, with the data: source the fallback image needs', () => {
    expect(BLOG_IMG_SRC).toEqual([...BLOG_IMAGE_HOSTS.map((host) => `https://${host}`), 'data:']);
    expect(BLOG_IMG_SRC.some((source) => source.includes('*') || source === 'https:')).toBe(false);
    for (const host of BLOG_IMAGE_HOSTS) expect(host).toMatch(/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/);
  });
});

describe('sanitizeArticle caps and defaults', () => {
  it('cuts a title at 300 characters, a summary at 600 and a source name at 120, and keeps shorter text whole', () => {
    const long = sanitizeArticle(
      raw({
        title: 't'.repeat(5000),
        description: 'd'.repeat(5000),
        source: { name: 's'.repeat(5000), url: 'https://example.com' },
      }),
    );

    expect(long?.title).toHaveLength(300);
    expect(long?.description).toHaveLength(600);
    expect(long?.source.name).toHaveLength(120);
    const exact = sanitizeArticle(
      raw({ title: 't'.repeat(300), description: 'd'.repeat(600), source: { name: 's'.repeat(120) } }),
    );
    expect(exact?.title).toHaveLength(300);
    expect(exact?.description).toHaveLength(600);
    expect(exact?.source.name).toHaveLength(120);
  });

  it('gives an unknown language the default, English, and keeps Portuguese', () => {
    expect(sanitizeArticle(raw({ language: 'fr' }))?.language).toBe('en');
    expect(sanitizeArticle(raw({ language: undefined }))?.language).toBe('en');
    expect(sanitizeArticle(raw({ language: 'pt' }))?.language).toBe('pt');
  });
});

describe('dates', () => {
  it.each([
    '2026-10-30',
    '2026-10-30T10:00:00Z',
    '2026-10-30T10:00:00.123Z',
    '2026-10-30T10:00:00-03:00',
    '2026-10-30T10:00',
    '2026-10-30 10:00:00Z',
  ])('accepts %s', (value) => {
    expect(parseNewsDate(value)).toBeInstanceOf(Date);
    expect(sanitizeArticle(raw({ publishedAt: value }))).not.toBeNull();
  });

  it.each([
    '1',
    '2026',
    'ontem',
    '',
    '2026-02-31',
    '2026-13-01',
    '2026-00-10',
    '2026-10-30T25:00:00Z',
    'Oct 30 2026',
    '2026-10-30garbage',
    20261030,
  ])('refuses %j', (value) => {
    expect(parseNewsDate(value as string)).toBeNull();
    expect(sanitizeArticle(raw({ publishedAt: value }))).toBeNull();
  });

  it('reads a date without a time as that calendar day in the zone of the reader, not the day before', () => {
    const date = parseNewsDate('2026-10-30');

    expect([date?.getFullYear(), date?.getMonth(), date?.getDate()]).toEqual([2026, 9, 30]);
  });
});

describe('sanitizeArticles and repeated addresses', () => {
  const item = (title: string, url: string) => ({
    title,
    description: 'd',
    url,
    image: '',
    publishedAt: '2026-10-01T10:00:00.000Z',
    source: { name: 'Fonte', url: 'https://example.com' },
    language: 'pt',
  });

  it('keeps the first article of an address and drops the repeats, written the same way or not', () => {
    const result = sanitizeArticles([
      item('Primeiro', 'https://example.com/a'),
      item('Repetido', 'https://example.com/a'),
      item('Mesmo com host em maiuscula', 'https://EXAMPLE.com/a'),
      item('Outro', 'https://example.com/b'),
    ]);

    expect(result.map((article) => article.title)).toEqual(['Primeiro', 'Outro']);
  });
});
