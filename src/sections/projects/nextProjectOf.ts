import { projects, type Project } from '../../data/projects';

/**
 * The project that follows `slug` in the list; the last one goes back to the first. A slug that is not in the list gives
 * the first project, and a list of one gives that one. An empty list has none to give, so the answer is undefined.
 */
export function nextProjectOf(slug: string, list: readonly Project[] = projects): Project | undefined {
  if (list.length === 0) return undefined;
  const index = list.findIndex((project) => project.slug === slug);
  return index === -1 ? list[0] : list[(index + 1) % list.length];
}
