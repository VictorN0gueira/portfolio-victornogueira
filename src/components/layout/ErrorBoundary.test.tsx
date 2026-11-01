import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Suspense, useState, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shellCopy } from '../../data/shellCopy';
import { lazyWithRetry } from '../../lib/lazyWithRetry';
import { ErrorBoundary } from './ErrorBoundary';

const state = { shouldThrow: true };

function Bomb() {
  if (state.shouldThrow) throw new Error('render failed');
  return <p>conteúdo da página</p>;
}

beforeEach(() => {
  state.shouldThrow = true;
  // React logs a caught render error to the console: it is expected here.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renders its children when nothing fails', () => {
    state.shouldThrow = false;
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText('conteúdo da página')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: shellCopy.errorBoundary.retry })).toBeNull();
  });

  it('shows a short message, a retry button and a WhatsApp link when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(shellCopy.errorBoundary.heading);
    expect(screen.getByRole('button', { name: shellCopy.errorBoundary.retry })).toBeInTheDocument();
    const whatsapp = screen.getByRole('link', { name: new RegExp(shellCopy.errorBoundary.whatsapp) });
    expect(whatsapp.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
    expect(whatsapp).toHaveAttribute('target', '_blank');
    expect(whatsapp).toHaveAttribute('rel', 'noopener noreferrer');
    expect(whatsapp).toHaveTextContent(shellCopy.errorBoundary.newTab);
  });

  it('renders the children again when the retry button is pressed, and they work this time', async () => {
    const user = userEvent.setup();
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    state.shouldThrow = false;
    await user.click(screen.getByRole('button', { name: shellCopy.errorBoundary.retry }));

    expect(screen.getByText('conteúdo da página')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows the fallback again when the retry fails again', async () => {
    const user = userEvent.setup();
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    await user.click(screen.getByRole('button', { name: shellCopy.errorBoundary.retry }));

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('uses the fallback it is given, with a retry that resets the boundary', async () => {
    const user = userEvent.setup();
    render(
      <ErrorBoundary fallback={(retry) => <button onClick={retry}>de novo, seção</button>}>
        <Bomb />
      </ErrorBoundary>,
    );

    state.shouldThrow = false;
    await user.click(screen.getByRole('button', { name: 'de novo, seção' }));

    expect(screen.getByText('conteúdo da página')).toBeInTheDocument();
  });

  it('keeps what is outside of a failing boundary, so one broken section leaves the others', () => {
    render(
      <>
        <header>cabeçalho</header>
        <ErrorBoundary>
          <Bomb />
        </ErrorBoundary>
        <p>outra seção</p>
        <footer>rodapé</footer>
      </>,
    );

    expect(screen.getByText('cabeçalho')).toBeInTheDocument();
    expect(screen.getByText('outra seção')).toBeInTheDocument();
    expect(screen.getByText('rodapé')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('works under StrictMode: one fallback, and the retry recovers', async () => {
    const user = userEvent.setup();
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
      { reactStrictMode: true },
    );

    expect(screen.getAllByRole('alert')).toHaveLength(1);
    state.shouldThrow = false;
    await user.click(screen.getByRole('button', { name: shellCopy.errorBoundary.retry }));

    expect(screen.getByText('conteúdo da página')).toBeInTheDocument();
  });
});

describe('ErrorBoundary around a lazy page that fails to load', () => {
  it('shows the boundary when the dynamic import rejects, and the retry button loads the page', async () => {
    const user = userEvent.setup();
    const factory = vi.fn<() => Promise<{ default: () => ReactNode }>>();
    factory.mockRejectedValue(new Error('chunk is gone'));
    const Page = lazyWithRetry(factory);

    function Shell() {
      const [label] = useState('app');
      return (
        <section aria-label={label}>
          <ErrorBoundary>
            <Suspense fallback={<p>carregando</p>}>
              <Page />
            </Suspense>
          </ErrorBoundary>
        </section>
      );
    }

    render(<Shell />);
    // The retry waits one second between its two attempts, with real timers here.
    const retry = await screen.findByRole('button', { name: shellCopy.errorBoundary.retry }, { timeout: 4000 });
    expect(factory).toHaveBeenCalledTimes(2);

    factory.mockResolvedValue({ default: () => <p>página carregada</p> });
    await user.click(retry);

    expect(await screen.findByText('página carregada')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('reloads the page when the retry button is pressed after a chunk could not be fetched', async () => {
    const user = userEvent.setup();
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    // The automatic reload happened a moment ago, so the chunk error reaches the boundary.
    window.sessionStorage.setItem('vn-chunk-reload', String(Date.now()));
    const factory = vi.fn<() => Promise<{ default: () => ReactNode }>>();
    factory.mockRejectedValue(new TypeError('Failed to fetch dynamically imported module: https://vnone.com.br/a.js'));
    const Page = lazyWithRetry(factory);
    const caughtErrors = vi.spyOn(ErrorBoundary, 'getDerivedStateFromError');

    render(
      <ErrorBoundary>
        <Suspense fallback={<p>carregando</p>}>
          <Page />
        </Suspense>
      </ErrorBoundary>,
    );
    const retryButton = await screen.findByRole('button', { name: shellCopy.errorBoundary.retry }, { timeout: 4000 });
    const caughtBeforeRetry = caughtErrors.mock.calls.length;
    await user.click(retryButton);

    expect(reload).toHaveBeenCalledTimes(1);
    // The panel stays up while the page goes away: the boundary did not reset and the children did not throw again.
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(caughtErrors).toHaveBeenCalledTimes(caughtBeforeRetry);
    // The children were not rendered again: no new import was started in this document.
    expect(factory).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
    window.sessionStorage.clear();
  });
});
