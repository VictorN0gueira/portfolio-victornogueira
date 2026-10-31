import { describe, expect, it } from 'vitest';
import { services } from '../../data/services';
import { FOOTER_SERVICE_LINKS, SERVICE_SLUGS, slugOf } from './footerServices';

// MERGE STEP (batch E adds `slug` to every service in src/data/services.ts): once it is merged, delete SERVICE_SLUGS
// and the fallback of slugOf in footerServices.ts, so slugOf is just `service.slug`, and keep this file. Until then
// the map holds the slugs the services page will use as card ids. The test below compares the two whenever the data
// has the field, so a slug that E renames (or a service it adds) fails here instead of breaking the footer anchors.

const SLUG_SHAPE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const FIRST_OF_EACH_CATEGORY = ['automacao-essencial', 'agente-de-ia-sob-medida', 'landing-page-ou-site'];

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

  it('agrees with the slug the data itself carries, when it carries one', () => {
    for (const service of services) {
      const carried = (service as { slug?: string }).slug;
      if (carried === undefined) continue;

      expect(SERVICE_SLUGS[service.nome], `map entry of ${service.nome}`).toBe(carried);
    }
  });

  it('knows exactly the services of the data: a renamed or new service fails here', () => {
    expect(Object.keys(SERVICE_SLUGS).sort()).toEqual(services.map((service) => service.nome).sort());
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
