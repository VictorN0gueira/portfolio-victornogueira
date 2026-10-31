import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { combos, services } from '../data/services';
import { stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import ServicesPage from './ServicesPage';

const scrollToIdWhenMounted = vi.hoisted(() => vi.fn(() => () => undefined));
vi.mock('../lib/scrollToIdWhenMounted', () => ({ scrollToIdWhenMounted }));

const HASH_SLUG = 'sistema-web-sob-medida';

describe('ServicesPage', () => {
  beforeEach(() => {
    scrollToIdWhenMounted.mockClear();
    stubMatchMedia();
  });

  it('scrolls to the card named by the hash: the page is a lazy route, so the browser cannot find the anchor by itself', () => {
    renderWithProviders(<ServicesPage />, { route: `/servicos#${HASH_SLUG}` });

    expect(scrollToIdWhenMounted).toHaveBeenCalledWith(HASH_SLUG, { focus: 'heading' });
  });

  it('does not scroll anywhere when the address has no hash', () => {
    renderWithProviders(<ServicesPage />, { route: '/servicos' });

    expect(scrollToIdWhenMounted).not.toHaveBeenCalled();
  });

  it('gives every service card the slug as its id, in order, with room under the fixed header', () => {
    renderWithProviders(<ServicesPage />, { route: '/servicos' });

    for (const service of services) {
      const card = document.getElementById(service.slug) as HTMLElement;

      expect(card, service.slug).not.toBeNull();
      expect(card).toHaveClass('scroll-mt-28');
      expect(within(card).getByRole('heading', { level: 2, name: service.nome })).toBeInTheDocument();
    }
    const ids = [...document.querySelectorAll('[id]')].map((element) => element.id);
    const slugOrder = ids.filter((id) => services.some((service) => service.slug === id));
    expect(slugOrder).toEqual(services.map((service) => service.slug));
  });

  it('reads "Prazo estimado" above every lead time', () => {
    renderWithProviders(<ServicesPage />, { route: '/servicos' });

    expect(screen.getAllByText('Prazo estimado')).toHaveLength(services.length);
  });

  it('speaks as "a gente" and shows no price claim', () => {
    renderWithProviders(<ServicesPage />, { route: '/servicos' });

    expect(screen.getByText('O que a gente entrega')).toBeInTheDocument();
    expect(screen.getByText(/Na consulta gratuita a gente identifica/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/preço/i);
    expect(document.body.textContent).not.toMatch(/\beu\b/i);
  });

  it('lists every combo with its discount written as "N% de desconto"', () => {
    renderWithProviders(<ServicesPage />, { route: '/servicos' });

    for (const combo of combos) {
      expect(screen.getByRole('heading', { level: 3, name: combo.nome })).toBeInTheDocument();
    }
    expect(screen.getAllByText(/^\d+% de desconto$/)).toHaveLength(combos.length);
  });
});
