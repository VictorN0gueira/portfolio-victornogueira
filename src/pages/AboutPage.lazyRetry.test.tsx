import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RETRY_DELAY_MS } from '../lib/lazyWithRetry';
import { stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import AboutPage from './AboutPage';

// The first import of the skills chunk fails like a chunk that a deploy deleted: a bare React.lazy would never recover.
const failedFirstLoads = vi.hoisted(() => ({ count: 0 }));
vi.mock('../lib/lazyWithRetry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/lazyWithRetry')>();
  return {
    ...actual,
    lazyWithRetry: (...args: Parameters<typeof actual.lazyWithRetry>) => {
      const [load, options] = args;
      let hasFailed = false;
      const flaky: typeof load = () => {
        if (hasFailed) return load();
        hasFailed = true;
        failedFirstLoads.count += 1;
        return Promise.reject(new TypeError('Failed to fetch dynamically imported module: /assets/x.js'));
      };
      return actual.lazyWithRetry(flaky, options);
    },
  };
});

describe('AboutPage lazy sections', () => {
  beforeEach(() => {
    failedFirstLoads.count = 0;
    stubMatchMedia();
  });

  it('retries the skills chunk that failed to load and shows it', async () => {
    renderWithProviders(<AboutPage />, { route: '/sobre' });

    expect(await screen.findByText('Backend & Cloud', undefined, { timeout: RETRY_DELAY_MS + 8000 })).toBeInTheDocument();
    expect(failedFirstLoads.count).toBe(1);
  }, 20_000);
});
