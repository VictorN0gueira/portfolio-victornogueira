import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { homeCopy } from '../../data/homeCopy';
import { services } from '../../data/services';
import { stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import { ServiceCard } from './ServiceCard';

const service = services[0];

describe('ServiceCard', () => {
  it('names the article by its name, an h3 by default', () => {
    stubMatchMedia();
    renderWithProviders(<ServiceCard service={service} />);
    const heading = screen.getByRole('heading', { level: 3, name: service.nome });

    expect(screen.getByRole('article', { name: service.nome })).toHaveAttribute('aria-labelledby', heading.id);
  });

  it('draws an h2 when asked, as the services page does', () => {
    stubMatchMedia();
    renderWithProviders(<ServiceCard service={service} headingAs="h2" />);

    expect(screen.getByRole('heading', { level: 2, name: service.nome })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull();
  });

  it('has no id and no anchor offset unless an anchor id comes', () => {
    stubMatchMedia();
    renderWithProviders(<ServiceCard service={service} />);
    const article = screen.getByRole('article');

    expect(article).not.toHaveAttribute('id');
    expect(article).not.toHaveClass('scroll-mt-28');
  });

  it('turns the anchor id into the id of the article, with room under the fixed header', () => {
    stubMatchMedia();
    renderWithProviders(<ServiceCard service={service} anchorId={service.slug} />);
    const article = screen.getByRole('article');

    expect(article).toHaveAttribute('id', service.slug);
    expect(article).toHaveClass('scroll-mt-28');
  });

  it('lists what is included as a list with the data items, and shows the term with its label', () => {
    stubMatchMedia();
    renderWithProviders(<ServiceCard service={service} />);
    const list = screen.getByRole('list');

    expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toEqual(service.inclui);
    expect(screen.getByText(`${homeCopy.services.term}:`, { exact: false })).toHaveClass('sr-only');
    expect(screen.getByText(service.prazo, { exact: false })).toBeVisible();
  });

  it('shows the category as the kicker and the description in the readable gray', () => {
    stubMatchMedia();
    renderWithProviders(<ServiceCard service={service} />);

    expect(screen.getByText(service.categoria)).toBeInTheDocument();
    expect(screen.getByText(service.descricao)).toHaveClass('text-vn-gray-dark');
  });
});
