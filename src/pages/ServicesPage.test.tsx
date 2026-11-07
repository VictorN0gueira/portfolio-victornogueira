import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { combos, services } from '../data/services';
import { servicesCopy } from '../data/servicesCopy';
import { serviceTermLabel } from '../data/sharedCopy';
import { routeMetaFor } from '../seo/routeMeta';
import { findAccentElements } from '../test/accent';
import { stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import ServicesPage from './ServicesPage';

const scrollToIdWhenMounted = vi.hoisted(() => vi.fn(() => () => undefined));
vi.mock('../lib/scrollToIdWhenMounted', () => ({ scrollToIdWhenMounted }));

const HASH_SLUG = 'sistema-web-sob-medida';
const FORBIDDEN_CLASSES = /\bitalic\b|\bdark:|zinc|emerald|purple|cyan/;

describe('ServicesPage', () => {
  beforeEach(() => {
    scrollToIdWhenMounted.mockClear();
    stubMatchMedia();
  });

  it('scrolls to the card named by the hash: the lazy route has no anchor for the browser to find', () => {
    renderWithProviders(<ServicesPage />, { route: `/servicos#${HASH_SLUG}` });

    expect(scrollToIdWhenMounted).toHaveBeenCalledWith(HASH_SLUG, { focus: 'heading' });
  });

  it('does not scroll anywhere when the address has no hash', () => {
    renderWithProviders(<ServicesPage />, { route: '/servicos' });

    expect(scrollToIdWhenMounted).not.toHaveBeenCalled();
  });

  it('takes its head from the route metadata: title, description, canonical and the structured data', async () => {
    renderWithProviders(<ServicesPage />, { route: '/servicos' });
    const meta = routeMetaFor('/servicos')!;

    await waitFor(() => expect(document.title).toBe(meta.title));
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute('content', meta.description);
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://vnone.com.br/servicos');
    const types = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(
      (node) => JSON.parse(node.textContent ?? '{}')['@type'],
    );
    expect(types.filter((type) => type === 'BreadcrumbList')).toHaveLength(1);
    expect(types.filter((type) => type === 'Service')).toHaveLength(services.length);
  });

  it('has one h1 and it comes first, then the service cards as h2 and the combos as h3, with no level skipped', () => {
    renderWithProviders(<ServicesPage />, { route: '/servicos' });
    const headings = screen.getAllByRole('heading');

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(headings[0]).toBe(screen.getByRole('heading', { level: 1, name: servicesCopy.hero.title }));
    for (const service of services) {
      expect(screen.getByRole('heading', { level: 2, name: service.nome })).toBeInTheDocument();
    }
    for (const combo of combos) {
      expect(screen.getByRole('heading', { level: 3, name: combo.nome })).toBeInTheDocument();
    }
    let previous = 0;
    for (const heading of headings) {
      const level = Number(heading.tagName.slice(1));
      expect(level - previous, heading.textContent ?? '').toBeLessThanOrEqual(1);
      previous = level;
    }
  });

  it('stacks the sections cream, white, black, white and black: hero, grid, combos, FAQ, closing band', () => {
    const { container } = renderWithProviders(<ServicesPage />, { route: '/servicos' });
    const tones = Array.from(container.querySelectorAll('section[data-tone]')).map((section) =>
      section.getAttribute('data-tone'),
    );

    expect(tones).toEqual(['cream', 'white', 'black', 'white', 'black']);
  });

  it('gives every service card the slug as its id, in order, with room under the fixed header', () => {
    renderWithProviders(<ServicesPage />, { route: '/servicos' });

    for (const service of services) {
      const card = document.getElementById(service.slug) as HTMLElement;

      expect(card, service.slug).not.toBeNull();
      expect(within(card).getByRole('heading', { level: 2, name: service.nome })).toBeInTheDocument();
    }
    const ids = [...document.querySelectorAll('[id]')].map((element) => element.id);
    const slugOrder = ids.filter((id) => services.some((service) => service.slug === id));
    expect(slugOrder).toEqual(services.map((service) => service.slug));
  });

  it('reads "Prazo estimado" for every lead time', () => {
    renderWithProviders(<ServicesPage />, { route: '/servicos' });

    expect(screen.getAllByText(`${serviceTermLabel}:`, { exact: false })).toHaveLength(services.length);
  });

  it('speaks as "a gente" and shows no price and no percentage', () => {
    renderWithProviders(<ServicesPage />, { route: '/servicos' });

    expect(screen.getByText(servicesCopy.hero.kicker)).toBeInTheDocument();
    expect(screen.getByText(/Na consulta gratuita a gente identifica/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/preço/i);
    expect(document.body.textContent).not.toMatch(/\beu\b/i);
    expect(document.body.textContent).not.toMatch(/R\$/);
    expect(document.body.textContent).not.toMatch(/\d\s*%/);
  });

  it('lists every combo and promises no discount: the combos carry none in the data', () => {
    renderWithProviders(<ServicesPage />, { route: '/servicos' });

    for (const combo of combos) {
      expect(screen.getByText(combo.composicao)).toBeInTheDocument();
    }
    expect(screen.getByText(servicesCopy.combos.kicker)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/desconto/i);
  });

  it('invites to the consultation in the informal imperative, not the infinitive', () => {
    renderWithProviders(<ServicesPage />, { route: '/servicos' });

    expect(screen.getByRole('link', { name: 'Agenda uma consulta gratuita' })).toHaveAttribute('href', '/contato');
    expect(screen.queryByText('Agendar consulta gratuita')).toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: servicesCopy.cta.heading })).toBeInTheDocument();
  });

  it('keeps the closing band and the FAQ on the official WhatsApp number', () => {
    renderWithProviders(<ServicesPage />, { route: '/servicos' });
    const links = screen.getAllByRole('link', { name: 'Falar no WhatsApp' });

    expect(links).toHaveLength(2);
    for (const link of links) expect(link.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/5581984451243\?text=/);
  });

  it('keeps the lead, the kickers and the descriptions at readable contrast: no mid gray and no zinc text', () => {
    renderWithProviders(<ServicesPage />, { route: '/servicos' });

    const lines = [
      screen.getByText(servicesCopy.hero.lead),
      screen.getByText(/Na consulta gratuita a gente identifica/),
      screen.getByText(combos[0].composicao),
    ];
    for (const line of lines) {
      expect(line.className, line.textContent ?? '').not.toMatch(/vn-gray-mid|zinc-[3-5]00/);
    }
    for (const service of services) {
      expect(screen.getByText(service.descricao), service.slug).toHaveClass('text-vn-gray-dark');
    }
  });

  it('uses no italic, no dark: variant, no color outside the palette and at most one accent per section', () => {
    const { container } = renderWithProviders(<ServicesPage />, { route: '/servicos' });

    expect(container.innerHTML).not.toMatch(FORBIDDEN_CLASSES);
    for (const section of Array.from(container.querySelectorAll<HTMLElement>('section'))) {
      expect(findAccentElements(section).length, section.getAttribute('aria-labelledby') ?? '').toBeLessThanOrEqual(1);
    }
  });
});
