import { describe, expect, it } from 'vitest';
import { services } from '../../data/services';
import { FOOTER_SERVICE_LINKS, slugOf } from './footerServices';

const SLUG_SHAPE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const FIRST_OF_EACH_CATEGORY = ['automacao-essencial', 'super-agente', 'landing-page-ou-site'];

describe('slugOf', () => {
  it('has a slug of the right shape for every service of the data', () => {
    for (const service of services) {
      expect(slugOf(service), `slug of ${service.nome}`).toMatch(SLUG_SHAPE);
    }
  });

  it('gives each service its own slug', () => {
    const slugs = services.map(slugOf);

    expect(new Set(slugs).size).toBe(services.length);
  });

  it('is the slug the data itself carries', () => {
    for (const service of services) {
      expect(slugOf(service), `slug of ${service.nome}`).toBe(service.slug);
    }
  });
});

describe('FOOTER_SERVICE_LINKS', () => {
  it('has one link per category, in the order the services list them, to the first service of the category', () => {
    expect(FOOTER_SERVICE_LINKS.map((link) => link.label)).toEqual([
      'Automação',
      'Inteligência Artificial',
      'Desenvolvimento Web',
    ]);
    expect(FOOTER_SERVICE_LINKS.map((link) => link.slug)).toEqual(FIRST_OF_EACH_CATEGORY);
  });

  it('points each link at the card of that service on the services page', () => {
    expect(FOOTER_SERVICE_LINKS.map((link) => link.to)).toEqual(
      FIRST_OF_EACH_CATEGORY.map((slug) => `/servicos#${slug}`),
    );
  });
});
