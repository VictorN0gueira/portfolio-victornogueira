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

  it('puts the link on the title and lets it cover the card: the keyboard stops on the title, never on a box as tall as the card', () => {
    renderCard();

    const card = screen.getByRole('article');
    const link = screen.getByRole('link', { name: 'Artigo de teste' });
    expect(within(card).getAllByRole('link')).toEqual([link]);
    expect(link).toContainElement(screen.getByRole('heading', { level: 3 }));
    expect(link).toHaveClass('vn-stretched-link', 'min-h-11');
    expect(card).toHaveClass('relative', 'vn-focus-ring-ink-card');
    expect(card.querySelector('img')).not.toBeNull();
  });

  it('lets the overlay of the link cover the whole card: the card is the nearest positioned ancestor, no wrapper in between is', () => {
    renderCard();

    const card = screen.getByRole('article');
    const link = screen.getByRole('link', { name: 'Artigo de teste' });
    // The ::after of vn-stretched-link is absolute: it covers the nearest `relative` ancestor, so a wrapper with that class would shrink it.
    expect(link.closest('.relative')).toBe(card);
    const wrappers: HTMLElement[] = [];
    for (let node = link.parentElement; node && node !== card; node = node.parentElement) wrappers.push(node);
    expect(wrappers.length).toBeGreaterThan(0);
    // One class at a time: `not.toHaveClass(a, b)` only says the element lacks one of them.
    for (const wrapper of wrappers) {
      for (const positioned of ['relative', 'absolute', 'fixed', 'sticky']) {
        expect(wrapper, wrapper.className).not.toHaveClass(positioned);
      }
    }
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
    expect(screen.getByRole('article')).toHaveTextContent(/Agora mesmo/);
  });

  it('never says NOVO nor how long ago for the fixed list, whatever the date says', () => {
    renderCard({ article: testArticle({ publishedAt: FRESH() }), isFixedList: true });

    expect(screen.queryByText('NOVO')).toBeNull();
    expect(screen.getByRole('article').textContent).not.toMatch(/Agora mesmo|atrás|Ontem/);
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

    expect(screen.getByRole('heading', { level: 3 })).toHaveClass('break-words');
    expect(within(screen.getByRole('article')).getByText('Fonte'.repeat(20))).toHaveClass('break-words');
    expect(screen.getByRole('article').innerHTML).not.toMatch(/truncate/);
  });

  it('uses only the tokens of the system: no zinc, purple, cyan, gradient, blur, italic or dark:', () => {
    const { container } = renderCard({ article: testArticle({ publishedAt: FRESH() }) });

    expect(container.innerHTML).not.toMatch(/zinc|purple|cyan|gradient|blur|italic|dark:|from-|to-black/);
  });
});

describe('ArticleCard on a narrow screen', () => {
  const LONG_TITLE = 'Um titulo '.repeat(30).trim();
  const LONG_SUMMARY = 'Um resumo '.repeat(60).trim();

  it('clamps the title to three lines and the summary to four, with the whole text still in the link', () => {
    renderCard({ article: testArticle({ title: LONG_TITLE, description: LONG_SUMMARY }) });

    const title = screen.getByRole('heading', { level: 3 });
    expect(title).toHaveClass('line-clamp-3', 'break-words');
    expect(title).toHaveTextContent(LONG_TITLE);
    const summary = screen.getByText(LONG_SUMMARY);
    expect(summary).toHaveClass('line-clamp-4', 'break-words');
    expect(screen.getByRole('link', { name: LONG_TITLE })).toHaveAccessibleDescription(
      new RegExp(LONG_SUMMARY.slice(0, 40)),
    );
  });

  it('shows at rest, not only on hover, that the card leaves the site: an icon hidden from screen readers', () => {
    const { container } = renderCard();

    const cue = container.querySelector('[data-external-cue]');
    expect(cue).not.toBeNull();
    expect(cue).toHaveAttribute('aria-hidden', 'true');
    expect(cue?.getAttribute('class')).not.toMatch(/opacity-0|hidden|group-hover:/);
  });
});

describe('ArticleCard at the edge of the render', () => {
  it('shows the cover of the new article when the same card gets another one (no failed state left over)', () => {
    const first = testArticle({ image: 'https://images.unsplash.com/photo-1?w=800' });
    const second = testArticle({ image: 'https://images.unsplash.com/photo-2?w=800' });
    const { container, rerender } = renderCard({ article: first });
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    expect((container.querySelector('img') as HTMLImageElement).src.startsWith('data:')).toBe(true);

    rerender(
      <>
        <NewTabHint id={NEW_TAB_HINT_ID} />
        <ArticleCard article={second} isFixedList={false} />
      </>,
    );

    expect((container.querySelector('img') as HTMLImageElement).src).toBe(second.image);
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=',
    'file:///etc/passwd',
    '//example.com/x',
    'not a link',
    '',
  ])('renders no link at all for an address that is not http or https: %s', (url) => {
    const { container } = renderCard({ article: testArticle({ url }) });

    expect(container.querySelector('a')).toBeNull();
  });

  it.each(['javascript:alert(1)', 'data:image/svg+xml,x', 'ftp://example.com/c.png', 'not a link'])(
    'uses the cover of the brand, not the address, when the cover is not http or https: %s',
    (image) => {
      const { container } = renderCard({ article: testArticle({ image }) });

      expect((container.querySelector('img') as HTMLImageElement).src.startsWith('data:image/svg+xml')).toBe(true);
    },
  );
});
