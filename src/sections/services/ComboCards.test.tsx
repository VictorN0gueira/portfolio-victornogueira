import { screen, within } from '@testing-library/react';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { combos, type ServiceCombo } from '../../data/services';
import { servicesCopy } from '../../data/servicesCopy';
import { findAccentElements } from '../../test/accent';
import { stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import { ComboCard } from './ComboCard';
import { ComboCards } from './ComboCards';

const WITH_DISCOUNT: ServiceCombo = { ...combos[0], desconto: 'Pacote com desconto' };
const WITHOUT_DISCOUNT: ServiceCombo = { nome: combos[0].nome, composicao: combos[0].composicao, descricao: combos[0].descricao };

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

    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(combos.map((combo) => combo.nome));
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

  it('stays whole without any discount field: no pill, no empty line, the same parts otherwise', () => {
    const { container } = renderWithProviders(<ComboCard combo={WITHOUT_DISCOUNT} />);
    const card = container.firstElementChild as HTMLElement;

    expect(within(card).getByRole('heading', { level: 3, name: WITHOUT_DISCOUNT.nome })).toBeInTheDocument();
    expect(screen.getByText(WITHOUT_DISCOUNT.composicao)).toBeInTheDocument();
    expect(screen.getByText(WITHOUT_DISCOUNT.descricao)).toBeInTheDocument();
    expect(card.querySelector('[data-combo-discount]')).toBeNull();
    for (const element of Array.from(card.querySelectorAll('p, span, div'))) {
      expect(element.textContent?.trim(), element.outerHTML).not.toBe('');
    }
  });

  it('draws the discount as an outline pill with exactly the text of the data when there is one', () => {
    const { container } = renderWithProviders(<ComboCard combo={WITH_DISCOUNT} />);
    const pill = container.querySelector('[data-combo-discount]') as HTMLElement;

    expect(pill.textContent).toBe('Pacote com desconto');
    expect(pill.className).not.toMatch(/bg-vn-accent/);
  });

  it('adds the pill and nothing else when the discount comes', () => {
    const plain = renderWithProviders(<ComboCard combo={WITHOUT_DISCOUNT} />).container.firstElementChild as HTMLElement;
    const withPill = renderWithProviders(<ComboCard combo={WITH_DISCOUNT} />).container.firstElementChild as HTMLElement;
    const stripped = withPill.cloneNode(true) as HTMLElement;
    stripped.querySelector('[data-combo-discount]')?.remove();

    expect(stripped.textContent).toBe(plain.textContent);
  });
});

describe('where the discount lives', () => {
  it('is named in ComboDiscount only: removing the field from the data removes it from the site', () => {
    const folder = __dirname;
    const sources = readdirSync(folder).filter((file) => /\.tsx?$/.test(file) && !/\.test\./.test(file));
    const citing = sources.filter((file) => /desconto/i.test(readFileSync(join(folder, file), 'utf8')));

    expect(sources.length).toBeGreaterThanOrEqual(4);
    expect(citing).toEqual(['ComboDiscount.tsx']);
  });

  it('keeps every combo of the real data without a discount field', () => {
    for (const combo of combos) expect(combo).not.toHaveProperty('desconto');
  });
});
