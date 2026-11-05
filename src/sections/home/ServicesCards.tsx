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
import { cn } from '../../lib/utils';
import { featuredServices } from './featuredServices';

const SERVICES_PATH = '/servicos';

// 1 column, 2 from md and 3 from lg. With an odd number of cards the last one spans both columns of md.
// The cards of a row share their five parts (kicker, name, description, list, term) through a subgrid from md: the
// grid, the item, the article and the surface each span the five rows and take them from the level above, so the
// name, the divider, the list and the term line up across the cards whatever wraps. There is no row gap in the grid
// (it would open a gap between the five rows of one card): each item carries its own bottom margin from md.
const GRID_CLASSES = 'grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-5 md:gap-y-0 lg:grid-cols-3';
const LAST_CARD_CLASSES = 'md:col-span-2 lg:col-span-1';
const SUBGRID_CLASSES = 'md:row-span-5 md:grid md:grid-cols-[minmax(0,1fr)] md:grid-rows-subgrid';
// The article is a plain flex column that names itself from its h3 and has no look of its own: the SpotlightCard inside
// it draws the surface (radius, border, background). min-w-0 lets the card shrink below its longest word, so nothing
// widens a 280px page.
const ARTICLE_CLASSES = `flex min-w-0 flex-1 ${SUBGRID_CLASSES}`;
const SURFACE_CLASSES = `flex w-full min-w-0 flex-col rounded-card border border-vn-gray-light bg-vn-white p-5 text-vn-ink md:p-6 ${SUBGRID_CLASSES}`;

interface ServiceCardProps {
  service: Service;
}

/**
 * One service. The category is the kicker, the name an h3 that also names the article, then the description, the
 * list of what is included and the term in mono. The card is not interactive: no tab stop, no hidden content. The
 * list is always visible at full contrast, on every device; on a fine pointer it only settles 8px into place while
 * the pointer is over the card (tokens.css, CSS only, transform alone).
 */
function ServiceCard({ service }: ServiceCardProps) {
  const nameId = useId();

  return (
    <article aria-labelledby={nameId} className={ARTICLE_CLASSES}>
      <SpotlightCard as="div" className={SURFACE_CLASSES}>
        <Kicker>{service.categoria}</Kicker>
        <Heading as="h3" size="m" id={nameId} className="mt-5">
          {service.nome}
        </Heading>
        <p className="mt-3 text-pretty text-base text-vn-gray-dark">{service.descricao}</p>
        <div className="mt-6 border-t border-vn-gray-light pt-5">
          {/* role="list": Tailwind preflight removes the markers, and Safari then drops the list semantics. */}
          <ul role="list" className="vn-card-includes flex flex-col gap-2.5">
            {service.inclui.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm leading-snug">
                <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="flex items-center gap-2 self-start pt-6 font-mono text-sm">
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
  // With an odd number of cards the last one spans the two columns of md, so none is left alone on its row.
  const isOdd = featuredServices.length % 2 === 1;
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
                key={service.slug}
                className={cn(
                  'flex md:mb-5',
                  SUBGRID_CLASSES,
                  isOdd && position === featuredServices.length - 1 && LAST_CARD_CLASSES,
                )}
              >
                <ServiceCard service={service} />
              </RevealItem>
            ))}
          </div>
          <RevealItem className="mt-8 md:mt-5">
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
