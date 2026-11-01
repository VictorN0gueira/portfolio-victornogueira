import { render, screen } from '@testing-library/react';
import { Component, Suspense, createElement, type ComponentType, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RELOAD_GUARD_MS, RELOAD_STORAGE_KEY, RETRY_DELAY_MS, importWithRetry, lazyWithRetry, recoverFailedImports } from './lazyWithRetry';

const CHUNK_ERROR_MESSAGE = 'Failed to fetch dynamically imported module: https://vnone.com.br/assets/Page-abc123.js';
const reload = vi.fn();

function chunkError(): Error {
  return new TypeError(CHUNK_ERROR_MESSAGE);
}

/** A bare boundary, so the rejection of a lazy that failed is caught the way the app catches it and is not left unhandled. */
const caught: { error: unknown } = { error: undefined };

class CatchAll extends Component<{ children: ReactNode }, { hasFailed: boolean }> {
  state = { hasFailed: false };

  static getDerivedStateFromError(error: unknown) {
    caught.error = error;
    return { hasFailed: true };
  }

  render() {
    return this.state.hasFailed ? createElement('p', null, 'falhou') : this.props.children;
  }
}

function moduleOf(label: string): { default: ComponentType } {
  return { default: () => createElement('p', null, label) };
}

beforeEach(() => {
  vi.useFakeTimers();
  reload.mockClear();
  window.sessionStorage.clear();
  vi.stubGlobal('location', { ...window.location, reload });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
});

describe('importWithRetry', () => {
  it('returns the module at once when the first import works, with no timer left', async () => {
    const factory = vi.fn().mockResolvedValue('module');

    await expect(importWithRetry(factory)).resolves.toBe('module');

    expect(factory).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('tries once more after one second when the first import fails, and returns that module', async () => {
    const factory = vi.fn().mockRejectedValueOnce(chunkError()).mockResolvedValueOnce('module');

    const loading = importWithRetry(factory);
    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS - 1);
    expect(factory).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);

    await expect(loading).resolves.toBe('module');
    expect(factory).toHaveBeenCalledTimes(2);
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads the page once, and never settles, when the retry also fails with a chunk error', async () => {
    const factory = vi.fn().mockRejectedValue(chunkError());
    const settled = vi.fn();

    importWithRetry(factory).then(settled, settled);
    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS + 1000);

    expect(factory).toHaveBeenCalledTimes(2);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem(RELOAD_STORAGE_KEY)).not.toBeNull();
    expect(settled).not.toHaveBeenCalled();
  });

  it('recognizes the chunk errors of the other browsers and of a bundler', async () => {
    const messages = [
      'Importing a module script failed.',
      'error loading dynamically imported module: https://vnone.com.br/a.js',
      'Loading chunk 7 failed.',
    ];

    for (const message of messages) {
      window.sessionStorage.clear();
      reload.mockClear();
      const factory = vi.fn().mockRejectedValue(new TypeError(message));
      importWithRetry(factory).catch(() => undefined);
      await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS + 10);
      expect(reload, message).toHaveBeenCalledTimes(1);
    }

    window.sessionStorage.clear();
    reload.mockClear();
    const named = Object.assign(new Error('timeout'), { name: 'ChunkLoadError' });
    importWithRetry(vi.fn().mockRejectedValue(named)).catch(() => undefined);
    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS + 10);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not reload a second time right after one: the guard stops a reload loop and the error reaches the caller', async () => {
    window.sessionStorage.setItem(RELOAD_STORAGE_KEY, String(Date.now()));
    const failure = chunkError();
    const factory = vi.fn().mockRejectedValue(failure);

    const loading = importWithRetry(factory);
    const outcome = expect(loading).rejects.toBe(failure);
    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS + 10);

    await outcome;
    expect(reload).not.toHaveBeenCalled();
  });

  it('may reload again for a later deploy, once the guard is old enough', async () => {
    window.sessionStorage.setItem(RELOAD_STORAGE_KEY, String(Date.now() - RELOAD_GUARD_MS - 1));
    importWithRetry(vi.fn().mockRejectedValue(chunkError())).catch(() => undefined);

    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS + 10);

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('hands over an error that is not a chunk error after the retry, without reloading', async () => {
    const failure = new Error('the module threw while it was evaluated');
    const factory = vi.fn().mockRejectedValue(failure);

    const outcome = expect(importWithRetry(factory)).rejects.toBe(failure);
    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS + 10);

    await outcome;
    expect(factory).toHaveBeenCalledTimes(2);
    expect(reload).not.toHaveBeenCalled();
  });

  it('does not reload when the browser blocks session storage: with no guard a missing chunk would reload forever', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const failure = chunkError();
    const outcome = expect(importWithRetry(vi.fn().mockRejectedValue(failure))).rejects.toBe(failure);

    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS + 10);

    await outcome;
    expect(reload).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('does not reload when the stamp cannot be read, even if it can be written: an unreadable guard is a guard that may be set', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const failure = chunkError();
    const outcome = expect(importWithRetry(vi.fn().mockRejectedValue(failure))).rejects.toBe(failure);

    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS + 10);

    await outcome;
    expect(reload).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('does not reload when the stamp cannot be written, even if it can be read', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const failure = chunkError();
    const outcome = expect(importWithRetry(vi.fn().mockRejectedValue(failure))).rejects.toBe(failure);

    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS + 10);

    await outcome;
    expect(reload).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});

function inCatchAll(Page: ComponentType) {
  return createElement(CatchAll, null, createElement(Suspense, { fallback: 'carregando' }, createElement(Page)));
}

describe('lazyWithRetry', () => {
  it('renders the default export of the module like React.lazy, passing the props through', async () => {
    vi.useRealTimers();
    const Greeting = lazyWithRetry(() => Promise.resolve({ default: ({ name }: { name: string }) => createElement('p', null, `oi ${name}`) }));

    render(createElement(Suspense, { fallback: 'carregando' }, createElement(Greeting, { name: 'Ana' })));

    expect(await screen.findByText('oi Ana')).toBeInTheDocument();
  });

  it('does not import again by itself after a failure, and does after recoverFailedImports, so a boundary retry can recover', async () => {
    vi.useRealTimers();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const factory = vi.fn<() => Promise<{ default: ComponentType }>>();
    factory.mockRejectedValue(new Error('first and second attempts fail'));
    const Page = lazyWithRetry(factory);
    const Frame = () => createElement(CatchAll, null, createElement(Suspense, { fallback: 'carregando' }, createElement(Page)));

    // The retry waits one second between the two attempts, with real timers here.
    const first = render(createElement(Frame));
    await vi.waitFor(() => expect(factory).toHaveBeenCalledTimes(2), { timeout: 3000 });
    // The failed import is not started again by itself: that would loop and the boundary would never show.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(factory).toHaveBeenCalledTimes(2);
    first.unmount();

    recoverFailedImports(caught.error);
    factory.mockResolvedValue(moduleOf('recuperada'));
    render(createElement(Frame));

    expect(await screen.findByText('recuperada')).toBeInTheDocument();
    expect(factory).toHaveBeenCalledTimes(3);
    vi.restoreAllMocks();
  });

  it('says ready, and does not reload, after a failure that was not a chunk error', async () => {
    vi.useRealTimers();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const Page = lazyWithRetry(vi.fn().mockRejectedValue(new Error('the module threw')));
    const view = render(createElement(CatchAll, null, createElement(Suspense, { fallback: 'carregando' }, createElement(Page))));
    await vi.waitFor(() => expect(window.sessionStorage.length).toBe(0), { timeout: 3000 });
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS + 200));
    view.unmount();

    expect(recoverFailedImports(caught.error)).toBe('ready');
    expect(reload).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('reloads the page instead, after a chunk error, because the browser keeps a failed import for the document', async () => {
    vi.useRealTimers();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    // A reload for this chunk happened a moment ago, so the automatic one is held back and the error reaches us.
    window.sessionStorage.setItem(RELOAD_STORAGE_KEY, String(Date.now()));
    const Page = lazyWithRetry(vi.fn().mockRejectedValue(chunkError()));
    const view = render(createElement(CatchAll, null, createElement(Suspense, { fallback: 'carregando' }, createElement(Page))));
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS + 300));
    view.unmount();
    expect(reload).not.toHaveBeenCalled();

    expect(recoverFailedImports(caught.error)).toBe('reloading');
    expect(reload).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });

  it('reloads only for the lazy that failed: another chunk that failed, or a render error, never arms a reload', async () => {
    vi.useRealTimers();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    window.sessionStorage.setItem(RELOAD_STORAGE_KEY, String(Date.now()));
    const Missing = lazyWithRetry(vi.fn().mockRejectedValue(chunkError()));
    const view = render(inCatchAll(Missing));
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS + 300));
    const missingChunk = caught.error;
    view.unmount();

    // An unrelated section threw while it rendered: its retry must not reload the page because of the other failure.
    expect(recoverFailedImports(new Error('render failed'))).toBe('ready');
    expect(reload).not.toHaveBeenCalled();
    expect(recoverFailedImports(missingChunk)).toBe('reloading');
    expect(reload).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });

  it('swaps in a fresh lazy only for the one that failed', async () => {
    vi.useRealTimers();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const factoryA = vi.fn<() => Promise<{ default: ComponentType }>>().mockRejectedValue(new Error('a is broken'));
    const factoryB = vi.fn<() => Promise<{ default: ComponentType }>>().mockRejectedValue(new Error('b is broken'));
    const A = lazyWithRetry(factoryA);
    const B = lazyWithRetry(factoryB);
    const viewA = render(inCatchAll(A));
    await vi.waitFor(() => expect(factoryA).toHaveBeenCalledTimes(2), { timeout: 3000 });
    await screen.findByText('falhou');
    const errorA = caught.error;
    viewA.unmount();
    const viewB = render(inCatchAll(B));
    await vi.waitFor(() => expect(factoryB).toHaveBeenCalledTimes(2), { timeout: 3000 });
    await screen.findByText('falhou');
    viewB.unmount();

    recoverFailedImports(errorA);
    factoryA.mockResolvedValue(moduleOf('a voltou'));
    render(inCatchAll(A));
    expect(await screen.findByText('a voltou')).toBeInTheDocument();
    render(inCatchAll(B));

    expect(await screen.findByText('falhou')).toBeInTheDocument();
    expect(factoryB).toHaveBeenCalledTimes(2);
    vi.restoreAllMocks();
  });

  it('does not reload for a lazy made with canReload false: its chunk error just reaches the boundary', async () => {
    vi.useRealTimers();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const Widget = lazyWithRetry(vi.fn().mockRejectedValue(chunkError()), { canReload: false });
    const view = render(inCatchAll(Widget));

    expect(await screen.findByText('falhou', undefined, { timeout: 4000 })).toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(RELOAD_STORAGE_KEY)).toBeNull();
    view.unmount();
    vi.restoreAllMocks();
  });
});
