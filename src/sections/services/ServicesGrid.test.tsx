import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { servicesCopy } from '../../data/servicesCopy';
import { services } from '../../data/services';
import { stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import { ServicesGrid } from './ServicesGrid';

describe('ServicesGrid', () => {
  beforeEach(() => stubMatchMedia());

  it('is a white region named without a heading of its own: the h1 comes before it and the cards are h2', () => {
    const { container } = renderWithProviders(<ServicesGrid />);
    const section = container.querySelector('section') as HTMLElement;

    expect(section).toHaveAttribute('data-tone', 'white');
    expect(screen.getByRole('region', { name: servicesCopy.gridLabel })).toBe(section);
    expect(screen.getAllByRole('heading').every((heading) => heading.tagName === 'H2')).toBe(true);
  });

  it('draws one card per service, in the order of the data, each with its name as an h2', () => {
    renderWithProviders(<ServicesGrid />);
    const names = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);

    expect(names).toEqual(services.map((service) => service.nome));
  });

  it('gives every card the slug as its id, with room under the fixed header', () => {
    renderWithProviders(<ServicesGrid />);

    for (const service of services) {
      const card = document.getElementById(service.slug) as HTMLElement;

      expect(card, service.slug).not.toBeNull();
      expect(card).toHaveClass('scroll-mt-28');
      expect(within(card).getByRole('heading', { level: 2, name: service.nome })).toBeInTheDocument();
    }
  });

  it('lists the items of each service and its lead time, and shows no price', () => {
    renderWithProviders(<ServicesGrid />);

    for (const service of services) {
      const card = document.getElementById(service.slug) as HTMLElement;
      const items = within(within(card).getByRole('list')).getAllByRole('listitem');

      expect(items.map((item) => item.textContent), service.slug).toEqual(service.inclui);
      expect(within(card).getByText(service.prazo, { exact: false })).toBeInTheDocument();
    }
    expect(document.body.textContent).not.toMatch(/R\$/);
  });

  it('lets the cards of a row share their parts through the subgrid', () => {
    const { container } = renderWithProviders(<ServicesGrid />);
    const grid = container.querySelector('.grid') as HTMLElement;

    expect(grid).toHaveClass('md:grid-cols-2', 'lg:grid-cols-3');
    expect(grid.children).toHaveLength(services.length);
    for (const item of Array.from(grid.children)) expect(item).toHaveClass('md:grid-rows-subgrid');
  });
});
