import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { Project } from '../data/projects';
import { useMotionAllowed } from '../hooks/useMotionAllowed';
import { cn } from '../lib/utils';
import { BrowserShot } from '../sections/projects/BrowserShot';
import { Heading } from './ui/Heading';
import { SpotlightCard } from './ui/SpotlightCard';
import { CARD_CTA_TEXT } from './projectLabels';
import { ProjectTitle } from './ProjectTitle';

// The cover takes a bit more than half of the 1216px page on desktop, the full window width on a phone.
const COVER_SIZES = '(min-width: 1280px) 700px, (min-width: 1024px) 56vw, 92vw';
// The two small shots share the media column: half of it on desktop and a tablet, hidden on a phone.
const STRIP_SIZES = '(min-width: 1280px) 340px, (min-width: 1024px) 28vw, 44vw';

// The link has no look of its own and its ring is ink: the card is black on a white section, so a white ring would vanish.
const LINK_CLASSES = 'group block min-w-0 rounded-shell vn-focus-ring-ink';
const SURFACE_CLASSES =
  'grid min-w-0 gap-8 rounded-shell bg-vn-black p-4 text-vn-white md:p-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-center lg:gap-12 lg:p-8';
const SMALL_SHOT_CLASSES = 'aspect-[2/1] w-full object-cover object-left-top';
const CTA_ARROW_CLASSES = 'size-4 shrink-0 transition-transform duration-300 ease-out group-hover:translate-x-1';

interface FeaturedProjectCardProps {
  project: Project;
  /** The first card of the page loads its cover right away; the others wait for the scroll. */
  priority?: boolean;
}

/*
 * Large card of a featured project (DizPara, Hub081) on /projetos, on the brand black: the text on one side, the cover
 * and the other two shots in browser frames on the other (the two small ones are left to the case page on a phone).
 * The text comes first in the markup, so a screen reader meets the name before the long image descriptions. The card has
 * the spotlight (fine pointer only) and no accent: the highlight phrase and the white pill carry it.
 */
export function FeaturedProjectCard({ project, priority = false }: FeaturedProjectCardProps) {
  const [cover, ...strip] = project.shots;
  const titleId = `featured-project-${project.slug}`;
  const ctaId = `${titleId}-cta`;
  const isMotionAllowed = useMotionAllowed();

  return (
    <Link to={`/projetos/${project.slug}`} aria-labelledby={`${titleId} ${ctaId}`} className={LINK_CLASSES}>
      <SpotlightCard as="div" tone="dark" className={SURFACE_CLASSES}>
        <div className="order-2 flex min-w-0 flex-col justify-center pb-2 lg:order-none lg:col-start-2 lg:row-start-1 lg:py-4">
          <p className="font-mono text-xs uppercase tracking-[.18em] text-vn-gray-light">{project.category}</p>
          <Heading as="h2" size="l" id={titleId} className="mt-4">
            <ProjectTitle title={project.title} />
          </Heading>
          <p className="mt-5 text-pretty text-xl font-medium leading-snug md:text-2xl">{project.highlight}</p>
          <p className="mt-4 max-w-md text-pretty text-base text-vn-gray-light">{project.description}</p>
          <ul role="list" className="mt-6 flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-vn-gray-dark px-3 py-1 font-mono text-xs text-vn-gray-light"
              >
                {tag}
              </li>
            ))}
          </ul>
          <span className="mt-8 inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-vn-white px-6 py-3 text-sm font-medium text-vn-black">
            <span id={ctaId}>{CARD_CTA_TEXT}</span>
            <ArrowRight
              aria-hidden="true"
              className={cn(CTA_ARROW_CLASSES, !isMotionAllowed && 'transition-none group-hover:translate-x-0')}
            />
          </span>
        </div>

        <div className="order-1 min-w-0 lg:order-none lg:col-start-1 lg:row-start-1">
          <BrowserShot shot={cover} slug={project.slug} sizes={COVER_SIZES} priority={priority} />
          <div data-featured-strip="" className="mt-3 hidden grid-cols-2 gap-3 sm:grid md:mt-4 md:gap-4">
            {strip.map((shot) => (
              <BrowserShot
                key={shot.image.src}
                shot={shot}
                slug={project.slug}
                sizes={STRIP_SIZES}
                imageClassName={SMALL_SHOT_CLASSES}
              />
            ))}
          </div>
        </div>
      </SpotlightCard>
    </Link>
  );
}
