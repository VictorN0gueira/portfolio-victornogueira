import { useId } from 'react';
import { Container } from '../../components/ui/Container';
import { RevealGroup, RevealItem } from '../../components/ui/Reveal';
import { Section } from '../../components/ui/Section';
import { services } from '../../data/services';
import { servicesCopy } from '../../data/servicesCopy';
import { ServiceCard } from '../shared/ServiceCard';
import { SERVICE_GRID_CLASSES, SERVICE_ITEM_CLASSES } from '../shared/serviceCardLayout';

/**
 * All the services, one card each, on a white section. The h1 of the page comes right before it, so the cards are the
 * h2 (no level is skipped) and the section needs no heading of its own: a hidden line names the region. One
 * RevealGroup (one observer) for the whole grid. Each card is the target of /servicos#<slug>.
 */
export function ServicesGrid() {
  const labelId = useId();

  return (
    <Section tone="white" labelledBy={labelId}>
      <Container>
        <span id={labelId} className="sr-only">
          {servicesCopy.gridLabel}
        </span>
        <RevealGroup>
          <div className={SERVICE_GRID_CLASSES}>
            {services.map((service) => (
              <RevealItem key={service.slug} className={SERVICE_ITEM_CLASSES}>
                <ServiceCard service={service} headingAs="h2" anchorId={service.slug} />
              </RevealItem>
            ))}
          </div>
        </RevealGroup>
      </Container>
    </Section>
  );
}
