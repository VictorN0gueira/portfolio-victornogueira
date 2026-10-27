import { services, type Service } from '../../data/services';

/** The categories the home shows, in the order of the cards. */
export const FEATURED_CATEGORIES = ['Automação', 'Inteligência Artificial', 'Desenvolvimento Web'] as const;

/**
 * The first service of each category, in the order of `categories`. A category with no service in the data is a
 * mistake in the data or in the list above, so it throws a clear error instead of leaving a hole in the home.
 */
export function pickFeatured(all: readonly Service[], categories: readonly Service['categoria'][]): Service[] {
  return categories.map((categoria) => {
    const service = all.find((candidate) => candidate.categoria === categoria);
    if (!service) throw new Error(`featuredServices: no service with the category "${categoria}" in src/data/services.ts`);
    return service;
  });
}

/** Built when the module loads, so a missing category fails loudly in the tests (and in any page test) before it can leave a hole in a visitor's page. */
export const featuredServices: readonly Service[] = pickFeatured(services, FEATURED_CATEGORIES);
