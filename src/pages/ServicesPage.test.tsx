import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { combos, services } from '../data/services';
import { stubMatchMedia } from '../test/matchMedia';
import { routeMetaFor } from '../seo/routeMeta';
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

  it('takes its head from the route metadata: title, description, canonical, one breadcrumb and one Service per service', async () => {
    renderWithProviders(<ServicesPage />, { route: '/servicos' });
    const meta = routeMetaFor('/servicos')!;

    await waitFor(() => expect(document.title).toBe(meta.title));
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute('content', meta.description);
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://vnone.com.br/servicos');
    const types = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((node) => JSON.parse(node.textContent ?? '{}')['@type']);
    expect(types.filter((type) => type === 'BreadcrumbList')).toHaveLength(1);
    expect(types.filter((type) => type === 'Service')).toHaveLength(services.length);
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

  it('invites to the consultation in the informal imperative, not the infinitive', () => {
    renderWithProviders(<ServicesPage />, { route: '/servicos' });

    expect(screen.getByRole('link', { name: 'Agenda uma consulta gratuita' })).toHaveAttribute('href', '/contato');
    expect(screen.queryByText('Agendar consulta gratuita')).toBeNull();
  });

  it('keeps the kickers, the lead, the term labels and the combo notes at readable contrast', () => {
    renderWithProviders(<ServicesPage />, { route: '/servicos' });

    const lowContrast = /zinc-[3-5]00/;
    const lines = [
      screen.getByText('O que a gente entrega'),
      screen.getByText(/Escopo claro e prazo definido, do primeiro/),
      screen.getByText('Pacotes com desconto'),
      screen.getByText(/Na consulta gratuita a gente identifica/),
      screen.getByText(combos[0].composicao),
      ...screen.getAllByText(services[0].categoria, { selector: 'p' }),
      ...screen.getAllByText('Prazo estimado'),
    ];
    for (const line of lines) {
      expect(line.className, line.textContent ?? '').not.toMatch(lowContrast);
    }
  });

  it('keeps the service descriptions readable on the zinc 50 card: zinc 500 is 4.6 to 1, the dark gray is far above 4.5', () => {
    renderWithProviders(<ServicesPage />, { route: '/servicos' });

    for (const service of services) {
      const description = screen.getByText(service.descricao);

      expect(description.className, service.slug).not.toMatch(/zinc-[3-5]00/);
      expect(description, service.slug).toHaveClass('text-vn-gray-dark');
    }
  });
});
