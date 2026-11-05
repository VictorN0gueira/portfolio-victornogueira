import { useId } from 'react';
import { Link } from 'react-router-dom';
import { CARD_CTA_TEXT } from '../../components/projectLabels';
import { ProjectTitle } from '../../components/ProjectTitle';
import { Container } from '../../components/ui/Container';
import { Heading } from '../../components/ui/Heading';
import { Kicker } from '../../components/ui/Kicker';
import { Section } from '../../components/ui/Section';
import { SpotlightCard } from '../../components/ui/SpotlightCard';
import type { Project } from '../../data/projects';
import { projectsCopy } from '../../data/projectsCopy';
import { BrowserShot } from './BrowserShot';
import { MotionArrow } from './MotionArrow';

interface NextProjectProps {
  /** The project that comes next in the list; nothing when the list has none. */
  project: Project | undefined;
  /** The project of the page: when the list has only that one, the next is itself and there is nothing to show. */
  currentSlug: string;
}

// Widths measured on the layout: the card has 24px of padding from md and a 40px gap between its two columns, so with
// 1120px of content (a 1216px window and up) the cover is 516px, and between md and there it is half of the window minus
// 96px of gutters, 48px of padding and the gap. Under md the card is one column: the window minus the gutters (32px) and
// the padding of the card (32px) and 8px of air.
const COVER_SIZES = '(min-width: 1216px) 516px, (min-width: 768px) calc((100vw - 184px) / 2), calc(100vw - 72px)';
const SURFACE_CLASSES =
  'grid min-w-0 items-center gap-6 rounded-card border border-vn-gray-light bg-vn-white p-4 text-vn-ink md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-10 md:p-6';

/**
 * The end of a case page: the next project of the list in one card (the last one leads back to the first). The link is the
 * whole card, named by the kicker and the title, with an ink focus ring. The spotlight is for a fine pointer only: on
 * touch and with motion off the card is static and the arrow is the cue, and it also settles on keyboard focus.
 */
export function NextProject({ project, currentSlug }: NextProjectProps) {
  const kickerId = useId();
  const titleId = useId();

  if (!project || project.slug === currentSlug) return null;

  return (
    <Section tone="cream" labelledBy={titleId}>
      <Container>
        <Link
          to={`/projetos/${project.slug}`}
          aria-labelledby={`${kickerId} ${titleId}`}
          className="group block min-w-0 rounded-card vn-focus-ring-ink"
        >
          <SpotlightCard as="div" className={SURFACE_CLASSES}>
            <div className="min-w-0">
              <div id={kickerId}>
                <Kicker>{projectsCopy.nextKicker}</Kicker>
              </div>
              <Heading as="h2" size="l" id={titleId} className="mt-6">
                <ProjectTitle title={project.title} />
              </Heading>
              <p className="mt-4 font-mono text-xs uppercase tracking-[.18em] text-vn-gray-dark">{project.category}</p>
              <span className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium">
                {CARD_CTA_TEXT}
                <MotionArrow />
              </span>
            </div>
            <BrowserShot
              shot={project.shots[0]}
              slug={project.slug}
              sizes={COVER_SIZES}
              imageClassName="aspect-[2.1/1] w-full object-cover object-left-top"
            />
          </SpotlightCard>
        </Link>
      </Container>
    </Section>
  );
}
