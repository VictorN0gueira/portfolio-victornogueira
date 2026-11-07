// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { syncNews } from './news-sync.mjs';
import type { ArticleRow } from './news-sync.d.mts';

const VALID_DATE = '2026-11-01T10:00:00Z';
const FAKE_NOW = new Date('2026-11-06T12:00:00Z');

function makeRow(n: number, overrides: Partial<ArticleRow> = {}): ArticleRow {
  return {
    url: `https://test.example/article-${n}`,
    title: `Article ${n}`,
    summary: 'A short summary.',
    image: '',
    published_at: VALID_DATE,
    source: 'Test Source',
    language: 'en',
    ...overrides,
  };
}

describe('syncNews validation — bad articles never reach upsert', () => {
  it('rejects an article with a javascript: URL', async () => {
    const upsert = vi.fn().mockResolvedValue(undefined);
    await expect(
      syncNews({
        fetchSources: async () => [makeRow(1, { url: 'javascript:alert(1)' })],
        upsert,
        deleteOlderThan: async () => 0,
        now: () => FAKE_NOW,
      }),
    ).rejects.toThrow();
    expect(upsert).not.toHaveBeenCalled();
  });

  it('rejects an article with a data: URL', async () => {
    const upsert = vi.fn().mockResolvedValue(undefined);
    await expect(
      syncNews({
        fetchSources: async () => [makeRow(1, { url: 'data:text/html,hello' })],
        upsert,
        deleteOlderThan: async () => 0,
        now: () => FAKE_NOW,
      }),
    ).rejects.toThrow();
    expect(upsert).not.toHaveBeenCalled();
  });

  it('rejects an article with credentials in the URL', async () => {
    const upsert = vi.fn().mockResolvedValue(undefined);
    await expect(
      syncNews({
        fetchSources: async () => [makeRow(1, { url: 'https://user:pass@test.example/article' })],
        upsert,
        deleteOlderThan: async () => 0,
        now: () => FAKE_NOW,
      }),
    ).rejects.toThrow();
    expect(upsert).not.toHaveBeenCalled();
  });

  it('rejects an article with a title of 301 characters', async () => {
    const upsert = vi.fn().mockResolvedValue(undefined);
    await expect(
      syncNews({
        fetchSources: async () => [makeRow(1, { title: 'x'.repeat(301) })],
        upsert,
        deleteOlderThan: async () => 0,
        now: () => FAKE_NOW,
      }),
    ).rejects.toThrow();
    expect(upsert).not.toHaveBeenCalled();
  });

  it('rejects an article with a published_at more than 5 minutes in the future', async () => {
    const upsert = vi.fn().mockResolvedValue(undefined);
    const future = new Date(FAKE_NOW.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour in future
    await expect(
      syncNews({
        fetchSources: async () => [makeRow(1, { published_at: future })],
        upsert,
        deleteOlderThan: async () => 0,
        now: () => FAKE_NOW,
      }),
    ).rejects.toThrow();
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe('syncNews URL deduplication', () => {
  it('inserts a URL only once when it appears multiple times', async () => {
    const upserted: string[] = [];
    const upsert = vi.fn().mockImplementation(async (rows: ArticleRow[]) => {
      upserted.push(...rows.map((r) => r.url));
    });

    await syncNews({
      fetchSources: async () => [makeRow(1), makeRow(1), makeRow(1)],
      upsert,
      deleteOlderThan: async () => 0,
      now: () => FAKE_NOW,
    });

    const url = `https://test.example/article-1`;
    expect(upserted.filter((u) => u === url)).toHaveLength(1);
  });
});

describe('syncNews source failure handling', () => {
  it('throws when fetchSources returns no articles', async () => {
    const upsert = vi.fn();
    const deleteOlderThan = vi.fn();

    await expect(
      syncNews({ fetchSources: async () => [], upsert, deleteOlderThan, now: () => FAKE_NOW }),
    ).rejects.toThrow();
    expect(upsert).not.toHaveBeenCalled();
    expect(deleteOlderThan).not.toHaveBeenCalled();
  });

  it('throws when all fetched articles fail validation', async () => {
    const upsert = vi.fn();
    const deleteOlderThan = vi.fn();

    await expect(
      syncNews({
        fetchSources: async () => [makeRow(1, { url: 'javascript:void(0)' }), makeRow(2, { url: 'data:,' })],
        upsert,
        deleteOlderThan,
        now: () => FAKE_NOW,
      }),
    ).rejects.toThrow();
    expect(upsert).not.toHaveBeenCalled();
    expect(deleteOlderThan).not.toHaveBeenCalled();
  });
});

describe('syncNews upsert order and counts', () => {
  it('returns fetched, kept, removed counts', async () => {
    const result = await syncNews({
      fetchSources: async () => [makeRow(1), makeRow(2)],
      upsert: async () => {},
      deleteOlderThan: async () => 5,
      now: () => FAKE_NOW,
    });
    expect(result.fetched).toBe(2);
    expect(result.kept).toBe(2);
    expect(result.removed).toBe(5);
  });

  it('counts only successfully upserted articles', async () => {
    let calls = 0;
    const result = await syncNews({
      fetchSources: async () => [makeRow(1), makeRow(2), makeRow(3)],
      upsert: async () => {
        calls++;
        if (calls === 2) throw new Error('db constraint');
      },
      deleteOlderThan: async () => 0,
      now: () => FAKE_NOW,
    });
    expect(result.fetched).toBe(3);
    expect(result.kept).toBe(2);
  });

  it('calls deleteOlderThan after all upserts', async () => {
    const order: string[] = [];
    await syncNews({
      fetchSources: async () => [makeRow(1), makeRow(2)],
      upsert: async () => {
        order.push('upsert');
      },
      deleteOlderThan: async () => {
        order.push('delete');
        return 0;
      },
      now: () => FAKE_NOW,
    });
    expect(order.lastIndexOf('upsert')).toBeLessThan(order.indexOf('delete'));
  });

  it('does not call deleteOlderThan when all upserts fail', async () => {
    const deleteOlderThan = vi.fn().mockResolvedValue(0);
    const result = await syncNews({
      fetchSources: async () => [makeRow(1), makeRow(2)],
      upsert: async () => {
        throw new Error('all fail');
      },
      deleteOlderThan,
      now: () => FAKE_NOW,
    });
    expect(result.kept).toBe(0);
    expect(result.removed).toBe(0);
    expect(deleteOlderThan).not.toHaveBeenCalled();
  });

  it('two runs with the same data produce the same kept count', async () => {
    const rows = [makeRow(1), makeRow(2), makeRow(3)];
    const run = () =>
      syncNews({
        fetchSources: async () => rows,
        upsert: async () => {},
        deleteOlderThan: async () => 0,
        now: () => FAKE_NOW,
      });
    const r1 = await run();
    const r2 = await run();
    expect(r1.kept).toBe(r2.kept);
  });
});

describe('syncNews title truncation', () => {
  it('passes articles with title of exactly 300 characters', async () => {
    const upserted: string[] = [];
    await syncNews({
      fetchSources: async () => [makeRow(1, { title: 'x'.repeat(300) })],
      upsert: async (rows) => {
        upserted.push(rows[0].title);
      },
      deleteOlderThan: async () => 0,
      now: () => FAKE_NOW,
    });
    // The article should pass (300 is within the limit for the row, though stored as 300 chars)
    expect(upserted.length).toBe(1);
  });
});
