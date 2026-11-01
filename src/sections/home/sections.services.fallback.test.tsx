import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import { ServicesCards } from './ServicesCards';

// The data has a service for every featured category, so the fallback is only reachable by replacing the list of
// featured services: here the home ends up with two (or none) after a category lost its services.
const featured = vi.hoisted(() => ({
  list: [] as { nome: string; categoria: string; descricao: string; inclui: string[]; prazo: string }[],
}));

vi.mock('./featuredServices', () => ({
  get featuredServices() {
    return featured.list;
  },
}));

const service = (nome: string) => ({ nome, categoria: 'Automação', descricao: `Descrição ${nome}`, inclui: [`Item ${nome}`], prazo: 'cerca de 1 semana' });

describe('ServicesCards with fewer than three services', () => {
  it('shows the two that remain, and the second does not span the two columns of md, which would leave the first alone on its row', () => {
    stubMatchMedia();
    featured.list = [service('Um'), service('Dois')];
    renderWithProviders(<ServicesCards />);

    const cards = screen.getAllByRole('article');
    const grid = cards[0].closest('[class*="grid-cols-1"]') as HTMLElement;

    expect(cards.map((card) => card.getAttribute('aria-labelledby'))).not.toContain(null);
    expect(screen.getAllByRole('heading', { level: 3 }).map((title) => title.textContent)).toEqual(['Um', 'Dois']);
    expect(grid.children).toHaveLength(2);
    for (const item of Array.from(grid.children)) {
      expect(item).not.toHaveClass('md:col-span-2');
    }
    expect(screen.getByRole('link', { name: 'Ver todos os serviços' })).toHaveAttribute('href', '/servicos');
  });

  it('lets a single card fill the row of md, where it would be alone anyway', () => {
    stubMatchMedia();
    featured.list = [service('Único')];
    renderWithProviders(<ServicesCards />);

    const grid = screen.getByRole('article').closest('[class*="grid-cols-1"]') as HTMLElement;

    expect(grid.children[0]).toHaveClass('md:col-span-2', 'lg:col-span-1');
  });

  it('still renders the header and the link when there is no service at all', () => {
    stubMatchMedia();
    featured.list = [];
    renderWithProviders(<ServicesCards />);

    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Ver todos os serviços' })).toBeInTheDocument();
  });
});
