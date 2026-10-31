import { useId } from 'react';
import { Container } from '../../components/ui/Container';
import { CountUp } from '../../components/ui/CountUp';
import { Heading } from '../../components/ui/Heading';
import { Kicker } from '../../components/ui/Kicker';
import { RevealGroup, RevealItem } from '../../components/ui/Reveal';
import { Section } from '../../components/ui/Section';
import { SpotlightCard } from '../../components/ui/SpotlightCard';
import { homeCopy } from '../../data/homeCopy';
import { stats } from '../../data/stats';

const { kicker: KICKER, heading: STATEMENT, sub: SUB } = homeCopy.statement;

const GRID_CLASSES = 'mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 md:mt-14 md:gap-5 lg:grid-cols-4';
const CARD_CLASSES =
  'flex-1 min-w-0 rounded-[clamp(20px,3vw,28px)] border border-vn-gray-light bg-vn-white p-5 text-vn-ink md:p-6';
// The number is sized from the width of its own box (cqi), so "500h+" fits the narrowest card, a 4 column card at
// 1024px with the large font on, and the 1 column card of a 280px screen alike, without a breakpoint per case.
// leading-none comes after the font size on purpose: CountUp merges this with twMerge, which drops a leading
// class that sits before a font size class, and the number would get the 1.5 line height of the body.
const NUMBER_CLASSES =
  'font-display font-bold tracking-[-0.03em] text-[length:clamp(2rem,24cqi,3.75rem)] leading-none';

/**
 * The statement of the home: a big sentence on cream and the four numbers of the work under it, each in a
 * SpotlightCard. One RevealGroup observes the header and a nested one observes the grid (still one observer per
 * container). The empty slot is where the illustration phase puts its drawing, so it takes no space until then.
 */
export function StatementStats() {
  const headingId = useId();

  return (
    <Section tone="cream" labelledBy={headingId}>
      <Container>
        <RevealGroup>
          <RevealItem>
            <Kicker>{KICKER}</Kicker>
          </RevealItem>
          <RevealItem className="mt-6 max-w-5xl">
            <Heading id={headingId} size="xl">
              {STATEMENT}
            </Heading>
          </RevealItem>
          <RevealItem className="mt-6 max-w-2xl">
            <p className="text-pretty text-base text-vn-gray-dark md:text-lg">{SUB}</p>
          </RevealItem>
          <div data-slot="illustration" />
          {/* Its own group: on one column the cards sit far below the heading, so they reveal when the grid is in view. */}
          <RevealGroup className={GRID_CLASSES}>
            {stats.map(({ id, value, label, description }) => (
              <RevealItem key={id} className="flex">
                <SpotlightCard as="div" className={CARD_CLASSES}>
                  <div className="@container">
                    <CountUp value={value} className={NUMBER_CLASSES} />
                  </div>
                  <div className="mt-5 border-t border-vn-gray-light pt-4">
                    <p className="text-base font-medium leading-snug">{label}</p>
                    <p className="mt-2 text-sm leading-relaxed text-vn-gray-dark">{description}</p>
                  </div>
                </SpotlightCard>
              </RevealItem>
            ))}
          </RevealGroup>
        </RevealGroup>
      </Container>
    </Section>
  );
}

export default StatementStats;
