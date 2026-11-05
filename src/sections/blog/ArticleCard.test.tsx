import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NewTabHint } from '../../components/ui/NewTabHint';
import { renderWithProviders } from '../../test/render';
import { ArticleCard } from './ArticleCard';
import { testArticle } from './articleFixtures';
import { NEW_TAB_HINT_ID } from './blogMeta';

const FRESH = () => new Date(Date.now() - 30 * 60 * 1000).toISOString();

function renderCard(props: Partial<Parameters<typeof ArticleCard>[0]> = {}) {
  return renderWithProviders(
    <>
      <NewTabHint id={NEW_TAB_HINT_ID} />
      <ArticleCard article={testArticle()} isFixedList={false} {...props} />
    </>,
  );
}

describe('ArticleCard', () => {
  it('is one link to the article that opens a new tab with noopener and noreferrer', () => {
    renderCard();

    const link = screen.getByRole('link', { name: 'Artigo de teste' });
    expect(link).toHaveAttribute('href', 'https://example.com/artigo');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')?.split(' ').sort()).toEqual(['noopener', 'noreferrer']);
  });

  it('names the link by the title and describes it by the tags, the summary, the meta and the new tab hint', () => {
    renderCard({ article: testArticle({ language: 'en', title: 'Autonomous agent loop', description: 'A summary' }) });

    const link = screen.getByRole('link', { name: 'Autonomous agent loop' });
    expect(link).toHaveAccessibleDescription(/English/);
    expect(link).toHaveAccessibleDescription(/Agentes/);
    expect(link).toHaveAccessibleDescription(/A summary/);
    expect(link).toHaveAccessibleDescription(/Fonte/);
    expect(link).toHaveAccessibleDescription(/abre em nova aba/);
  });

  it('puts the title in an h3 and marks an English title and summary with lang="en"', () => {
    renderCard({
      article: testArticle({ language: 'en', title: 'An English title', description: 'An English summary' }),
    });

    expect(screen.getByRole('heading', { level: 3, name: 'An English title' })).toHaveAttribute('lang', 'en');
    expect(screen.getByText('An English summary')).toHaveAttribute('lang', 'en');
  });

  it('leaves a Portuguese title and summary without a lang', () => {
    renderCard();

    expect(screen.getByRole('heading', { level: 3 })).not.toHaveAttribute('lang');
    expect(screen.getByText('Resumo do artigo')).not.toHaveAttribute('lang');
  });

  it('loads the cover with no referrer, decoded off the main thread and lazy, and falls back when it fails', () => {
    const { container } = renderCard();
    const cover = container.querySelector('img') as HTMLImageElement;

    expect(cover).toHaveAttribute('referrerpolicy', 'no-referrer');
    expect(cover).toHaveAttribute('decoding', 'async');
    expect(cover).toHaveAttribute('loading', 'lazy');
    expect(cover.src).toContain('images.unsplash.com');

    fireEvent.error(cover);

    expect(cover.src.startsWith('data:image/svg+xml')).toBe(true);
  });

  it('uses the fallback cover when the article has no image', () => {
    const { container } = renderCard({ article: testArticle({ image: '' }) });

    expect((container.querySelector('img') as HTMLImageElement).src.startsWith('data:image/svg+xml')).toBe(true);
  });

  it('says NOVO and how long ago for a fresh article of a live list', () => {
    renderCard({ article: testArticle({ publishedAt: FRESH() }) });

    expect(screen.getByText('NOVO')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAccessibleDescription(/NOVO/);
    expect(screen.getByRole('link').textContent).toMatch(/Agora mesmo/);
  });

  it('never says NOVO nor how long ago for the fixed list, whatever the date says', () => {
    renderCard({ article: testArticle({ publishedAt: FRESH() }), isFixedList: true });

    expect(screen.queryByText('NOVO')).toBeNull();
    expect(screen.getByRole('link').textContent).not.toMatch(/Agora mesmo|atrás|Ontem/);
  });

  it('gives the language pill and the topic pill the same opaque dark surface with white text', () => {
    const { container } = renderCard();

    const pills = Array.from(container.querySelectorAll('[id$="-tags"] > span'));
    expect(pills).toHaveLength(2);
    for (const pill of pills) {
      expect(pill).toHaveClass('bg-vn-black', 'text-vn-white');
      expect(pill.className).not.toMatch(/bg-vn-black\//);
    }
  });

  it('draws NOVO as a neutral pill, never in the accent: the accent is for the featured article', () => {
    const { container } = renderCard({ article: testArticle({ publishedAt: FRESH() }) });

    expect(container.querySelector('.bg-vn-accent')).toBeNull();
    expect(screen.getByText('NOVO')).toHaveClass('bg-vn-white', 'text-vn-ink');
  });

  it('wraps a long title and a long source name instead of cutting them', () => {
    renderCard({
      article: testArticle({
        title: 'Titulo'.repeat(30),
        source: { name: 'Fonte'.repeat(20), url: 'https://example.com' },
      }),
    });

    const title = screen.getByRole('heading', { level: 3 });
    expect(title).toHaveClass('break-words');
    expect(title.className).not.toMatch(/line-clamp|truncate/);
    expect(screen.getByText('Resumo do artigo').className).not.toMatch(/line-clamp|truncate/);
    expect(within(screen.getByRole('link')).getByText('Fonte'.repeat(20))).toHaveClass('break-words');
    expect(screen.getByRole('link').innerHTML).not.toMatch(/truncate/);
  });

  it('uses only the tokens of the system: no zinc, purple, cyan, gradient, blur, italic or dark:', () => {
    const { container } = renderCard({ article: testArticle({ publishedAt: FRESH() }) });

    expect(container.innerHTML).not.toMatch(/zinc|purple|cyan|gradient|blur|italic|dark:|from-|to-black/);
  });
});
