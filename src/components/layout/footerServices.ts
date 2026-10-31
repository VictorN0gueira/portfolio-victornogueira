import { services, type Service } from '../../data/services';

/** The card id of a service on the services page (`/servicos#<slug>`): the slug the data carries. */
export function slugOf(service: Service): string {
  return service.slug;
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
