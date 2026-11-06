import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../test/render';
import type { NewsArticle } from '../utils/newsService';
import BlogPage from './BlogPage';

const getNewsArticles = vi.hoisted(() => vi.fn());

vi.mock('../utils/newsService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/newsService')>()),
  getNewsArticles,
}));

function newsArticle(index: number): NewsArticle {
  return {
    title: `Artigo de teste ${index}`,
    description: 'Resumo',
    url: `https://example.com/artigo-${index}`,
    image: `https://images.unsplash.com/photo-${index}?w=800`,
    publishedAt: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
    source: { name: 'Fonte', url: 'https://example.com' },
    language: 'pt',
  };
}

beforeEach(() => {
  window.scrollTo = vi.fn();
  localStorage.clear();
  getNewsArticles.mockReset();
  getNewsArticles.mockResolvedValue({ articles: [1, 2, 3].map(newsArticle), source: 'edge-function', origin: 'live' });
});

const articlesText = () => screen.queryAllByText(/Artigo de teste|Article in English/);

describe('BlogPage result count as a live region', () => {
  it('announces the count through one polite status region that is already in the page before a filter is used', async () => {
    const user = userEvent.setup();
    getNewsArticles.mockResolvedValue({
      articles: [newsArticle(1), newsArticle(2)],
      source: 'edge-function',
      origin: 'live',
    });
    renderWithProviders(<BlogPage />, { route: '/blog' });
    const search = await screen.findByLabelText('Buscar artigos');
    const regions = () =>
      screen.getAllByRole('status').filter((region) => region.getAttribute('aria-label') !== 'Carregando artigos');
    const before = regions();
    const counterBefore = before[before.length - 1];
    expect(counterBefore).toBeEmptyDOMElement();

    await user.type(search, 'Artigo de teste 1');

    const counter = screen.getByText(/1 artigo encontrado/);
    expect(counter).toBe(counterBefore);
    expect(counter).toHaveAttribute('role', 'status');
  });

  it('does not announce the empty results block a second time: the count says it, the block is plain text', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BlogPage />, { route: '/blog' });
    await user.type(await screen.findByLabelText('Buscar artigos'), 'nada disso existe');

    const counter = await screen.findByText(/0 artigos encontrados/);
    expect(counter).toHaveAttribute('role', 'status');
    const empty = await screen.findByText('Nenhum artigo encontrado');
    expect(empty.closest('[role="status"], [role="alert"], [aria-live]')).toBeNull();
    expect(screen.getAllByText(/\d+ artigos? encontrados?/)).toHaveLength(1);
  });
});

describe('BlogPage loads that overlap', () => {
  it('stops listening to the load before when a refresh starts a new one', async () => {
    const abort = vi.spyOn(AbortController.prototype, 'abort');
    const user = userEvent.setup();
    renderWithProviders(<BlogPage />, { route: '/blog' });
    await waitFor(() => expect(articlesText().length).toBeGreaterThan(0));
    const aborted = abort.mock.calls.length;

    await user.click(screen.getByRole('button', { name: /Atualizar/ }));

    await waitFor(() => expect(abort.mock.calls.length).toBeGreaterThan(aborted));
    abort.mockRestore();
  });

  it('ignores the answer of a refresh that comes after the page is gone', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const user = userEvent.setup();
    const { unmount } = renderWithProviders(<BlogPage />, { route: '/blog' });
    await waitFor(() => expect(articlesText().length).toBeGreaterThan(0));
    let answer: (value: unknown) => void = () => undefined;
    getNewsArticles.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    await user.click(screen.getByRole('button', { name: /Atualizar/ }));
    const abort = vi.spyOn(AbortController.prototype, 'abort');

    unmount();
    answer({ articles: [newsArticle(9)], source: 'cache' });
    await Promise.resolve();

    expect(abort).toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    abort.mockRestore();
    consoleError.mockRestore();
  });

  it('shows the answer of the load that is current, not an older one that arrives later (StrictMode runs the effect twice)', async () => {
    const answers: Array<(value: unknown) => void> = [];
    getNewsArticles.mockImplementation(() => new Promise((resolve) => answers.push(resolve)));
    renderWithProviders(<BlogPage />, { route: '/blog', strict: true });
    await waitFor(() => expect(answers.length).toBeGreaterThanOrEqual(2));

    answers[answers.length - 1]({ articles: [{ ...newsArticle(1), title: 'Resposta nova' }], source: 'cache' });
    await screen.findAllByText('Resposta nova');
    answers[0]({ articles: [{ ...newsArticle(2), title: 'Resposta velha' }], source: 'cache' });
    await Promise.resolve();

    expect(screen.queryByText('Resposta velha')).toBeNull();
    expect(screen.getAllByText('Resposta nova').length).toBeGreaterThan(0);
  });
});

describe('BlogPage filters', () => {
  beforeEach(() => {
    const english = { ...newsArticle(4), title: 'Article in English', language: 'en' as const };
    getNewsArticles.mockResolvedValue({ articles: [newsArticle(1), newsArticle(2), english], source: 'edge-function' });
  });

  it('filters by language and counts what is left', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BlogPage />, { route: '/blog' });
    await waitFor(() => expect(screen.getByRole('button', { name: /English/ })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /English/ }));

    expect((await screen.findAllByText('Article in English')).length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.queryByText('Artigo de teste 1')).toBeNull());
    expect(await screen.findByText(/1 artigo encontrado/)).toBeInTheDocument();
  });

  it('filters by search, and says so when nothing matches, with a way back', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BlogPage />, { route: '/blog' });
    const search = await screen.findByLabelText('Buscar artigos');

    await user.type(search, 'nada disso existe');
    expect(await screen.findByText('Tenta outros filtros ou limpa a busca.')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Limpar filtros' })[0]);
    await waitFor(() => expect(articlesText().length).toBeGreaterThan(0));
    expect((screen.getByLabelText('Buscar artigos') as HTMLInputElement).value).toBe('');
  });

  it('filters by topic and clears the search with its own button', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BlogPage />, { route: '/blog' });
    const search = await screen.findByLabelText('Buscar artigos');

    await user.type(search, 'English');
    expect((await screen.findAllByText('Article in English')).length).toBeGreaterThan(0);
    await user.click(search.parentElement?.querySelector('button') as HTMLElement);
    expect((screen.getByLabelText('Buscar artigos') as HTMLInputElement).value).toBe('');

    await user.click(screen.getByRole('button', { name: 'N8N' }));
    expect(await screen.findByText('Tenta outros filtros ou limpa a busca.')).toBeInTheDocument();
  });
});

describe('BlogPage keeps the focus and the band of the filters', () => {
  it('keeps the filter band in the page while the sources answer, disabled, and enables it with the list', async () => {
    let answer: (value: unknown) => void = () => undefined;
    getNewsArticles.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    renderWithProviders(<BlogPage />, { route: '/blog' });

    expect(screen.getByRole('textbox', { name: 'Buscar artigos' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Todos idiomas' })).toBeDisabled();

    answer({ articles: [newsArticle(1)], source: 'edge-function', origin: 'live' });

    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Buscar artigos' })).toBeEnabled());
  });

  it('keeps the band mounted, disabled, while Atualizar loads again, and keeps what was typed', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BlogPage />, { route: '/blog' });
    await user.type(await screen.findByLabelText('Buscar artigos'), 'Artigo');
    getNewsArticles.mockReturnValue(new Promise(() => undefined));

    await user.click(screen.getByRole('button', { name: /Atualizar/ }));

    const search = screen.getByRole('textbox', { name: 'Buscar artigos' });
    expect(search).toBeDisabled();
    expect(search).toHaveValue('Artigo');
    expect(screen.getByRole('button', { name: /Atualizar/ })).toHaveFocus();
  });

  it('keeps the band in the page, usable and not busy, when the sources fail', async () => {
    getNewsArticles.mockRejectedValue(new Error('A rede caiu'));
    renderWithProviders(<BlogPage />, { route: '/blog' });

    await screen.findByText('Erro ao carregar notícias');

    const search = screen.getByRole('textbox', { name: 'Buscar artigos' });
    expect(search).toBeEnabled();
    expect(search.closest('[aria-busy]')).toHaveAttribute('aria-busy', 'false');
  });

  it('shows one alert, no success status and a usable band when a refresh throws', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BlogPage />, { route: '/blog' });
    await screen.findAllByText('Artigo de teste 1');
    expect(screen.getByText('Lista carregada agora')).toBeInTheDocument();
    getNewsArticles.mockRejectedValue(new Error('boom'));

    await user.click(screen.getByRole('button', { name: /Atualizar/ }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Erro ao carregar notícias');
    expect(alert).not.toHaveTextContent('boom');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.queryByText('Lista carregada agora')).toBeNull();
    const search = screen.getByRole('textbox', { name: 'Buscar artigos' });
    expect(search).toBeEnabled();
    expect(search.closest('[aria-busy]')).toHaveAttribute('aria-busy', 'false');
    expect(screen.queryByText(/artigos? encontrados?/)).toBeNull();
    expect(screen.getByRole('button', { name: /Atualizar/ })).toHaveAttribute('aria-disabled', 'false');
  });

  it('puts the focus on the search field after the Limpar filtros of the empty block, and the field is empty', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BlogPage />, { route: '/blog' });
    await user.type(await screen.findByLabelText('Buscar artigos'), 'nada disso existe');
    await screen.findByText('Tenta outros filtros ou limpa a busca.');

    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));

    expect(screen.getByRole('textbox', { name: 'Buscar artigos' })).toHaveFocus();
    expect(screen.getByRole('textbox', { name: 'Buscar artigos' })).toHaveValue('');
    expect(screen.getAllByRole('button', { name: 'Limpar filtros' })).toHaveLength(1);
  });

  it('puts the focus on the search field after Limpar filtros when only a chip filter is on, and goes back to Todos tópicos', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BlogPage />, { route: '/blog' });
    await user.click(await screen.findByRole('button', { name: 'N8N' }));
    await screen.findByText('Tenta outros filtros ou limpa a busca.');

    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));

    expect(screen.getByRole('textbox', { name: 'Buscar artigos' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Todos tópicos' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('BlogPage and the addresses it is given', () => {
  it('leaves out an article whose address is not http or https, and shows a repeated address once', async () => {
    const list = [
      { ...newsArticle(1), title: 'Mau', url: 'javascript:alert(1)' },
      { ...newsArticle(2), title: 'Bom', url: 'https://example.com/bom' },
      { ...newsArticle(3), title: 'Bom de novo', url: 'https://example.com/bom' },
    ];
    getNewsArticles.mockResolvedValue({ articles: list, source: 'edge-function', origin: 'live' });
    renderWithProviders(<BlogPage />, { route: '/blog' });

    expect(await screen.findByRole('heading', { level: 3, name: 'Bom' })).toBeInTheDocument();
    expect(screen.queryByText('Mau')).toBeNull();
    expect(screen.queryByText('Bom de novo')).toBeNull();
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('says there is no article at all when none has a usable address', async () => {
    getNewsArticles.mockResolvedValue({
      articles: [{ ...newsArticle(1), url: 'data:text/html,x' }],
      source: 'edge-function',
      origin: 'live',
    });
    renderWithProviders(<BlogPage />, { route: '/blog' });

    expect(await screen.findByText('Nenhuma notícia encontrada')).toBeInTheDocument();
  });
});
