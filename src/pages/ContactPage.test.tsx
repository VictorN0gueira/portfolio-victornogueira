import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RETRY_DELAY_MS } from '../lib/lazyWithRetry';
import { stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import ContactPage from './ContactPage';

const scrollToIdWhenMounted = vi.hoisted(() => vi.fn(() => () => undefined));
vi.mock('../lib/scrollToIdWhenMounted', () => ({ scrollToIdWhenMounted }));

// Every lazy section of the page goes through lazyWithRetry. Here the first import of each one fails like a chunk that a
// deploy deleted, so a page that kept a bare React.lazy would sit on its error boundary instead of showing the section.
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

const LAZY_WAIT = { timeout: RETRY_DELAY_MS + 8000 };

describe('ContactPage', () => {
  beforeEach(() => {
    scrollToIdWhenMounted.mockClear();
    failedFirstLoads.count = 0;
    stubMatchMedia();
  });

  it('retries a chunk that failed to load, for the simulator, the form and the questions', async () => {
    renderWithProviders(<ContactPage />, { route: '/contato' });

    expect(await screen.findByText('Pessoas que executam essa tarefa', undefined, LAZY_WAIT)).toBeInTheDocument();
    expect(await screen.findByRole('form', { name: 'Formulário de contato' }, LAZY_WAIT)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /meu negócio é pequeno demais/i }, LAZY_WAIT)).toBeInTheDocument();
    expect(failedFirstLoads.count).toBe(3);
  }, 20_000);

  it('has one h1, the simulator title, and keeps the form and the questions below it', async () => {
    renderWithProviders(<ContactPage />, { route: '/contato' });
    await screen.findByRole('button', { name: /meu negócio é pequeno demais/i }, LAZY_WAIT);

    const titles = screen.getAllByRole('heading', { level: 1 });
    expect(titles.map((title) => title.textContent)).toEqual(['Quanto sua empresa perde por ano?']);
    expect(titles[0]).toHaveClass('text-4xl', 'md:text-7xl');
    expect(screen.getByRole('heading', { level: 2, name: /conta o que você precisa/i })).toBeInTheDocument();
  }, 20_000);

  it('after "Quero automatizar esse processo" sends the visitor to the form, scrolls there and moves focus into the message', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactPage />, { route: '/contato' });
    await user.click(await screen.findByRole('button', { name: 'Quero automatizar esse processo' }, LAZY_WAIT));

    expect(scrollToIdWhenMounted).toHaveBeenCalledTimes(1);
    const [id, options] = scrollToIdWhenMounted.mock.calls[0] as unknown as [string, { focus: (section: HTMLElement) => HTMLElement | null }];
    expect(id).toBe('contato');
    const section = document.getElementById('contato') as HTMLElement;
    expect(options.focus(section)).toBe(screen.getByRole('textbox', { name: 'Mensagem' }));
  }, 20_000);

  it('cancels the pending scroll when the visitor leaves the page, so Back within seconds cannot scroll the next page', async () => {
    const cancel = vi.fn();
    scrollToIdWhenMounted.mockReturnValueOnce(cancel);
    const user = userEvent.setup();
    const { unmount } = renderWithProviders(<ContactPage />, { route: '/contato' });
    await user.click(await screen.findByRole('button', { name: 'Quero automatizar esse processo' }, LAZY_WAIT));
    expect(cancel).not.toHaveBeenCalled();

    unmount();

    expect(cancel).toHaveBeenCalledTimes(1);
  }, 20_000);

  it('cancels the previous scroll before starting the next one when the quote is requested twice', async () => {
    const firstCancel = vi.fn();
    const secondCancel = vi.fn();
    scrollToIdWhenMounted.mockReturnValueOnce(firstCancel).mockReturnValueOnce(secondCancel);
    const user = userEvent.setup();
    renderWithProviders(<ContactPage />, { route: '/contato' });
    const button = await screen.findByRole('button', { name: 'Quero automatizar esse processo' }, LAZY_WAIT);

    await user.click(button);
    expect(firstCancel).not.toHaveBeenCalled();
    await user.click(button);

    expect(firstCancel).toHaveBeenCalledTimes(1);
    expect(secondCancel).not.toHaveBeenCalled();
    expect(scrollToIdWhenMounted).toHaveBeenCalledTimes(2);
  }, 20_000);

  it('puts the quote back in the message on a second click with the same figures, after the visitor changed the text', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactPage />, { route: '/contato' });
    const button = await screen.findByRole('button', { name: 'Quero automatizar esse processo' }, LAZY_WAIT);
    const message = await screen.findByRole('textbox', { name: 'Mensagem' }, LAZY_WAIT);

    await user.click(button);
    const quote = (message as HTMLTextAreaElement).value;
    expect(quote).not.toBe('');
    await user.clear(message);
    await user.type(message, 'outro texto');
    expect(message).toHaveValue('outro texto');
    await user.click(button);

    expect(message).toHaveValue(quote);
  }, 20_000);
});
