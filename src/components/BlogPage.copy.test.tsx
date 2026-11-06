import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../test/render';
import type { NewsArticle } from '../utils/newsService';
import BlogPage from './BlogPage';

const getNewsArticles = vi.hoisted(() => vi.fn());

vi.mock('../utils/newsService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/newsService')>()),
  getNewsArticles,
}));

const article: NewsArticle = {
  title: 'Artigo de teste',
  description: 'Resumo',
  url: 'https://example.com/artigo',
  image: 'https://images.unsplash.com/photo-1?w=800',
  publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  source: { name: 'Fonte', url: 'https://example.com' },
  language: 'pt',
};

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

beforeEach(() => {
  window.scrollTo = vi.fn();
  localStorage.clear();
  getNewsArticles.mockReset();
});

describe('BlogPage copy', () => {
  it.each(['edge-function', 'fallback'])(
    'says what the page is, with no filler and no claim that is not true (%s)',
    async (source) => {
      getNewsArticles.mockResolvedValue({ articles: [article], source });
      renderWithProviders(<BlogPage />, { route: '/blog' });
      await screen.findAllByText('Artigo de teste');

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Leituras sobre IA e automação');
      const text = document.body.textContent ?? '';
      expect(text).toMatch(/A gente junta artigos sobre inteligência artificial e automação/);
      expect(text).not.toMatch(
        /futuro é|inteligente|benefícios|curadas|Atualizado diariamente|Cache|server-side|GNews|portfólio/i,
      );
      expect(text).not.toMatch(/insights|Dev\.to ao vivo|chat[\s-]?bot/i);
    },
  );

  it('has no emoji badge, and the flags, which stay as decoration, are hidden from screen readers', async () => {
    getNewsArticles.mockResolvedValue({ articles: [article], source: 'stale-cache' });
    renderWithProviders(<BlogPage />, { route: '/blog' });
    await screen.findAllByText('Artigo de teste');

    const visibleToReaders = document.body.cloneNode(true) as HTMLElement;
    visibleToReaders.querySelectorAll('[aria-hidden="true"]').forEach((node) => node.remove());
    expect(visibleToReaders.textContent).not.toMatch(/\p{Extended_Pictographic}|\p{Regional_Indicator}/u);
  });

  it('uses no em dash, en dash or slash separator in what it shows', async () => {
    getNewsArticles.mockResolvedValue({ articles: [article], source: 'fallback' });
    renderWithProviders(<BlogPage />, { route: '/blog' });
    await screen.findAllByText('Artigo de teste');

    const text = document.body.textContent ?? '';
    expect(text).not.toContain(EM_DASH);
    expect(text).not.toContain(EN_DASH);
    expect(text).not.toMatch(/ \/ /);
  });

  it('says the links lead to the sites of the sources, which are not ours', async () => {
    getNewsArticles.mockResolvedValue({ articles: [article], source: 'edge-function' });
    renderWithProviders(<BlogPage />, { route: '/blog' });
    await screen.findAllByText('Artigo de teste');

    expect(
      screen.getByText('Os artigos vêm de sites de terceiros e os links levam aos sites de quem publicou.'),
    ).toBeInTheDocument();
  });
});
