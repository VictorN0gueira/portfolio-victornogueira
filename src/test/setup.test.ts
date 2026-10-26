import { describe, expect, it, vi } from 'vitest';

describe('jsdom global mocks', () => {
  it('provides IntersectionObserver and ResizeObserver no-ops', () => {
    const element = document.createElement('div');
    const io = new IntersectionObserver(() => {});
    const ro = new ResizeObserver(() => {});

    expect(() => {
      io.observe(element);
      io.disconnect();
      ro.observe(element);
      ro.disconnect();
    }).not.toThrow();
    expect(io.takeRecords()).toEqual([]);
  });

  it('matchMedia reports matches:false by default', () => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');

    expect(mql.matches).toBe(false);
    expect(mql.media).toBe('(prefers-reduced-motion: reduce)');
    expect(() => {
      mql.addEventListener('change', () => {});
      mql.removeEventListener('change', () => {});
    }).not.toThrow();
  });

  it('matchMedia can be overridden per test with vi.stubGlobal', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: true, media: query }));

    expect(window.matchMedia('(min-width: 1px)').matches).toBe(true);
  });

  it('matchMedia override does not leak into the next test', () => {
    expect(window.matchMedia('(min-width: 1px)').matches).toBe(false);
  });
});
