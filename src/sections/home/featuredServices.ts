import { services, type Service } from '../../data/services';

/** The categories the home shows, in the order of the cards. */
export const FEATURED_CATEGORIES = ['Automação', 'Inteligência Artificial', 'Desenvolvimento Web'] as const;

/**
 * The first service of each category, in the order of `categories`.
 * A category with no service is skipped, so the home shows the cards that exist instead of failing to load.
 * The data test is the loud guard: it fails when a featured category has no service.
 */
export function pickFeatured(all: readonly Service[], categories: readonly Service['categoria'][]): Service[] {
  return categories.flatMap((categoria) => {
    const service = all.find((candidate) => candidate.categoria === categoria);
    return service ? [service] : [];
  });
}

export const featuredServices: readonly Service[] = pickFeatured(services, FEATURED_CATEGORIES);
