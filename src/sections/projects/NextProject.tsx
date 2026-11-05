import { useId } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { CARD_CTA_TEXT } from '../../components/projectLabels';
import { ProjectTitle } from '../../components/ProjectTitle';
import { Container } from '../../components/ui/Container';
import { Heading } from '../../components/ui/Heading';
import { Kicker } from '../../components/ui/Kicker';
import { Section } from '../../components/ui/Section';
import { SpotlightCard } from '../../components/ui/SpotlightCard';
import type { Project } from '../../data/projects';
import { projectsCopy } from '../../data/projectsCopy';
import { useMotionAllowed } from '../../hooks/useMotionAllowed';
import { cn } from '../../lib/utils';
import { BrowserShot } from './BrowserShot';

interface NextProjectProps {
  project: Project;
}

// The cover is about half of the page from md up, the whole window width below.
const COVER_SIZES = '(min-width: 1280px) 540px, (min-width: 768px) 44vw, 92vw';
const SURFACE_CLASSES =
  'grid min-w-0 items-center gap-6 rounded-card border border-vn-gray-light bg-vn-white p-4 text-vn-ink md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-10 md:p-6';

/**
 * The end of a case page: the next project of the list in one card (the last one leads back to the first). The link is the
 * whole card, named by the kicker and the title, with an ink focus ring. The spotlight is for a fine pointer only: on
 * touch and with motion off the card is static and the arrow is the cue.
 */
export function NextProject({ project }: NextProjectProps) {
  const kickerId = useId();
  const titleId = useId();
  const isMotionAllowed = useMotionAllowed();

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
                <ArrowRight
                  aria-hidden="true"
                  className={cn(
                    'size-4 shrink-0 transition-transform duration-300 ease-out group-hover:translate-x-1',
                    !isMotionAllowed && 'transition-none group-hover:translate-x-0',
                  )}
                />
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
