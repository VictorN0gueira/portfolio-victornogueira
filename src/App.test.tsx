import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { notFoundCopy } from './data/notFoundCopy';
import { shellCopy } from './data/shellCopy';
import { NOT_FOUND_META } from './seo/headHtml';
import { rejectUnexpectedFetch } from './test/contactForm';
import { stubMatchMedia } from './test/matchMedia';
import { NOT_FOUND_HEADING } from './test/notFoundHeading';
import { renderWithProviders } from './test/render';

// The About chunk fails to load until the gate opens, and the blog chunk fails for good: both through the real
// lazy wiring of the App. (Vitest gives this file its own modules, so React.lazy starts clean.)
const gate = vi.hoisted(() => ({ isAboutBroken: true }));

vi.mock('./pages/AboutPage', async () => {
  if (gate.isAboutBroken) throw new Error('chunk is gone');
  return vi.importActual('./pages/AboutPage');
});
vi.mock('./components/BlogPage', async () => {
  throw new Error('chunk is gone');
});

vi.setConfig({ testTimeout: 40_000 });

const LAZY_WAIT = { timeout: 25_000 } as const;
const WIDGET_DELAY_MS = 1500;

beforeEach(() => {
  stubMatchMedia();
  rejectUnexpectedFetch();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal('requestIdleCallback', undefined);
  vi.stubGlobal('cancelIdleCallback', undefined);
  // jsdom has no elementsFromPoint, which the accessibility widget uses to pick its tone.
  Object.defineProperty(document, 'elementsFromPoint', { value: () => [], configurable: true, writable: true });
});

afterEach(() => {
  Reflect.deleteProperty(document, 'elementsFromPoint');
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('App not found route', () => {
  it('loads the not found page on its own chunk and sets the noindex title', async () => {
    renderWithProviders(<App />, { route: '/nao-existe' });

    expect(await screen.findByRole('heading', NOT_FOUND_HEADING, LAZY_WAIT)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /voltar ao início/i })).toHaveAttribute('href', '/');
  });

  it('writes the same description as the static 404.html (one copy module), not the pitch of the home', async () => {
    renderWithProviders(<App />, { route: '/nao-existe' });
    await screen.findByRole('heading', NOT_FOUND_HEADING, LAZY_WAIT);

    const content = (selector: string) => document.head.querySelector(selector)?.getAttribute('content');
    expect(content('meta[name="description"]')).toBe(notFoundCopy.description);
    expect(content('meta[property="og:description"]')).toBe(notFoundCopy.description);
    expect(content('meta[name="description"]')).toBe(NOT_FOUND_META.description);
    expect(document.title).toBe(NOT_FOUND_META.title);
  });
});

describe('App accessibility widget', () => {
  it('is not in the first render, and mounts after the idle wait without delaying the page', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    renderWithProviders(<App />, { route: '/nao-existe' });
    expect(screen.queryByRole('button', { name: 'Abrir opções de acessibilidade' })).toBeNull();

    act(() => {
      vi.advanceTimersByTime(WIDGET_DELAY_MS);
    });
    vi.useRealTimers();

    expect(
      await screen.findByRole('button', { name: 'Abrir opções de acessibilidade' }, LAZY_WAIT),
    ).toBeInTheDocument();
  });

  it('cancels the wait when the app unmounts', () => {
    vi.useFakeTimers();
    const { unmount } = renderWithProviders(<App />, { route: '/nao-existe' });

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('App pages that fail to load', () => {
  it('keeps the header and the footer, shows the recovery panel, and the retry brings the page back', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: '/sobre' });

    const retry = await screen.findByRole('button', { name: shellCopy.errorBoundary.retry }, LAZY_WAIT);
    expect(within(screen.getByRole('main')).getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();

    gate.isAboutBroken = false;
    await user.click(retry);

    expect(
      await screen.findByRole('region', { name: 'Do primeiro papo ao fluxo rodando' }, LAZY_WAIT),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('announces the blog chunk loading as a status inside the main landmark of the site layout', () => {
    renderWithProviders(<App />, { route: '/blog' });

    const status = screen.getByRole('status', { name: shellCopy.pageLoading });
    expect(status).toHaveTextContent(shellCopy.pageLoading);
    expect(within(screen.getByRole('main')).getByRole('status', { name: shellCopy.pageLoading })).toBe(status);
  });

  it('shows the recovery panel for the blog inside the site layout, with the header and the footer still there', async () => {
    renderWithProviders(<App />, { route: '/blog' });

    expect(await screen.findByRole('button', { name: shellCopy.errorBoundary.retry }, LAZY_WAIT)).toBeInTheDocument();
    expect(within(screen.getByRole('main')).getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: new RegExp(shellCopy.errorBoundary.whatsapp) })).toBeInTheDocument();
  });
});
