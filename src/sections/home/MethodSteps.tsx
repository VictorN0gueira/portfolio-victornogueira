import { useId } from 'react';
import { Container } from '../../components/ui/Container';
import { Heading } from '../../components/ui/Heading';
import { Kicker } from '../../components/ui/Kicker';
import { RevealGroup, RevealItem } from '../../components/ui/Reveal';
import { Section } from '../../components/ui/Section';
import { homeCopy } from '../../data/homeCopy';
import { processSteps, type ProcessStep } from '../../data/process';
import { cn } from '../../lib/utils';

const DEFAULT_ID = 'metodo';
// The time between one card and the next, in seconds.
const CARD_STAGGER_S = 0.12;

// A column below md, a 2 by 2 grid from md and four columns from lg, where the cards climb a staircase.
const LIST_CLASSES = 'grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-4';
// The top margin of each step, only from lg: below it the cards line up. The cards stretch to the bottom of their row,
// so the staircase is the tops and the 3px rules share one baseline.
const STAIRCASE = ['lg:mt-24', 'lg:mt-16', 'lg:mt-8', 'lg:mt-0'] as const;
const CARD_CLASSES =
  'flex min-w-0 flex-1 flex-col rounded-card border border-vn-gray-light bg-vn-cream p-5 text-vn-ink md:p-6';
const NUMBER_CLASSES =
  'font-display font-bold text-[length:clamp(3rem,2rem+3vw,4.5rem)] leading-none tracking-[-0.03em]';
// The title is sized from the width of its own card (cqi, relative to the @container wrapper around it), at most
// 1.75rem. "Planejamento" is about 6.24em wide, so 15cqi keeps it inside the card with the four columns of 1024px and
// with the large font, where a fixed size broke the word in the middle. It replaces the font size of the size m heading.
const TITLE_CLASSES = 'text-[length:clamp(1.125rem,15cqi,1.75rem)]';

interface StepCardProps {
  step: ProcessStep;
}

/**
 * One step: the big number, the title (an h3), the duration in mono and the description, closed by a 3px ink rule.
 * The number is decorative for assistive tech: the ordered list around the cards already says "1 of 4".
 */
function StepCard({ step }: StepCardProps) {
  return (
    <RevealItem variant="up" className={CARD_CLASSES}>
      <span aria-hidden="true" className={NUMBER_CLASSES}>
        {step.number}
      </span>
      <div className="@container mt-5">
        <Heading as="h3" size="m" className={TITLE_CLASSES}>
          {step.title}
        </Heading>
      </div>
      <p className="mt-2 font-mono text-sm text-vn-gray-dark">{step.duration}</p>
      <p className="mt-4 grow text-pretty text-base text-vn-gray-dark">{step.description}</p>
      <span aria-hidden="true" className="mt-6 block h-[3px] bg-vn-ink" />
    </RevealItem>
  );
}

interface MethodStepsProps {
  /** The id of the section, which /#metodo and the "Ver como funciona" button point at. */
  id?: string;
}

/**
 * The method in four steps, on a white section: a kicker, the h2 and a sub line, then the steps as an ordered list
 * of cards. From lg they climb a staircase (the margin above each one shrinks), at md they make a 2 by 2 grid and
 * below md a single column. The header and the cards are two RevealGroups (one observer each) and the cards rise
 * with the up variant, 0.12s apart. The list keeps role="list" because some screen readers drop the semantics of a
 * list whose markers are hidden, as they are here.
 */
export function MethodSteps({ id = DEFAULT_ID }: MethodStepsProps) {
  const headingId = useId();
  const { kicker, heading, sub } = homeCopy.method;

  return (
    <Section id={id} tone="white" labelledBy={headingId}>
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
          <RevealItem className="mt-6 max-w-2xl">
            <p className="text-pretty text-base text-vn-gray-dark md:text-lg">{sub}</p>
          </RevealItem>
        </RevealGroup>
        <RevealGroup stagger={CARD_STAGGER_S} className="mt-10 md:mt-14">
          <ol role="list" className={LIST_CLASSES}>
            {processSteps.map((step, position) => (
              <li key={step.number} className={cn('flex min-w-0', STAIRCASE[position])}>
                <StepCard step={step} />
              </li>
            ))}
          </ol>
        </RevealGroup>
      </Container>
    </Section>
  );
}

export default MethodSteps;
