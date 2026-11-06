import { useId } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Container } from '../../components/ui/Container';
import { Heading } from '../../components/ui/Heading';
import { Kicker } from '../../components/ui/Kicker';
import { RevealGroup, RevealItem } from '../../components/ui/Reveal';
import { Section } from '../../components/ui/Section';
import { homeCopy } from '../../data/homeCopy';
import { cn } from '../../lib/utils';
import { ServiceCard } from '../shared/ServiceCard';
import { SERVICE_GRID_CLASSES, SERVICE_ITEM_CLASSES } from '../shared/serviceCardLayout';
import { featuredServices } from './featuredServices';

const SERVICES_PATH = '/servicos';

const LAST_CARD_CLASSES = 'md:col-span-2 lg:col-span-1';

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
          <div className={SERVICE_GRID_CLASSES}>
            {featuredServices.map((service, position) => (
              <RevealItem
                key={service.slug}
                className={cn(
                  SERVICE_ITEM_CLASSES,
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
