import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import { ServicesCards } from './ServicesCards';

// jsdom has no layout, so the structure that makes the cards line up is pinned here, and e2e/visual-defects.spec.ts
// measures the dividers in a real browser (V:D2).
const PARTS_PER_CARD = 5;

function renderCards() {
  stubMatchMedia();
  renderWithProviders(<ServicesCards />);
  const surfaces = screen.getAllByRole('article').map((article) => article.firstElementChild as HTMLElement);
  const items = screen.getAllByRole('article').map((article) => article.parentElement as HTMLElement);
  const grid = items[0].parentElement as HTMLElement;
  return { grid, items, articles: screen.getAllByRole('article'), surfaces };
}

describe('ServicesCards alignment', () => {
  it('gives each card exactly five parts, so five shared rows are enough: kicker, name, description, list and term', () => {
    const { surfaces } = renderCards();

    for (const surface of surfaces) expect(surface.children).toHaveLength(PARTS_PER_CARD);
  });

  it('shares the five rows of the grid with every level down to the surface, from md', () => {
    const { items, articles, surfaces } = renderCards();

    for (const level of [...items, ...articles, ...surfaces]) {
      expect(level).toHaveClass('md:row-span-5', 'md:grid', 'md:grid-rows-subgrid');
    }
  });

  it('has no row gap in the grid, because it would open a gap between the five rows of one card', () => {
    const { grid, items } = renderCards();

    expect(grid).toHaveClass('md:gap-y-0');
    for (const item of items) expect(item).toHaveClass('md:mb-5');
  });

  it('starts the term at the top of its row, so a term that wraps to two lines never moves the one line terms of the other cards', () => {
    const { surfaces } = renderCards();

    for (const surface of surfaces) {
      const term = surface.lastElementChild as HTMLElement;

      expect(term).toHaveClass('self-start', 'pt-6');
      expect(term).not.toHaveClass('mt-auto');
    }
  });

  it('keeps the last card across both columns of md and back to one column at lg', () => {
    const { items } = renderCards();

    expect(items.at(-1)).toHaveClass('md:col-span-2', 'lg:col-span-1');
    expect(items[0].className).not.toContain('col-span');
  });
});
