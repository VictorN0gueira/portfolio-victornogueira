import type { Project } from '../data/projects';
import { ProjectFacts } from '../sections/projects/ProjectFacts';
import { ProjectHighlight } from '../sections/projects/ProjectHighlight';
import { ProjectGallery } from './ProjectDetailGallery';

interface ProjectDetailProps {
  project: Project;
}

// The facts take the narrower column and the gallery the wider one, side by side only from lg.
const BODY_CLASSES = 'grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16';

/**
 * The body of a case page, in the flow of the page (visible to search and deep linkable): the highlight phrase of a
 * featured project, then the column of facts and the gallery. The facts come first in the markup and stay in place beside
 * the gallery from lg; on a phone the screenshots are shown first (order only: the gallery holds nothing to focus, so the
 * keyboard order is the visual one). The h1 is the one of the PageHero above.
 */
export function ProjectDetail({ project }: ProjectDetailProps) {
  return (
    <div className="flex flex-col gap-10 md:gap-14">
      <ProjectHighlight project={project} />
      <div data-case-body="" className={BODY_CLASSES}>
        <ProjectFacts project={project} />
        <div className="min-w-0 max-lg:order-first">
          <ProjectGallery project={project} />
        </div>
      </div>
    </div>
  );
}
