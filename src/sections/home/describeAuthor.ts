import type { Testimonial } from '../../data/testimonials';

/** Same words, whatever the spaces around them, the case and the accents: "Karla Alvares " is "karla alvarés". */
const isSameText = (first: string, second: string): boolean =>
  first.trim().localeCompare(second.trim(), 'pt-BR', { sensitivity: 'base' }) === 0;

/**
 * What the author does and where, for a card or the dialog: the role, then the company, joined by a comma. The company
 * is left out when it is only the author's own name again (a freelancer whose company is his name), so the name is
 * never printed twice, and an empty part is left out with its comma.
 */
export function describeAuthor({ name, role, company }: Pick<Testimonial, 'name' | 'role' | 'company'>): string {
  return [role, isSameText(company, name) ? '' : company].filter(Boolean).join(', ');
}
