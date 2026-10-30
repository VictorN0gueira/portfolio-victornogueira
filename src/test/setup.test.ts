import { getConfig } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

type MockTypes = { io: string; ro: string; matchMedia: string };

function readMockTypes(): MockTypes {
  return {
    io: typeof IntersectionObserver,
    ro: typeof ResizeObserver,
    matchMedia: typeof window.matchMedia,
  };
}

// Captured while this file is imported and in its first beforeAll, i.e. before any beforeEach ran.
const seenAtImport = readMockTypes();
let seenInBeforeAll: MockTypes | undefined;

beforeAll(() => {
  seenInBeforeAll = readMockTypes();
});

// Counts finished tests so the later beforeAll check can tell that it really ran after one.
let testsFinished = 0;
afterEach(() => {
  testsFinished += 1;
});

const ALL_FUNCTIONS: MockTypes = { io: 'function', ro: 'function', matchMedia: 'function' };

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

  it('are already installed when the test file is imported', () => {
    expect(seenAtImport).toEqual(ALL_FUNCTIONS);
  });

  it('are already installed in the first beforeAll', () => {
    expect(seenInBeforeAll).toEqual(ALL_FUNCTIONS);
  });
});

const NETWORK_ERROR = 'Unexpected network call in a unit test';

describe('the global fetch stub', () => {
  it('rejects a call nobody stubbed, with a message that names the cause', async () => {
    await expect(fetch('https://example.com/data')).rejects.toThrow(NETWORK_ERROR);
  });

  it('rejects a component style fetch that has no stub of its own', async () => {
    const load = async () => (await fetch('/api/feed')).json();

    await expect(load()).rejects.toThrow(NETWORK_ERROR);
  });

  it('can be replaced for one test with vi.stubGlobal', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true })));

    await expect(fetch('/x')).resolves.toEqual({ ok: true });
  });

  it('is back for the next test after a replacement', async () => {
    await expect(fetch('/x')).rejects.toThrow(NETWORK_ERROR);
  });
});

describe('the Testing Library config', () => {
  it('waits up to five seconds for findBy and waitFor', () => {
    expect(getConfig().asyncUtilTimeout).toBe(5000);
  });
});

// Each pair below is order dependent on purpose: the first test overrides, the second one checks
// what the next test sees. describe.sequential keeps the pair in order, and the checking test
// skips itself when run alone (for example with -t), so it can never pass vacuously.
describe.sequential('isolation between tests', () => {
  let stubbedMatchMedia = false;
  let assignedMatchMedia = false;
  let stubbedProbe = false;

  it('matchMedia can be overridden per test with vi.stubGlobal', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: true, media: query }));
    stubbedMatchMedia = true;

    expect(window.matchMedia('(min-width: 1px)').matches).toBe(true);
  });

  it('the next test gets the default matchMedia back after vi.stubGlobal', (ctx) => {
    if (!stubbedMatchMedia) ctx.skip();

    expect(window.matchMedia('(min-width: 1px)').matches).toBe(false);
  });

  it('matchMedia can be overridden per test by direct assignment', () => {
    window.matchMedia = (query: string) => ({ matches: true, media: query }) as MediaQueryList;
    assignedMatchMedia = true;

    expect(window.matchMedia('(min-width: 1px)').matches).toBe(true);
  });

  it('the next test gets the default matchMedia back after direct assignment', (ctx) => {
    if (!assignedMatchMedia) ctx.skip();

    expect(window.matchMedia('(min-width: 1px)').matches).toBe(false);
  });

  it('any other global stubbed with vi.stubGlobal is stubbed only for that test', () => {
    vi.stubGlobal('__setupLeakProbe', 'stubbed');
    stubbedProbe = true;

    expect((globalThis as Record<string, unknown>).__setupLeakProbe).toBe('stubbed');
  });

  it('the next test no longer sees that global (restored by afterEach)', (ctx) => {
    if (!stubbedProbe) ctx.skip();

    expect((globalThis as Record<string, unknown>).__setupLeakProbe).toBeUndefined();
  });
});

// A beforeAll scoped to a describe runs after the tests of the earlier suites, so it only sees the
// default mocks if they are reinstalled after each test (afterEach unstubs the module scope ones).
describe('a describe scoped beforeAll that runs after earlier tests', () => {
  let testsFinishedBefore = 0;
  let seenInScopedBeforeAll: MockTypes | undefined;
  let matchesInScopedBeforeAll: boolean | undefined;

  beforeAll(() => {
    testsFinishedBefore = testsFinished;
    seenInScopedBeforeAll = readMockTypes();
    matchesInScopedBeforeAll = window.matchMedia('(min-width: 1px)').matches;
  });

  it('still sees the default mocks', (ctx) => {
    if (testsFinishedBefore === 0) ctx.skip();

    expect(seenInScopedBeforeAll).toEqual(ALL_FUNCTIONS);
    expect(matchesInScopedBeforeAll).toBe(false);
  });
});
