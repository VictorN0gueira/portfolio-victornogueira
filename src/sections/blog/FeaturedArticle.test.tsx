import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NewTabHint } from '../../components/ui/NewTabHint';
import { renderWithProviders } from '../../test/render';
import { testArticle } from './articleFixtures';
import { NEW_TAB_HINT_ID } from './blogMeta';
import { FeaturedArticle } from './FeaturedArticle';

const FRESH = () => new Date(Date.now() - 30 * 60 * 1000).toISOString();

function renderFeatured(props: Partial<Parameters<typeof FeaturedArticle>[0]> = {}) {
  return renderWithProviders(
    <>
      <NewTabHint id={NEW_TAB_HINT_ID} />
      <FeaturedArticle article={testArticle()} isFixedList={false} {...props} />
    </>,
  );
}

describe('FeaturedArticle', () => {
  it('is one link to the article in a new tab, named by the title, with the label Destaque', () => {
    renderFeatured();

    const link = screen.getByRole('link', { name: 'Artigo de teste' });
    expect(link).toHaveAttribute('href', 'https://example.com/artigo');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')?.split(' ').sort()).toEqual(['noopener', 'noreferrer']);
    expect(link).toHaveAccessibleDescription(/abre em nova aba/);
    expect(screen.getByText('Destaque')).toBeInTheDocument();
    expect(screen.getByText('Ler artigo')).toBeInTheDocument();
  });

  it('puts the link on the title and lets it cover the card: the keyboard stops on the title, never on a box as tall as the card', () => {
    renderFeatured();

    const card = screen.getByRole('article');
    const link = screen.getByRole('link', { name: 'Artigo de teste' });
    expect(within(card).getAllByRole('link')).toEqual([link]);
    expect(link).toContainElement(screen.getByRole('heading', { level: 3 }));
    expect(link).toHaveClass('vn-stretched-link', 'min-h-11');
    expect(card).toHaveClass('vn-focus-ring-ink-card');
  });

  it('lets the overlay of the link cover the whole card: the spotlight, the only child of the article, is the nearest positioned ancestor', () => {
    renderFeatured();

    const card = screen.getByRole('article');
    const link = screen.getByRole('link', { name: 'Artigo de teste' });
    // The ::after of vn-stretched-link is absolute: it covers the nearest `relative` ancestor. That is the SpotlightCard
    // (`relative isolate`), as big as the article, so the article itself needs no `relative`.
    const surface = link.closest('.relative');
    expect(surface).toHaveClass('vn-spotlight', 'relative');
    expect(card.children).toHaveLength(1);
    expect(card.firstElementChild).toBe(surface);
    // Nothing between the link and that surface may be positioned, or the overlay would shrink to it.
    for (let node = link.parentElement; node && node !== surface; node = node.parentElement) {
      for (const positioned of ['relative', 'absolute', 'fixed', 'sticky']) {
        expect(node, node.className).not.toHaveClass(positioned);
      }
    }
  });

  it('puts the title in an h3 and marks an English article with lang="en"', () => {
    renderFeatured({
      article: testArticle({ language: 'en', title: 'An English title', description: 'An English summary' }),
    });

    expect(screen.getByRole('heading', { level: 3 })).toHaveAttribute('lang', 'en');
    expect(screen.getByText('An English summary')).toHaveAttribute('lang', 'en');
  });

  it('is a black card on the system: a dark spotlight surface', () => {
    const { container } = renderFeatured();

    expect(container.querySelector('.vn-spotlight--dark')).not.toBeNull();
    expect(container.querySelector('.bg-vn-black')).not.toBeNull();
  });

  it('says NOVO in the accent, the only accent of the card, for a fresh article of a live list', () => {
    const { container } = renderFeatured({ article: testArticle({ publishedAt: FRESH() }) });

    expect(screen.getByText('NOVO')).toHaveClass('bg-vn-accent', 'text-vn-black');
    expect(container.querySelectorAll('.bg-vn-accent, .text-vn-accent')).toHaveLength(1);
  });

  it('has no accent at all when it is not new, and says neither NOVO nor how long ago for the fixed list', () => {
    const { container, unmount } = renderFeatured();
    expect(container.querySelector('.bg-vn-accent, .text-vn-accent')).toBeNull();
    unmount();

    const fixed = renderFeatured({ article: testArticle({ publishedAt: FRESH() }), isFixedList: true });
    expect(screen.queryByText('NOVO')).toBeNull();
    expect(fixed.container.textContent).not.toMatch(/Agora mesmo|atrás/);
  });

  it('falls back to a cover of its own when the image fails and sends no referrer', () => {
    const { container } = renderFeatured();
    const cover = container.querySelector('img') as HTMLImageElement;

    expect(cover).toHaveAttribute('referrerpolicy', 'no-referrer');
    expect(cover).toHaveAttribute('decoding', 'async');
    fireEvent.error(cover);

    expect(cover.src.startsWith('data:image/svg+xml')).toBe(true);
  });

  it('says something when the article has no summary', () => {
    renderFeatured({ article: testArticle({ description: '' }) });

    expect(screen.getByText('Clica para ler o artigo completo.')).toBeInTheDocument();
  });

  it('uses only the tokens of the system', () => {
    const { container } = renderFeatured({ article: testArticle({ publishedAt: FRESH() }) });

    expect(container.innerHTML).not.toMatch(/zinc|purple|cyan|gradient|blur|italic|dark:|from-|to-black/);
  });
});

describe('FeaturedArticle at the edge of the render', () => {
  it.each(['javascript:alert(1)', 'data:text/html;base64,PHNjcmlwdD4=', 'not a link', ''])(
    'renders no link for an address that is not http or https: %s',
    (url) => {
      const { container } = renderFeatured({ article: testArticle({ url }) });

      expect(container.querySelector('a')).toBeNull();
    },
  );

  it.each(['javascript:alert(1)', 'data:image/svg+xml,x', 'not a link'])(
    'uses the cover of the brand when the cover is not http or https: %s',
    (image) => {
      const { container } = renderFeatured({ article: testArticle({ image }) });

      expect((container.querySelector('img') as HTMLImageElement).src.startsWith('data:image/svg+xml')).toBe(true);
    },
  );

  it('keeps the whole title and the whole summary: the featured card does not clamp', () => {
    const summary = 'Um resumo '.repeat(60).trim();
    renderFeatured({ article: testArticle({ title: 'Um titulo '.repeat(30).trim(), description: summary }) });

    expect(screen.getByRole('heading', { level: 3 }).className).not.toMatch(/line-clamp/);
    expect(screen.getByText(summary).className).not.toMatch(/line-clamp/);
  });
});
