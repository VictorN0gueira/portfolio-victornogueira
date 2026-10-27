import { useId } from 'react';
import { ArrowRight, Check, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Container } from '../../components/ui/Container';
import { Heading } from '../../components/ui/Heading';
import { Kicker } from '../../components/ui/Kicker';
import { RevealGroup, RevealItem } from '../../components/ui/Reveal';
import { Section } from '../../components/ui/Section';
import { SpotlightCard } from '../../components/ui/SpotlightCard';
import { homeCopy } from '../../data/homeCopy';
import type { Service } from '../../data/services';
import { useFinePointer } from '../../hooks/useFinePointer';
import { useMotionAllowed } from '../../hooks/useMotionAllowed';
import { cn } from '../../lib/utils';
import { featuredServices } from './featuredServices';

const SERVICES_PATH = '/servicos';

// 1 column, 2 from md and 3 from lg. The third card spans both columns of md, so no card is left alone on a row.
const GRID_CLASSES = 'grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3';
const LAST_CARD_CLASSES = 'md:col-span-2 lg:col-span-1';
const RADIUS = 'rounded-[clamp(20px,3vw,28px)]';
// The article carries the tab stop and its focus ring (an outline follows the radius), the SpotlightCard inside it
// draws the surface. min-w-0 lets the card shrink below its longest word, so nothing widens a 280px page.
const ARTICLE_CLASSES = cn(
  'flex min-w-0 flex-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vn-ink',
  RADIUS,
);
const SURFACE_CLASSES = cn('flex w-full min-w-0 flex-col border border-vn-gray-light bg-vn-white p-5 text-vn-ink md:p-6', RADIUS);

interface ServiceCardProps {
  service: Service;
  /** True for a fine pointer with motion allowed: the list rests low until hover or focus (see tokens.css). */
  isHoverReveal: boolean;
}

/**
 * One service. The category is the kicker, the name an h3 that also names the article, then the description, the
 * list of what is included and the term in mono. The list is always in the DOM and in the accessibility tree: the
 * slide is a visual effect of tokens.css that only runs while the article carries data-hover-reveal. In that case
 * the article is a tab stop, so a keyboard user reveals the list by focusing the card, like a mouse user does by
 * hovering it. Without the mark (touch, reduced motion, animations off) there is no tab stop and the list just shows.
 */
function ServiceCard({ service, isHoverReveal }: ServiceCardProps) {
  const nameId = useId();

  return (
    <article
      aria-labelledby={nameId}
      data-hover-reveal={isHoverReveal ? '' : undefined}
      tabIndex={isHoverReveal ? 0 : undefined}
      className={ARTICLE_CLASSES}
    >
      <SpotlightCard as="div" className={SURFACE_CLASSES}>
        <Kicker>{service.categoria}</Kicker>
        <Heading as="h3" size="m" id={nameId} className="mt-5">
          {service.nome}
        </Heading>
        <p className="mt-3 text-pretty text-base text-vn-gray-dark">{service.descricao}</p>
        <div className="mt-6 border-t border-vn-gray-light pt-5">
          <ul className="vn-card-includes flex flex-col gap-2.5">
            {service.inclui.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm leading-snug">
                <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-auto flex items-center gap-2 pt-6 font-mono text-sm">
          <Clock aria-hidden="true" className="size-4 shrink-0" />
          <span className="sr-only">{homeCopy.services.term}: </span>
          {service.prazo}
        </p>
      </SpotlightCard>
    </article>
  );
}

/**
 * Three services of the home, one per category, each in a SpotlightCard, under a kicker and the h2 of the section,
 * with the link to the page with all of them. The header and the cards are two RevealGroups (one observer each):
 * on one column the cards sit far below the heading, so they reveal when they come into view.
 */
export function ServicesCards() {
  const headingId = useId();
  const isFinePointer = useFinePointer();
  const isMotionAllowed = useMotionAllowed();
  const isHoverReveal = isFinePointer && isMotionAllowed;
  const { kicker, heading, link } = homeCopy.services;

  return (
    <Section tone="cream" labelledBy={headingId}>
      <Container>
        <RevealGroup>
          <RevealItem>
            <Kicker>{kicker}</Kicker>
          </RevealItem>
          <RevealItem className="mt-6 max-w-4xl">
            <Heading id={headingId} size="l">
              {heading}
            </Heading>
          </RevealItem>
        </RevealGroup>
        <RevealGroup className="mt-10 md:mt-14">
          <div className={GRID_CLASSES}>
            {featuredServices.map((service, position) => (
              <RevealItem
                key={service.nome}
                className={cn('flex', position === featuredServices.length - 1 && LAST_CARD_CLASSES)}
              >
                <ServiceCard service={service} isHoverReveal={isHoverReveal} />
              </RevealItem>
            ))}
          </div>
          <RevealItem className="mt-8 md:mt-10">
            <Button asChild size="lg">
              <Link to={SERVICES_PATH}>
                {link}
                <ArrowRight aria-hidden="true" className="size-5 shrink-0" />
              </Link>
            </Button>
          </RevealItem>
        </RevealGroup>
      </Container>
    </Section>
  );
}

export default ServicesCards;
