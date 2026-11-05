import { useId } from 'react';
import { Container } from '../../components/ui/Container';
import { Cursor } from '../../components/ui/Cursor';
import { Heading } from '../../components/ui/Heading';
import { Kicker } from '../../components/ui/Kicker';
import { RevealGroup, RevealItem } from '../../components/ui/Reveal';
import { ScanGrid } from '../../components/ui/ScanGrid';
import { Section } from '../../components/ui/Section';
import { combos } from '../../data/services';
import { servicesCopy } from '../../data/servicesCopy';
import { ComboCard } from './ComboCard';

/**
 * The combos on a black section: kicker, an h2 that ends in the cursor (the one accent of the section) and one card per
 * combo. Two RevealGroups (one observer each): on one column the cards sit far below the heading.
 */
export function ComboCards() {
  const headingId = useId();
  const { kicker, heading } = servicesCopy.combos;

  return (
    <Section tone="black" labelledBy={headingId}>
      <ScanGrid tone="dark" keepContentClear />
      <Container>
        <RevealGroup>
          <RevealItem>
            <Kicker tone="dark">{kicker}</Kicker>
          </RevealItem>
          <RevealItem className="mt-6 max-w-4xl">
            <Heading id={headingId} size="l">
              <span className="whitespace-nowrap">
                {heading}
                <Cursor tone="accent" className="ml-[0.2em]" />
              </span>
            </Heading>
          </RevealItem>
        </RevealGroup>
        <RevealGroup className="mt-10 md:mt-14">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
            {combos.map((combo) => (
              <RevealItem key={combo.nome} className="flex min-w-0">
                <ComboCard combo={combo} />
              </RevealItem>
            ))}
          </div>
        </RevealGroup>
      </Container>
    </Section>
  );
}
