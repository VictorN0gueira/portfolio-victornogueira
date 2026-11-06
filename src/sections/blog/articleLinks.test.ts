import { describe, expect, it } from 'vitest';
import { testArticle } from './articleFixtures';
import { articleHref, coverSource, listableArticles } from './articleLinks';

describe('articleHref', () => {
  it('gives the address of an http or https link, and nothing for anything else', () => {
    expect(articleHref(testArticle({ url: 'https://example.com/a' }))).toBe('https://example.com/a');
    expect(articleHref(testArticle({ url: 'http://example.com/a' }))).toBe('http://example.com/a');
    for (const url of [
      'javascript:alert(1)',
      'data:text/html,x',
      'file:///etc/passwd',
      '//example.com',
      'not a link',
      '',
    ]) {
      expect(articleHref(testArticle({ url }))).toBeUndefined();
    }
  });

  it('refuses an address with credentials', () => {
    expect(articleHref(testArticle({ url: 'https://user:secret@example.com/a' }))).toBeUndefined();
  });
});

describe('coverSource, as strict as the sanitizer of the covers', () => {
  it('keeps a cover from a listed host over https', () => {
    expect(coverSource(testArticle({ image: 'https://images.unsplash.com/photo-1?w=800' }))).toBe(
      'https://images.unsplash.com/photo-1?w=800',
    );
  });

  it.each([
    'http://images.unsplash.com/photo-1?w=800',
    'http://127.0.0.1/c.png',
    'https://[::1]/x',
    'http://localhost:3000/x',
    'https://localhost/c.png',
    'https://evil.example/c.png',
    'https://images.unsplash.com:8443/photo-1',
    'javascript:alert(1)',
    'data:image/svg+xml,x',
    'not a link',
    '',
  ])('gives nothing for %s, so the card shows its own picture', (image) => {
    expect(coverSource(testArticle({ image }))).toBeUndefined();
  });
});

describe('listableArticles', () => {
  it('keeps the articles with a usable address, each address once, in the order they came', () => {
    const list = [
      testArticle({ title: 'A', url: 'https://example.com/a' }),
      testArticle({ title: 'Mau', url: 'javascript:alert(1)' }),
      testArticle({ title: 'A de novo', url: 'https://example.com/a' }),
      testArticle({ title: 'B', url: 'https://example.com/b' }),
    ];

    expect(listableArticles(list).map((article) => article.title)).toEqual(['A', 'B']);
  });
});
