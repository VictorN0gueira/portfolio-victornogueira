import { notFoundCopy } from '../data/notFoundCopy';

/**
 * Query options for the h1 of the 404. The words of the title are inline boxes that each carry the space after them,
 * and the name computation of jsdom trims the text of every inline box, so it would read "Páginanãoencontrada". The h1
 * is matched by its text instead. The name a real browser gives it is proved in e2e/page-404.spec.ts, from the
 * accessibility tree.
 */
export const NOT_FOUND_HEADING = {
  level: 1,
  name: (_name: string, element: Element): boolean => element.textContent === notFoundCopy.title,
} as const;
