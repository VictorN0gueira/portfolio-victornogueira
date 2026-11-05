import { Link } from 'react-router-dom';
import type { Project } from '../data/projects';
import { useMotionAllowed } from '../hooks/useMotionAllowed';
import { cn } from '../lib/utils';
import { BrowserShot } from '../sections/projects/BrowserShot';
import { MotionArrow } from '../sections/projects/MotionArrow';
import { TagList } from '../sections/projects/TagList';
import { Heading } from './ui/Heading';
import { SpotlightCard } from './ui/SpotlightCard';
import { CARD_CTA_TEXT } from './projectLabels';
import { ProjectTitle } from './ProjectTitle';

interface ProjectCardProps {
  project: Project;
  /** The `sizes` attribute of the cover: the width the card takes at each breakpoint (see projectGrid.ts). */
  imageSizes: string;
}

const LINK_CLASSES = 'group block h-full min-w-0 rounded-card vn-focus-ring-ink';
const SURFACE_CLASSES =
  'flex h-full min-w-0 flex-col rounded-card border border-vn-gray-light bg-vn-cream p-3 text-vn-ink md:p-4';
const COVER_CLASSES = 'aspect-[2.1/1] w-full object-cover object-left-top';
// The cover grows 2% under the pointer and on keyboard focus: a transform, and only where motion is welcome.
const COVER_HOVER_CLASSES =
  'transition-transform duration-500 ease-out group-hover:scale-[1.02] group-focus-visible:scale-[1.02]';

/*
 * Card of a regular project on the /projetos grid. The whole card is one link to the case page. The cover sits in the
 * browser frame of the brand, and the card has the spotlight (a glow that follows a fine pointer, a ring on hover and on
 * keyboard focus): on touch and with motion off it is static, and the "Ver detalhes" line with its arrow is the cue.
 */
export function ProjectCard({ project, imageSizes }: ProjectCardProps) {
  const titleId = `project-card-${project.slug}`;
  const ctaId = `${titleId}-cta`;
  const isMotionAllowed = useMotionAllowed();

  return (
    <Link to={`/projetos/${project.slug}`} aria-labelledby={`${titleId} ${ctaId}`} className={LINK_CLASSES}>
      <SpotlightCard as="div" className={SURFACE_CLASSES}>
        <BrowserShot
          shot={project.shots[0]}
          slug={project.slug}
          sizes={imageSizes}
          imageClassName={cn(COVER_CLASSES, isMotionAllowed && COVER_HOVER_CLASSES)}
        />
        <div className="flex min-w-0 flex-1 flex-col px-1 pb-1 pt-5 md:px-2">
          <p className="font-mono text-xs uppercase tracking-[.18em] text-vn-gray-dark">{project.category}</p>
          <Heading as="h2" size="m" id={titleId} className="mt-3">
            <ProjectTitle title={project.title} />
          </Heading>
          <p className="mt-3 max-w-md text-pretty text-base text-vn-gray-dark">{project.description}</p>
          <TagList tags={project.tags} className="mt-4" />
          <span className="mt-auto inline-flex min-h-11 items-center gap-2 self-start pt-4 text-sm font-medium">
            <span id={ctaId}>{CARD_CTA_TEXT}</span>
            <MotionArrow />
          </span>
        </div>
      </SpotlightCard>
    </Link>
  );
}
