import { act, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { homeCopy } from '../data/homeCopy';
import { rejectUnexpectedFetch } from '../test/contactForm';
import { stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import { removeScrollIntoViewStub, stubScrollIntoViewEverywhere } from '../test/scroll';
import { HomePage } from './HomePage';

// The sections under the first screen mount after an idle moment (1200 ms at the latest), or at once when the URL
// has a hash. Until then the page shows skeletons of their heights.
const IDLE_TIMEOUT_MS = 1200;
const LAZY_WAIT = { timeout: 20_000 } as const;

vi.setConfig({ testTimeout: 30_000 });

beforeEach(() => {
  stubMatchMedia();
  rejectUnexpectedFetch();
  stubScrollIntoViewEverywhere();
  vi.stubGlobal('requestIdleCallback', undefined);
  vi.stubGlobal('cancelIdleCallback', undefined);
});

afterEach(() => {
  removeScrollIntoViewStub();
  vi.useRealTimers();
});

/** The skeletons of the sections: every one carries the label of the loading placeholder. */
function skeletons(): HTMLElement[] {
  return screen.queryAllByText('Carregando...');
}

describe('HomePage deferred mount of the sections under the first screen', () => {
  it('shows the hero at once and a skeleton for every section until the idle moment', () => {
    vi.useFakeTimers();
    renderWithProviders(<HomePage />);

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(skeletons()).toHaveLength(8);
    expect(screen.queryByRole('heading', { name: homeCopy.faq.heading })).toBeNull();
  });

  it('mounts the sections after the idle moment', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    renderWithProviders(<HomePage />);

    act(() => {
      vi.advanceTimersByTime(IDLE_TIMEOUT_MS);
    });
    vi.useRealTimers();

    expect(await screen.findByRole('heading', { name: homeCopy.faq.heading }, LAZY_WAIT)).toBeInTheDocument();
    await waitFor(() => expect(skeletons()).toHaveLength(0), LAZY_WAIT);
  });

  it('mounts them at once when the URL has a hash, because the visitor is going to one of them', async () => {
    renderWithProviders(<HomePage />, { route: '/#clientes' });

    expect(await screen.findByRole('region', { name: homeCopy.testimonials.heading }, LAZY_WAIT)).toBeInTheDocument();
  });

  it('cancels the idle wait when the page unmounts, so nothing runs after it', () => {
    vi.useFakeTimers();
    const { unmount } = renderWithProviders(<HomePage />);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
