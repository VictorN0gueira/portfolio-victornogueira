import type { Project } from '../data/projects';
import { cn } from '../lib/utils';
import { ProjectFacts } from '../sections/projects/ProjectFacts';
import { ProjectHighlight } from '../sections/projects/ProjectHighlight';
import { STICKY_COLUMN_CLASSES, stickyColumnOf } from '../sections/projects/stickyColumn';
import { ProjectGallery } from './ProjectDetailGallery';

interface ProjectDetailProps {
  project: Project;
}

// The facts take the narrower column and the gallery the wider one, side by side only from lg.
//
// Floating buttons (decision of the review of batch P): the old case page reserved a right gutter for them
// (CLEAR_FLOATING_BUTTONS). The new pages do not: they follow the home, which has the same gutters, and the accessibility
// tab is draggable by the visitor, so a fixed gutter would not be reliable. Measured: at the end of the scroll no text
// stays under the buttons.
//
// Sticky column: the shorter of the two sticks, chosen from the content (stickyColumnOf), and only in a window tall enough
// for it (STICKY_MIN_HEIGHT_PX, from the tallest sticky column plus its offset). In a shorter window nothing sticks and the
// page scrolls as one, so no part of a column is clipped at the bottom of the window. Measured at 1024x600, 1280x600,
// 1366x657, 1024x768, 1366x768 and 1440x900 by e2e/page-projeto.spec.ts.
const BODY_CLASSES = 'grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16';

/**
 * The body of a case page, in the flow of the page (visible to search and deep linkable): the highlight phrase of a
 * featured project, then the column of facts and the gallery. The facts come first in the markup and, from lg, in a tall enough
 * window, the shorter of the two columns stays in place while the other scrolls; on a phone the screenshots are shown first (order only: the gallery holds nothing to focus, so the
 * keyboard order is the visual one). The h1 is the one of the PageHero above.
 */
export function ProjectDetail({ project }: ProjectDetailProps) {
  const isGallerySticky = stickyColumnOf(project) === 'gallery';

  return (
    <div className="flex flex-col gap-10 md:gap-14">
      <ProjectHighlight project={project} />
      <div data-case-body="" className={BODY_CLASSES}>
        <ProjectFacts project={project} isSticky={!isGallerySticky} />
        <div className={cn('min-w-0 max-lg:order-first', isGallerySticky && STICKY_COLUMN_CLASSES)}>
          <ProjectGallery project={project} />
        </div>
      </div>
    </div>
  );
}
