import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/render';
import { testArticle } from './articleFixtures';
import { BlogResults } from './BlogResults';

type ResultsProps = Parameters<typeof BlogResults>[0];

function resultsProps(overrides: Partial<ResultsProps> = {}): ResultsProps {
  const articles = [testArticle({ title: 'Primeiro', url: 'https://example.com/1' })];
  return {
    isLoading: false,
    error: null,
    origin: 'live',
    articles,
    visibleArticles: articles,
    onClearFilters: vi.fn(),
    ...overrides,
  };
}

function listOf(count: number) {
  return Array.from({ length: count }, (_, index) =>
    testArticle({
      title: `Artigo ${index + 1}`,
      url: `https://example.com/${index + 1}`,
      image: `https://images.unsplash.com/photo-${index + 1}?w=800`,
    }),
  );
}

const covers = () => Array.from(document.querySelectorAll<HTMLImageElement>('a img'));
const isBrandCover = (cover: HTMLImageElement) => cover.src.startsWith('data:image/svg+xml');

describe('BlogResults when the list changes under the cards', () => {
  it('shows the cover of the new featured article after the one before it failed to load', () => {
    const [first, second] = listOf(2);
    const view = renderWithProviders(
      <BlogResults {...resultsProps({ articles: [first, second], visibleArticles: [first, second] })} />,
    );
    fireEvent.error(covers()[0]);
    expect(isBrandCover(covers()[0])).toBe(true);

    view.rerender(<BlogResults {...resultsProps({ articles: [first, second], visibleArticles: [second] })} />);

    expect(covers()).toHaveLength(1);
    expect(covers()[0].src).toBe(second.image);
  });

  it('keeps each card with its own cover when a filter takes the first one away', () => {
    const list = listOf(3);
    const view = renderWithProviders(<BlogResults {...resultsProps({ articles: list, visibleArticles: list })} />);
    fireEvent.error(covers()[1]);

    view.rerender(<BlogResults {...resultsProps({ articles: list, visibleArticles: [list[2], list[1]] })} />);

    expect(covers()[0].src).toBe(list[2].image);
    expect(isBrandCover(covers()[1])).toBe(true);
  });
});

describe('BlogResults and the addresses it is given', () => {
  it('leaves out an article whose address is not http or https, and the next one becomes the featured card', () => {
    const bad = testArticle({ title: 'Mau', url: 'javascript:alert(1)' });
    const good = testArticle({ title: 'Bom', url: 'https://example.com/bom' });

    renderWithProviders(<BlogResults {...resultsProps({ articles: [bad, good], visibleArticles: [bad, good] })} />);

    expect(screen.queryByText('Mau')).toBeNull();
    expect(screen.getByRole('heading', { level: 3, name: 'Bom' })).toBeInTheDocument();
    expect(screen.getByText('Destaque')).toBeInTheDocument();
  });

  it('shows no link at all when no article has a usable address', () => {
    const bad = testArticle({ url: 'data:text/html,x' });

    renderWithProviders(<BlogResults {...resultsProps({ articles: [bad], visibleArticles: [bad] })} />);

    expect(screen.queryByRole('link')).toBeNull();
  });

  it('shows the same article once when the list repeats an address', () => {
    const one = testArticle({ title: 'Repetido', url: 'https://example.com/r' });

    renderWithProviders(
      <BlogResults {...resultsProps({ articles: [one, one, one], visibleArticles: [one, one, one] })} />,
    );

    expect(screen.getAllByRole('heading', { level: 3, name: 'Repetido' })).toHaveLength(1);
  });
});

describe('BlogResults states', () => {
  it('announces the error as an alert', async () => {
    renderWithProviders(<BlogResults {...resultsProps({ error: 'A rede caiu', articles: [], visibleArticles: [] })} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('A rede caiu');
  });
});
