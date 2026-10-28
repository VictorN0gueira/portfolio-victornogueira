import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { partners } from '../../data/partners';
import { findAccentElements } from '../../test/accent';
import { expectNoConsoleOutput } from '../../test/consoleGuard';
import { renderWithProviders } from '../../test/render';
import { ClientGrid, fillerClasses } from './ClientGrid';

type Breakpoint = 'base' | 'md' | 'lg';
const COLUMNS: Record<Breakpoint, number> = { base: 2, md: 3, lg: 5 };

expectNoConsoleOutput();

const listOf = (): HTMLElement => screen.getByRole('list', { name: 'quem confia' });
const cellsOf = (list: HTMLElement): HTMLElement[] => Array.from(list.children) as HTMLElement[];
const fillersOf = (list: HTMLElement): HTMLElement[] => cellsOf(list).filter((cell) => cell.getAttribute('aria-hidden') === 'true');

/** The display a filler gets at a breakpoint from its hidden and block classes, with the cascade of Tailwind (mobile first). */
function displayAt(classNames: string, breakpoint: Breakpoint): 'block' | 'hidden' | undefined {
  const classes = new Set(classNames.split(/\s+/));
  const pick = (prefix: string): 'block' | 'hidden' | undefined =>
    (['block', 'hidden'] as const).find((display) => classes.has(`${prefix}${display}`));

  return { base: pick(''), md: pick('md:') ?? pick(''), lg: pick('lg:') ?? pick('md:') ?? pick('') }[breakpoint];
}

const isShownAt = (filler: HTMLElement, breakpoint: Breakpoint): boolean => displayAt(filler.className, breakpoint) === 'block';

describe('ClientGrid', () => {
  it('is a list named by the quem confia kicker, with one item per partner', () => {
    renderWithProviders(<ClientGrid />);

    expect(screen.getByText('quem confia')).toBeInTheDocument();
    expect(within(listOf()).getAllByRole('listitem')).toHaveLength(partners.length);
    expect(partners).toHaveLength(9);
  });

  it('keeps the list role on the ul, because Safari drops the semantics of a list without markers', () => {
    renderWithProviders(<ClientGrid />);
    const list = listOf();

    expect(list.tagName).toBe('UL');
    expect(list).toHaveAttribute('role', 'list');
  });

  it('draws every partner logo named by the partner, sized, lazy and async', () => {
    renderWithProviders(<ClientGrid />);

    for (const { name, logo } of partners) {
      const img = within(listOf()).getByRole('img', { name });

      expect(img).toHaveAttribute('src', logo);
      expect(img).toHaveAttribute('width');
      expect(img).toHaveAttribute('height');
      expect(img).toHaveAttribute('loading', 'lazy');
      expect(img).toHaveAttribute('decoding', 'async');
      expect(img).toHaveClass('object-contain');
    }
  });

  it('tones the logos gray at rest and colored on hover and focus within the cell, through the vn-logo-tone utility', () => {
    renderWithProviders(<ClientGrid />);
    const cells = cellsOf(listOf()).filter((cell) => cell.getAttribute('aria-hidden') !== 'true');

    expect(cells).toHaveLength(partners.length);
    for (const cell of cells) {
      expect(cell).toHaveClass('vn-logo-host');
      expect(cell.querySelector('img')).toHaveClass('vn-logo-tone');
    }
  });

  it('swaps a logo that fails to load for the partner name as visible text, in the same box', () => {
    renderWithProviders(<ClientGrid />);
    const img = within(listOf()).getByRole('img', { name: 'Mercadinho Irmão Cruz' });
    const boxClasses = img.className.replace('object-contain', '').split(/\s+/).filter(Boolean);

    fireEvent.error(img);

    const fallback = within(listOf()).getByText('Mercadinho Irmão Cruz');
    expect(fallback).toHaveAttribute('data-logo-fallback');
    expect(fallback).not.toHaveAttribute('aria-hidden');
    for (const token of boxClasses) expect(fallback).toHaveClass(token);
    expect(within(listOf()).queryByRole('img', { name: 'Mercadinho Irmão Cruz' })).not.toBeInTheDocument();
  });

  describe('grid lines', () => {
    it('is 2 columns on mobile, 3 from md and 5 from lg, with a gray light line on the top and left of the grid', () => {
      renderWithProviders(<ClientGrid />);

      expect(listOf()).toHaveClass('grid', 'grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-5');
      expect(listOf()).toHaveClass('border-t', 'border-l', 'border-vn-gray-light');
    });

    it('closes every cell, logo or filler, with a line on its right and bottom', () => {
      renderWithProviders(<ClientGrid />);

      for (const cell of cellsOf(listOf())) {
        expect(cell).toHaveClass('border-r', 'border-b', 'border-vn-gray-light');
      }
    });

    it('paints every cell white, filler or logo, so a short last row reads as empty cells and not as a hole in the grid', () => {
      renderWithProviders(<ClientGrid />);
      const cells = cellsOf(listOf());

      expect(fillersOf(listOf()).length).toBeGreaterThan(0);
      for (const cell of cells) expect(cell).toHaveClass('bg-vn-white');
    });

    it.each(['base', 'md', 'lg'] as const)(
      'fills every row at %s: the logos plus the visible fillers make a whole number of rows',
      (breakpoint) => {
        renderWithProviders(<ClientGrid />);
        const visibleFillers = fillersOf(listOf()).filter((filler) => isShownAt(filler, breakpoint)).length;

        expect((partners.length + visibleFillers) % COLUMNS[breakpoint]).toBe(0);
        // And no more fillers than one row would need, so no row is made only of empty cells.
        expect(visibleFillers).toBeLessThan(COLUMNS[breakpoint]);
      },
    );

    it('needs one filler at 2 columns, none at 3 and one at 5 for the 9 partners', () => {
      renderWithProviders(<ClientGrid />);
      const fillers = fillersOf(listOf());

      expect(fillers.filter((filler) => isShownAt(filler, 'base'))).toHaveLength(1);
      expect(fillers.filter((filler) => isShownAt(filler, 'md'))).toHaveLength(0);
      expect(fillers.filter((filler) => isShownAt(filler, 'lg'))).toHaveLength(1);
    });

    it('puts every filler after every logo, so it can only complete the last row', () => {
      renderWithProviders(<ClientGrid />);
      const cells = cellsOf(listOf());
      const firstFiller = cells.findIndex((cell) => cell.getAttribute('aria-hidden') === 'true');

      expect(firstFiller).toBe(partners.length);
      expect(cells.slice(firstFiller).every((cell) => cell.getAttribute('aria-hidden') === 'true')).toBe(true);
    });
  });

  describe('filler cells', () => {
    it('are hidden from assistive tech, hold no text and no focusable element', () => {
      renderWithProviders(<ClientGrid />);
      const fillers = fillersOf(listOf());

      expect(fillers.length).toBeGreaterThan(0);
      for (const filler of fillers) {
        expect(filler.tagName).toBe('LI');
        expect(filler.textContent).toBe('');
        expect(filler.querySelectorAll('img, a, button, input, [tabindex]')).toHaveLength(0);
      }
    });

    it('do not count as list items for assistive tech', () => {
      renderWithProviders(<ClientGrid />);

      expect(within(listOf()).getAllByRole('listitem')).toHaveLength(partners.length);
    });
  });

  it('is not a section of its own, so it can sit inside another one', () => {
    const { container } = renderWithProviders(<ClientGrid />);

    expect(container.querySelector('section')).toBeNull();
  });

  it('reveals through one group for the whole grid, never one per logo', () => {
    const { container } = renderWithProviders(<ClientGrid />);

    expect(container.querySelectorAll('[data-reveal-group]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-reveal-item] [data-reveal-group]')).toHaveLength(0);
  });

  it('keeps the accent out of the grid', () => {
    const { container } = renderWithProviders(<ClientGrid />);

    expect(findAccentElements(container)).toHaveLength(0);
  });

  it('adds no heading: the list is named by the kicker', () => {
    renderWithProviders(<ClientGrid />);

    expect(screen.queryAllByRole('heading')).toHaveLength(0);
  });
});

describe('fillerClasses', () => {
  const shownAt = (classes: string[], breakpoint: Breakpoint): number =>
    classes.filter((filler) => displayAt(filler, breakpoint) === 'block').length;

  it.each(Array.from({ length: 23 }, (_, index) => index + 1))(
    'completes the last row at 2, 3 and 5 columns for %i logos, with fewer fillers than a row',
    (count) => {
      const fillers = fillerClasses(count);

      for (const breakpoint of ['base', 'md', 'lg'] as const) {
        const shown = shownAt(fillers, breakpoint);

        expect((count + shown) % COLUMNS[breakpoint]).toBe(0);
        expect(shown).toBeLessThan(COLUMNS[breakpoint]);
      }
    },
  );

  it('uses whole class names Tailwind can find in the source', () => {
    for (const filler of fillerClasses(9)) {
      expect(filler).toMatch(/^(block|hidden) md:(block|hidden) lg:(block|hidden)$/);
    }
  });

  it('adds no filler when every breakpoint already ends on a whole row', () => {
    expect(fillerClasses(30)).toEqual([]);
  });
});
