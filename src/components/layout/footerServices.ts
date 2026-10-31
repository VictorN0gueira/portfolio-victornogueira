import { services, type Service } from '../../data/services';

// The card id of each service on the services page (`/servicos#<slug>`). Batch E puts `slug` on the services
// themselves: when that is merged, this map and the fallback of slugOf go away (see footerServices.test.ts).
export const SERVICE_SLUGS: Readonly<Record<string, string>> = {
  'Automação Essencial': 'automacao-essencial',
  'Automação Avançada': 'automacao-avancada',
  'Agente de IA Sob Medida': 'agente-de-ia-sob-medida',
  'Landing Page ou Site': 'landing-page-ou-site',
  'Landing Page Complexa': 'landing-page-complexa',
  'Sistema Web Sob Medida': 'sistema-web-sob-medida',
};

/** The card id of a service: the slug the data carries, or the map while the data has none. */
export function slugOf(service: Service): string {
  return (service as { slug?: string }).slug ?? SERVICE_SLUGS[service.nome];
}

export interface FooterServiceLink {
  label: Service['categoria'];
  slug: string;
  to: string;
}

function linkToFirstOf(label: Service['categoria']): FooterServiceLink {
  const first = services.find((service) => service.categoria === label) as Service;
  const slug = slugOf(first);
  return { label, slug, to: `/servicos#${slug}` };
}

/** One link per category, in the order the services list them, to the card of the first service of the category. */
export const FOOTER_SERVICE_LINKS: readonly FooterServiceLink[] = Array.from(
  new Set(services.map((service) => service.categoria)),
).map(linkToFirstOf);
