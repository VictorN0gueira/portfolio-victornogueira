import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { partners } from '../../data/partners';
import { findAccentElements } from '../../test/accent';
import { expectNoConsoleOutput } from '../../test/consoleGuard';
import { renderWithProviders } from '../../test/render';
import { ClientGrid, spansLastRow } from './ClientGrid';
import { LOGO_HEIGHT, LOGO_WIDTH } from './LogoImage';

expectNoConsoleOutput();

const COLUMNS_BASE = 2;
const COLUMNS_MD = 3;

const listOf = (): HTMLElement => screen.getByRole('list', { name: 'quem confia' });
const cellsOf = (list: HTMLElement): HTMLElement[] => Array.from(list.children) as HTMLElement[];

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

  it('draws every partner logo named by the partner, sized like the canvas of the files, lazy and async', () => {
    renderWithProviders(<ClientGrid />);

    for (const { name, logo } of partners) {
      const img = within(listOf()).getByRole('img', { name });

      expect(img).toHaveAttribute('src', logo);
      expect(img).toHaveAttribute('width', String(LOGO_WIDTH));
      expect(img).toHaveAttribute('height', String(LOGO_HEIGHT));
      expect(img).toHaveAttribute('loading', 'lazy');
      expect(img).toHaveAttribute('decoding', 'async');
      expect(img).toHaveClass('object-contain');
    }
  });

  it('gives every logo the same 2 to 1 slot with a common maximum width, so none is tiny and none is oversized', () => {
    renderWithProviders(<ClientGrid />);
    const classLists = partners.map(({ name }) => within(listOf()).getByRole('img', { name }).className);

    expect(new Set(classLists).size).toBe(1);
    expect(classLists[0]).toContain('aspect-[2/1]');
    expect(classLists[0]).toContain('w-full');
    expect(classLists[0]).toContain('max-w-56');
  });

  it('tones the logos gray at rest and colored on hover and focus within the cell, through the vn-logo-tone utility', () => {
    renderWithProviders(<ClientGrid />);
    const cells = cellsOf(listOf());

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
    it('is 2 columns on mobile and 3 from md, with a gray light line on the top and left of the grid', () => {
      renderWithProviders(<ClientGrid />);

      expect(listOf()).toHaveClass('grid', 'grid-cols-2', 'md:grid-cols-3');
      expect(listOf()).not.toHaveClass('lg:grid-cols-5');
      expect(listOf()).toHaveClass('border-t', 'border-l', 'border-vn-gray-light');
    });

    it('closes every cell with a line on its right and bottom and paints it white', () => {
      renderWithProviders(<ClientGrid />);

      for (const cell of cellsOf(listOf())) {
        expect(cell).toHaveClass('border-r', 'border-b', 'border-vn-gray-light', 'bg-vn-white');
      }
    });
  });

  describe('last row', () => {
    it('has no empty filler cell: every cell is a logo and nothing is hidden from assistive tech', () => {
      renderWithProviders(<ClientGrid />);
      const cells = cellsOf(listOf());

      expect(cells).toHaveLength(partners.length);
      for (const cell of cells) {
        expect(cell).not.toHaveAttribute('aria-hidden');
        expect(cell.querySelector('img, [data-logo-fallback]')).not.toBeNull();
      }
    });

    it('makes whole rows at 3 columns, where the 9 logos fill 3 rows of 3', () => {
      expect(partners.length % COLUMNS_MD).toBe(0);
    });

    it('makes the last logo span both columns on mobile, where 9 logos would end on a lone cell, and only there', () => {
      renderWithProviders(<ClientGrid />);
      const cells = cellsOf(listOf());
      const last = cells[cells.length - 1];

      expect(partners.length % COLUMNS_BASE).toBe(1);
      expect(last).toHaveClass('col-span-2', 'md:col-span-1');
      for (const cell of cells.slice(0, -1)) expect(cell).not.toHaveClass('col-span-2');
    });

    it('ends on the widest wordmark, the one that fills a row of its own best', () => {
      expect(partners[partners.length - 1].name).toBe('Criativa Marketing');
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

describe('spansLastRow', () => {
  it.each(Array.from({ length: 12 }, (_, index) => index + 1))(
    'spans only the last of %i logos, and only when the 2 column rows would end on a lone cell',
    (count) => {
      const spanning = Array.from({ length: count }, (_, position) => spansLastRow(position, count));

      expect(spanning.filter(Boolean)).toHaveLength(count % COLUMNS_BASE === 1 ? 1 : 0);
      if (count % COLUMNS_BASE === 1) expect(spanning[count - 1]).toBe(true);
    },
  );
});
