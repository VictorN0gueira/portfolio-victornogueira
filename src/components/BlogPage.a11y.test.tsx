import { screen, within } from '@testing-library/react';
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

function newsArticle(index: number, overrides: Partial<NewsArticle> = {}): NewsArticle {
  return {
    title: `Artigo de teste ${index}`,
    description: `Resumo do artigo ${index}`,
    url: `https://example.com/artigo-${index}`,
    image: `https://images.unsplash.com/photo-${index}?w=800`,
    publishedAt: new Date(Date.now() - (index + 1) * 24 * 60 * 60 * 1000).toISOString(),
    source: { name: 'Fonte', url: 'https://example.com' },
    language: 'pt',
    ...overrides,
  };
}

const english = newsArticle(4, { title: 'Article in English', description: 'An English summary', language: 'en' });

beforeEach(() => {
  window.scrollTo = vi.fn();
  localStorage.clear();
  getNewsArticles.mockReset();
  getNewsArticles.mockResolvedValue({ articles: [newsArticle(1), newsArticle(2), english], source: 'edge-function' });
});

async function renderLoaded() {
  const user = userEvent.setup();
  const view = renderWithProviders(<BlogPage />, { route: '/blog' });
  await screen.findAllByText('Artigo de teste 1');
  return { user, ...view };
}

describe('BlogPage landmarks', () => {
  it('has a banner with the way back, one main landmark named by the title, and a footer', async () => {
    await renderLoaded();

    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
    expect(main).toHaveAttribute('tabindex', '-1');
    expect(main).toHaveAccessibleName(screen.getByRole('heading', { level: 1 }).textContent ?? '');
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(within(screen.getByRole('banner')).getByRole('link', { name: 'Voltar para a VN One' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(within(main).queryByRole('banner')).toBeNull();
  });

  it('starts with the skip link, which moves focus to the main landmark', async () => {
    const { user } = await renderLoaded();

    await user.tab();
    const skip = screen.getByRole('link', { name: 'Pular para o conteúdo' });
    expect(skip).toHaveFocus();

    await user.keyboard('{Enter}');

    expect(screen.getByRole('main')).toHaveFocus();
    expect(window.location.hash).toBe('');
  });

  it('keeps the heading levels in order: one h1, then h2, then h3, never a jump', async () => {
    await renderLoaded();

    const levels = screen.getAllByRole('heading').map((heading) => Number(heading.tagName.slice(1)));
    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    expect(levels[0]).toBe(1);
    levels.forEach((level, index) => {
      if (index > 0) expect(level - levels[index - 1]).toBeLessThanOrEqual(1);
    });
  });

  it('keeps the order when the sources fail and when there is nothing to show', async () => {
    getNewsArticles.mockRejectedValue(new Error('A rede caiu'));
    renderWithProviders(<BlogPage />, { route: '/blog' });

    const error = await screen.findByRole('heading', { name: 'Ops! Algo deu errado' });
    expect(error.tagName).toBe('H2');
  });

  it('says there is no news with an h2, not an h3 under the h1', async () => {
    getNewsArticles.mockResolvedValue({ articles: [], source: 'fallback' });
    renderWithProviders(<BlogPage />, { route: '/blog' });

    const empty = await screen.findByRole('heading', { name: 'Nenhuma notícia encontrada' });
    expect(empty.tagName).toBe('H2');
  });

  it('does not move focus when the page is the first one the visitor opened', async () => {
    await renderLoaded();

    expect(screen.getByRole('main')).not.toHaveFocus();
  });

  it('announces the loading as a status while the sources answer', async () => {
    getNewsArticles.mockReturnValue(new Promise(() => undefined));
    renderWithProviders(<BlogPage />, { route: '/blog' });

    expect(screen.getByRole('status', { name: 'Carregando artigos' })).toBeInTheDocument();
  });
});

describe('BlogPage search and filters', () => {
  it('names the clear button, makes it a plain button, and gives it a target of at least 44px', async () => {
    const { user } = await renderLoaded();
    expect(screen.queryByRole('button', { name: 'Limpar busca' })).toBeNull();

    await user.type(screen.getByRole('textbox', { name: 'Buscar artigos' }), 'Article');
    const clear = screen.getByRole('button', { name: 'Limpar busca' });

    expect(clear).toHaveAttribute('type', 'button');
    expect(clear).toHaveClass('size-11');
    await user.click(clear);
    expect(screen.getByRole('textbox', { name: 'Buscar artigos' })).toHaveValue('');
  });

  it('draws a focus ring on the search field instead of removing the outline', async () => {
    await renderLoaded();

    const search = screen.getByRole('textbox', { name: 'Buscar artigos' });
    expect(search).toHaveClass('vn-focus-ring-ink');
    expect(search).not.toHaveClass('focus:outline-none');
  });

  it('exposes which language and which topic is selected with aria-pressed', async () => {
    const { user } = await renderLoaded();
    const languages = within(screen.getByRole('group', { name: 'Filtrar por idioma' }));
    const topics = within(screen.getByRole('group', { name: 'Filtrar por tópico' }));

    expect(languages.getByRole('button', { name: 'Todos idiomas' })).toHaveAttribute('aria-pressed', 'true');
    expect(languages.getByRole('button', { name: /English/ })).toHaveAttribute('aria-pressed', 'false');
    expect(topics.getByRole('button', { name: 'Todos tópicos' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(languages.getByRole('button', { name: /English/ }));
    await user.click(topics.getByRole('button', { name: 'N8N' }));

    expect(languages.getByRole('button', { name: /English/ })).toHaveAttribute('aria-pressed', 'true');
    expect(languages.getByRole('button', { name: 'Todos idiomas' })).toHaveAttribute('aria-pressed', 'false');
    expect(topics.getByRole('button', { name: 'N8N' })).toHaveAttribute('aria-pressed', 'true');
    expect(topics.getByRole('button', { name: 'Todos tópicos' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps the flags out of the name of a language filter', async () => {
    await renderLoaded();

    expect(screen.getByRole('button', { name: 'Português' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'English' })).toHaveTextContent('English');
  });
});

describe('BlogPage article cards', () => {
  it('names each card link by the title of the article and keeps the rest as its description', async () => {
    await renderLoaded();

    const link = screen.getByRole('link', { name: 'Artigo de teste 2' });
    expect(link).toHaveAttribute('href', 'https://example.com/artigo-2');
    expect(link).toHaveAccessibleDescription(/Resumo do artigo 2/);
    expect(link).toHaveAccessibleDescription(/Português/);
    expect(link).toHaveAccessibleDescription(/Fonte/);
  });

  it('tells screen readers that every article opens in a new tab, with one hint the links point at', async () => {
    await renderLoaded();

    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="https://example.com/artigo-"]'));
    expect(links).toHaveLength(3);
    for (const link of links) {
      expect(link).toHaveAccessibleDescription(/abre em nova aba/);
    }
    expect(document.querySelectorAll('[id="blog-new-tab-hint"]')).toHaveLength(1);
  });

  it('marks English article text as English and leaves the Portuguese text unmarked', async () => {
    await renderLoaded();

    const englishLink = screen.getByRole('link', { name: 'Article in English' });
    const title = within(englishLink).getByText('Article in English');
    const summary = within(englishLink).getByText('An English summary');
    expect(title.closest('[lang]')).toHaveAttribute('lang', 'en');
    expect(summary.closest('[lang]')).toHaveAttribute('lang', 'en');
    expect(within(screen.getByRole('link', { name: 'Artigo de teste 2' })).getByText('Resumo do artigo 2').closest('[lang]')).toBeNull();
  });

  it('puts the article titles one level under a heading of the list', async () => {
    await renderLoaded();

    const list = screen.getByRole('heading', { level: 2, name: 'Artigos' });
    expect(list).toBeInTheDocument();
    const titles = screen.getAllByRole('heading', { level: 3 });
    expect(titles.map((title) => title.textContent)).toEqual(['Artigo de teste 1', 'Artigo de teste 2', 'Article in English']);
  });
});
