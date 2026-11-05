import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { combos, type ServiceCombo } from '../../data/services';
import { servicesCopy } from '../../data/servicesCopy';
import { findAccentElements } from '../../test/accent';
import { stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import { ComboCard } from './ComboCard';
import { ComboCards } from './ComboCards';

describe('ComboCards', () => {
  beforeEach(() => stubMatchMedia());

  it('is a black section named by its h2, with the dark scan grid and the cursor as its one accent', () => {
    const { container } = renderWithProviders(<ComboCards />);
    const section = container.querySelector('section') as HTMLElement;
    const heading = screen.getByRole('heading', { level: 2, name: servicesCopy.combos.heading });

    expect(section).toHaveAttribute('data-tone', 'black');
    expect(section).toHaveAttribute('aria-labelledby', heading.id);
    expect(container.querySelector('.vn-scan-grid--dark')).not.toBeNull();
    expect(screen.getByText(servicesCopy.combos.kicker)).toBeInTheDocument();
    expect(findAccentElements(section)).toHaveLength(1);
  });

  it('draws one card per combo: the name as an h3, the composition and the description', () => {
    renderWithProviders(<ComboCards />);

    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(
      combos.map((combo) => combo.nome),
    );
    for (const combo of combos) {
      expect(screen.getByText(combo.composicao)).toBeInTheDocument();
      expect(screen.getByText(combo.descricao)).toBeInTheDocument();
    }
  });

  it('shows no percentage and no price: nothing is on the page that is not in the data', () => {
    const { container } = renderWithProviders(<ComboCards />);

    expect(container.textContent).not.toMatch(/\d+\s*%/);
    expect(container.textContent).not.toMatch(/R\$/);
    expect(container.textContent).not.toMatch(/desconto|economi/i);
  });
});

describe('ComboCard', () => {
  beforeEach(() => stubMatchMedia());

  it('is whole with only the fields of the data: every part is there and none is an empty line', () => {
    const combo: ServiceCombo = { nome: 'Um pacote', composicao: 'A + B', descricao: 'A e B juntos.' };
    const { container } = renderWithProviders(<ComboCard combo={combo} />);
    const card = container.firstElementChild as HTMLElement;

    expect(within(card).getByRole('heading', { level: 3, name: combo.nome })).toBeInTheDocument();
    expect(screen.getByText(combo.composicao)).toBeInTheDocument();
    expect(screen.getByText(combo.descricao)).toBeInTheDocument();
    expect(card.textContent).toBe(`${combo.nome}${combo.composicao}${combo.descricao}`);
    for (const element of Array.from(card.querySelectorAll('p, span, div'))) {
      expect(element.textContent?.trim(), element.outerHTML).not.toBe('');
    }
  });

  it('draws no accent on the card: the accent of the section is the cursor of its heading', () => {
    for (const combo of combos) {
      const { container, unmount } = renderWithProviders(<ComboCard combo={combo} />);

      expect(findAccentElements(container.firstElementChild as HTMLElement), combo.nome).toHaveLength(0);
      unmount();
    }
  });
});
