import type { Project } from '../../data/projects';

/** The offset of a sticky column under the top of the window: `top-28` (7rem), below the floating header. */
export const STICKY_TOP_PX = 112;
/**
 * The shortest window in which a column may stick: the tallest sticky column (the gallery of Hub081, 577px measured) plus
 * the offset is 689px, and 720px leaves some air. In a shorter window the column is not sticky: it scrolls with the page,
 * so none of it is ever clipped at the bottom of the window.
 */
export const STICKY_MIN_HEIGHT_PX = 720;
/**
 * The one class string of the sticky column, for the facts and for the gallery. The class names are written out whole so
 * the stylesheet generator sees them; the 720 in them is STICKY_MIN_HEIGHT_PX and the top-28 is STICKY_TOP_PX (a test ties them).
 */
export const STICKY_COLUMN_CLASSES =
  'lg:self-start lg:[@media(min-height:720px)]:sticky lg:[@media(min-height:720px)]:top-28';

/**
 * The column that sticks beside the other from lg is the shorter one. A featured project has the large gallery (the cover
 * and two shots under it, short), so when it also lists what it does the facts are the long column and the gallery sticks.
 * Everything else has short facts or a tall stacked gallery, so the facts stick.
 */
export function stickyColumnOf(project: Project): 'facts' | 'gallery' {
  const hasLongFacts = (project.features?.length ?? 0) > 0;
  return project.featured && hasLongFacts ? 'gallery' : 'facts';
}
