import * as labels from '../components/projectLabels';
import { projects, type Project } from '../data/projects';

// The rules of the copy of the projects pages, in one place: the data tests and the page tests both use them.

/** Em and en dashes and their look-alikes (figure dash, horizontal bar, minus, small and full width hyphens), and spaced hyphens. */
export const DASH_RULE = /[\u2010-\u2015\u2212\u2e3a\u2e3b\ufe58\ufe63\uff0d]| - |--/;
/** " / " used as a separator. */
export const SLASH_RULE = / \/ /;
/** Sales wording, inflated claims, and numbers that claim a result. */
export const SALES_RULE =
  /orquestrad|moderna|inteligente|revolucion|incr[ií]vel|alta convers|de ponta|otimizad|complet[oa]|personalizad|definitiv|exclusiv|em segundos|tempo real|\d\s?%|garant|ilimitad/i;
/** The voice is "a gente": no first person singular. */
export const FIRST_PERSON_RULE = /\b(eu|meu|meus|minha|minhas)\b/i;

/** The only numbers the copy may carry: names, and what is printed on a screen (the "5 minutos" of the diagnostic page). */
const ALLOWED_NUMBERS = /Hub081|5 minutos/g;
export const NUMBER_RULE = /\d/;

/** Every fixed sentence the components render: the constants themselves, and the gallery label for each project. */
export const COMPONENT_LITERALS: readonly string[] = [
  ...(Object.values(labels) as unknown[]).filter((value): value is string => typeof value === 'string'),
  ...projects.map((project) => labels.galleryLabel(project.title)),
];

/** Every sentence a visitor can read on the projects pages, plus the alt texts of the images, as { where, text }. */
export function visibleCopy(): { where: string; text: string }[] {
  const fromProject = (project: Project) =>
    [
      project.title,
      project.category,
      project.description,
      project.highlight ?? '',
      ...(project.features ?? []),
      ...project.tags,
      ...project.shots.map((shot) => shot.alt),
    ]
      .filter((text) => text.length > 0)
      .map((text) => ({ where: project.slug, text }));
  return [...projects.flatMap(fromProject), ...COMPONENT_LITERALS.map((text) => ({ where: 'page', text }))];
}

/** The copy lines that break one rule. */
export function offenders(rule: RegExp, transform: (text: string) => string = (text) => text): string[] {
  return visibleCopy()
    .filter(({ text }) => rule.test(transform(text)))
    .map(({ where, text }) => `${where}: ${text}`);
}

export function withoutAllowedNumbers(text: string): string {
  return text.replace(ALLOWED_NUMBERS, '');
}
