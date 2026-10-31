import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { RELOAD_STORAGE_KEY } from './lib/lazyWithRetry';
import { rejectUnexpectedFetch } from './test/contactForm';
import { stubMatchMedia } from './test/matchMedia';
import { renderWithProviders } from './test/render';

// The chunk of the accessibility widget is gone for good. One test in this file, on purpose: React.lazy keeps the
// rejection inside the module, and Vitest gives every file its own modules.
vi.mock('./components/AccessibilityWidget', async () => {
  throw new TypeError('Failed to fetch dynamically imported module: https://vnone.com.br/assets/AccessibilityWidget-abc.js');
});

// Records how the app makes each lazy component. (A mocked module that throws gets its error wrapped by Vitest, so the
// chunk error pattern cannot be driven through the mock: the lazyWithRetry tests cover canReload itself.)
const lazyCalls = vi.hoisted(() => [] as Array<{ source: string; options: unknown }>);

vi.mock('./lib/lazyWithRetry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lib/lazyWithRetry')>();
  return {
    ...actual,
    lazyWithRetry: (...args: Parameters<typeof actual.lazyWithRetry>) => {
      lazyCalls.push({ source: String(args[0]), options: args[1] });
      return actual.lazyWithRetry(...args);
    },
  };
});

vi.setConfig({ testTimeout: 30_000 });

const reload = vi.fn();
const WIDGET_IDLE_MS = 1500;
const RETRY_DELAY_MS = 1000;
const SETTLE_MS = WIDGET_IDLE_MS + RETRY_DELAY_MS + 1500;

beforeEach(() => {
  stubMatchMedia();
  rejectUnexpectedFetch();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal('requestIdleCallback', undefined);
  vi.stubGlobal('cancelIdleCallback', undefined);
  vi.stubGlobal('location', { ...window.location, reload });
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('App when the accessibility widget cannot be loaded', () => {
  it('makes the widget lazy without the reload, and every other lazy with it', () => {
    const widget = lazyCalls.filter((call) => call.source.includes('AccessibilityWidget'));
    const others = lazyCalls.filter((call) => !call.source.includes('AccessibilityWidget'));

    expect(widget).toHaveLength(1);
    expect(widget[0].options).toEqual({ canReload: false });
    expect(others.length).toBeGreaterThan(5);
    expect(others.every((call) => call.options === undefined)).toBe(true);
  });

  it('keeps the page and shows no recovery panel when the widget chunk fails', async () => {
    renderWithProviders(<App />, { route: '/nao-existe' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Página não encontrada' }, { timeout: 20_000 })).toBeInTheDocument();

    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));

    expect(screen.queryByRole('button', { name: 'Abrir opções de acessibilidade' })).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(RELOAD_STORAGE_KEY)).toBeNull();
  });
});
