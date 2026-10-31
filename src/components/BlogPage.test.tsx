import { fireEvent, screen, waitFor } from '@testing-library/react';
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
  getNewsArticles.mockResolvedValue({ articles: [1, 2, 3].map(newsArticle), source: 'edge-function' });
});

const articlesText = () => screen.queryAllByText(/Artigo de teste|Article in English/);

describe('BlogPage states', () => {
  it('shows the loading skeleton until the sources answer, then the articles', async () => {
    let answer: (value: unknown) => void = () => undefined;
    getNewsArticles.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    const { container } = renderWithProviders(<BlogPage />, { route: '/blog' });

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    expect(articlesText()).toHaveLength(0);

    answer({ articles: [newsArticle(1)], source: 'cache' });
    await waitFor(() => expect(articlesText().length).toBeGreaterThan(0));
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(0);
  });

  it('says so when the sources fail, with the reason', async () => {
    getNewsArticles.mockRejectedValue(new Error('A rede caiu'));
    renderWithProviders(<BlogPage />, { route: '/blog' });

    expect(await screen.findByText('Ops! Algo deu errado')).toBeInTheDocument();
    expect(screen.getByText('A rede caiu')).toBeInTheDocument();
  });

  it('says so when there is no article at all', async () => {
    getNewsArticles.mockResolvedValue({ articles: [], source: 'fallback' });
    renderWithProviders(<BlogPage />, { route: '/blog' });

    expect(await screen.findByText('Nenhuma notícia encontrada')).toBeInTheDocument();
  });

  it('asks the sources again, with the cache dropped, when the visitor presses Atualizar', async () => {
    localStorage.setItem('blog_news_cache', 'stale');
    const user = userEvent.setup();
    renderWithProviders(<BlogPage />, { route: '/blog' });
    await waitFor(() => expect(articlesText().length).toBeGreaterThan(0));
    expect(getNewsArticles).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /Atualizar/ }));

    await waitFor(() => expect(getNewsArticles).toHaveBeenCalledTimes(2));
    expect(localStorage.getItem('blog_news_cache')).toBeNull();
    await waitFor(() => expect(articlesText().length).toBeGreaterThan(0));
  });

  it('shows the fallback cover when a cover image fails to load', async () => {
    renderWithProviders(<BlogPage />, { route: '/blog' });
    await waitFor(() => expect(articlesText().length).toBeGreaterThan(0));
    const cover = document.querySelector('a img') as HTMLImageElement;

    fireEvent.error(cover);

    expect(cover.src.startsWith('data:image/svg+xml')).toBe(true);
  });
});

describe('BlogPage cards and labels', () => {
  it('marks a fresh article as new, tags the language and the topic, and falls back when there is no cover', async () => {
    const fresh = { ...newsArticle(1), title: 'Workflow n8n novo', publishedAt: new Date().toISOString(), image: '' };
    const english = { ...newsArticle(2), title: 'Autonomous agent loop', language: 'en' as const };
    getNewsArticles.mockResolvedValue({ articles: [fresh, english, { ...newsArticle(3), title: 'Outro tema' }], source: 'cache' });
    renderWithProviders(<BlogPage />, { route: '/blog' });

    expect(await screen.findByText('NOVO')).toBeInTheDocument();
    expect(screen.getAllByText('English').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Português').length).toBeGreaterThan(0);
    const covers = Array.from(document.querySelectorAll<HTMLImageElement>('a img'));
    expect(covers.some((cover) => cover.src.startsWith('data:image/svg+xml'))).toBe(true);
  });

  it.each([
    ['cache', /Cache local/],
    ['edge-function', /Atualizado agora/],
    ['devto', /Dev.to ao vivo/],
    ['stale-cache', /Cache anterior/],
    ['fallback', /Artigos curados/],
  ])('tells where the articles came from: %s', async (source, label) => {
    getNewsArticles.mockResolvedValue({ articles: [newsArticle(1)], source });
    renderWithProviders(<BlogPage />, { route: '/blog' });

    expect(await screen.findByText(label)).toBeInTheDocument();
  });

  it('shows a generic message when a source fails with something that is not an Error', async () => {
    getNewsArticles.mockRejectedValue('quebrou');
    renderWithProviders(<BlogPage />, { route: '/blog' });

    expect(await screen.findByText('Erro ao carregar notícias')).toBeInTheDocument();
  });

  it('filters by the topic of an article', async () => {
    const user = userEvent.setup();
    getNewsArticles.mockResolvedValue({
      articles: [{ ...newsArticle(1), title: 'Workflow n8n' }, { ...newsArticle(2), title: 'Outro tema' }],
      source: 'cache',
    });
    renderWithProviders(<BlogPage />, { route: '/blog' });

    await user.click(await screen.findByRole('button', { name: 'N8N' }));

    expect((await screen.findAllByText('Workflow n8n')).length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.queryByText('Outro tema')).toBeNull());
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
    expect(await screen.findByText('Tente outros filtros ou limpe a busca.')).toBeInTheDocument();

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
    expect(await screen.findByText('Tente outros filtros ou limpe a busca.')).toBeInTheDocument();
  });
});

describe('BlogPage third party content', () => {
  it('sends no Referer with a cover image and decodes it off the main thread', async () => {
    renderWithProviders(<BlogPage />, { route: '/blog' });
    await waitFor(() => expect(screen.getAllByText(/Artigo de teste/).length).toBeGreaterThan(0));

    const covers = Array.from(document.querySelectorAll('a img'));
    expect(covers.length).toBeGreaterThan(0);
    for (const cover of covers) {
      expect(cover).toHaveAttribute('referrerpolicy', 'no-referrer');
      expect(cover).toHaveAttribute('decoding', 'async');
      expect(cover).toHaveAttribute('loading', 'lazy');
    }
  });

  it('opens every article in a new tab with noopener and noreferrer', async () => {
    renderWithProviders(<BlogPage />, { route: '/blog' });
    await waitFor(() => expect(screen.getAllByText(/Artigo de teste/).length).toBeGreaterThan(0));

    const external = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="https://example.com/artigo-"]'));
    expect(external.length).toBeGreaterThan(0);
    for (const link of external) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link.rel.split(' ').sort()).toEqual(['noopener', 'noreferrer']);
    }
  });
});
