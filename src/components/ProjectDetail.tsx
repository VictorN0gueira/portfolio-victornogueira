import type { Project } from '../data/projects';
import { cn } from '../lib/utils';
import { ProjectFacts } from '../sections/projects/ProjectFacts';
import { ProjectHighlight } from '../sections/projects/ProjectHighlight';
import { ProjectGallery } from './ProjectDetailGallery';

interface ProjectDetailProps {
  project: Project;
}

// The facts take the narrower column and the gallery the wider one, side by side only from lg.
//
// Decision (M2 of the review of batch P): no right gutter is kept clear of the floating buttons, as the old case page did.
// The home has the same gutters, and the accessibility tab is draggable by the visitor, so a fixed gutter would not be
// reliable. Decision (M3): the shorter column is the one that sticks. A regular case has short facts beside three stacked
// shots, so the facts stick; a featured case has long facts (the list of what it does) beside a short gallery, so the
// gallery sticks. Either way the column that sticks fits the window (measured at 1024x768, 1366x768 and 1440x900), nothing is
// clipped at the bottom and no hole is left under the shorter column.
const STICKY_GALLERY_CLASSES = 'lg:sticky lg:top-28 lg:self-start';
const BODY_CLASSES = 'grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16';

/**
 * The body of a case page, in the flow of the page (visible to search and deep linkable): the highlight phrase of a
 * featured project, then the column of facts and the gallery. The facts come first in the markup and, from lg, the shorter
 * of the two columns stays in place while the other scrolls; on a phone the screenshots are shown first (order only: the gallery holds nothing to focus, so the
 * keyboard order is the visual one). The h1 is the one of the PageHero above.
 */
export function ProjectDetail({ project }: ProjectDetailProps) {
  const isFeatured = Boolean(project.featured);

  return (
    <div className="flex flex-col gap-10 md:gap-14">
      <ProjectHighlight project={project} />
      <div data-case-body="" className={BODY_CLASSES}>
        <ProjectFacts project={project} isSticky={!isFeatured} />
        <div className={cn('min-w-0 max-lg:order-first', isFeatured && STICKY_GALLERY_CLASSES)}>
          <ProjectGallery project={project} />
        </div>
      </div>
    </div>
  );
}
