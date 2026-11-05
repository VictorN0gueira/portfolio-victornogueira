import { Link } from 'react-router-dom';
import type { Project } from '../data/projects';
import { BrowserShot } from '../sections/projects/BrowserShot';
import { MotionArrow } from '../sections/projects/MotionArrow';
import { NoBreakHyphens } from '../sections/projects/NoBreakHyphens';
import { TagList } from '../sections/projects/TagList';
import { Heading } from './ui/Heading';
import { SpotlightCard } from './ui/SpotlightCard';
import { CARD_CTA_TEXT } from './projectLabels';
import { ProjectTitle } from './ProjectTitle';

// Widths measured on the layout: the page is 1216px wide with 48px gutters (1120px of content from a 1216px window),
// the card has 32px of padding from lg and a 48px gap between its two columns (1.35fr and 1fr), so the cover is
// 579px at 1216px and up, and about 47vw between lg and there. The two small shots share the cover's column in two,
// 281px each at 1216px and up and about 23vw before it. Under lg the card is one column: the window minus the gutters
// and the padding of the card.
const COVER_SIZES =
  '(min-width: 1216px) 579px, (min-width: 1024px) 47vw, (min-width: 768px) calc(100vw - 144px), calc(100vw - 64px)';
const STRIP_SIZES =
  '(min-width: 1216px) 281px, (min-width: 1024px) 23vw, (min-width: 768px) calc((100vw - 160px) / 2), calc((100vw - 76px) / 2)';

// The link has no look of its own and its ring is ink: the card is black on a white section, so a white ring would vanish.
const LINK_CLASSES = 'group block min-w-0 rounded-shell vn-focus-ring-ink';
const SURFACE_CLASSES =
  'grid min-w-0 gap-8 rounded-shell bg-vn-black p-4 text-vn-white md:p-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-center lg:gap-12 lg:p-8';
const TEXT_CLASSES =
  'order-2 flex min-w-0 flex-col justify-center pb-2 lg:order-none lg:col-start-2 lg:row-start-1 lg:py-4';
const SMALL_SHOT_CLASSES = 'aspect-[2/1] w-full object-cover object-left-top';

interface FeaturedProjectCardProps {
  project: Project;
  /** The first card of the page loads its cover right away; the others wait for the scroll. */
  priority?: boolean;
}

/** The text side: category, name, highlight phrase, description, tags and the white pill that says "Ver detalhes". */
function FeaturedText({ project, titleId, ctaId }: { project: Project; titleId: string; ctaId: string }) {
  return (
    <div className={TEXT_CLASSES}>
      <p className="font-mono text-xs uppercase tracking-[.18em] text-vn-gray-light">{project.category}</p>
      <Heading as="h2" size="l" id={titleId} className="mt-4">
        <ProjectTitle title={project.title} />
      </Heading>
      <p className="mt-5 text-pretty text-xl font-medium leading-snug md:text-2xl">
        <NoBreakHyphens text={project.highlight ?? ''} />
      </p>
      <p className="mt-4 max-w-md text-pretty text-base text-vn-gray-light">
        <NoBreakHyphens text={project.description} />
      </p>
      <TagList tags={project.tags} tone="dark" className="mt-6" />
      <span className="mt-8 inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-vn-white px-6 py-3 text-sm font-medium text-vn-black">
        <span id={ctaId}>{CARD_CTA_TEXT}</span>
        <MotionArrow />
      </span>
    </div>
  );
}

/** The media side: the cover and, from sm, the two other shots under it. */
function FeaturedMedia({ project, priority }: { project: Project; priority: boolean }) {
  const [cover, ...strip] = project.shots;

  return (
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
  );
}

/*
 * Large card of a featured project (DizPara, Hub081) on /projetos, on the brand black: the text on one side, the cover
 * and the other two shots in browser frames on the other (the two small ones are left to the case page on a phone).
 * The text comes first in the markup, so a screen reader meets the name before the long image descriptions. The card has
 * the spotlight (fine pointer only) and no accent: the highlight phrase and the white pill carry it.
 */
export function FeaturedProjectCard({ project, priority = false }: FeaturedProjectCardProps) {
  const titleId = `featured-project-${project.slug}`;

  return (
    <Link to={`/projetos/${project.slug}`} aria-labelledby={`${titleId} ${titleId}-cta`} className={LINK_CLASSES}>
      <SpotlightCard as="div" tone="dark" className={SURFACE_CLASSES}>
        <FeaturedText project={project} titleId={titleId} ctaId={`${titleId}-cta`} />
        <FeaturedMedia project={project} priority={priority} />
      </SpotlightCard>
    </Link>
  );
}
