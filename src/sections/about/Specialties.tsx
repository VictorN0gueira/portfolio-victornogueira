import { useId, type ComponentType, type SVGProps } from 'react';
import { BrainCircuit, Globe, Workflow } from 'lucide-react';
import { Container } from '../../components/ui/Container';
import { Heading } from '../../components/ui/Heading';
import { RevealGroup, RevealItem } from '../../components/ui/Reveal';
import { Section } from '../../components/ui/Section';
import { SpotlightCard } from '../../components/ui/SpotlightCard';
import { founderVoice } from './founderVoice';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

// One icon per specialty, in ink: the specialties have no color of their own.
const ICONS: Record<(typeof founderVoice.specialties)[number]['id'], Icon> = {
  '01': Workflow,
  '02': BrainCircuit,
  '03': Globe,
};
const CARD_STAGGER_S = 0.1;
// The title is sized from the width of its own card (cqi, the @container wrapper around it), at most 1.75rem: the longest
// word, "Desenvolvimento", is about 7.7em wide, so 11cqi keeps it whole in the three columns of md and with the large font.
// It replaces the font size of the size m heading.
const TITLE_CLASSES = 'text-[length:clamp(1.125rem,11cqi,1.75rem)]';
const LIST_CLASSES = 'mt-10 grid grid-cols-1 gap-4 md:mt-14 md:grid-cols-3 md:gap-5';
const CARD_CLASSES =
  'flex w-full min-w-0 flex-col rounded-card border border-vn-gray-light bg-vn-white p-5 text-vn-ink md:p-6';

/**
 * The three specialties of the founder, on a cream section: the h2 is his own title, each card has the icon in ink,
 * the number in mono (decorative: the ordered list already says "1 of 3"), the h3 and the line, closed by a 3px ink
 * rule like the cards of the method. The list keeps role="list" because some screen readers drop the semantics of a
 * list whose markers are hidden.
 */
export function Specialties() {
  const headingId = useId();

  return (
    <Section tone="cream" labelledBy={headingId}>
      <Container>
        <RevealGroup>
          <RevealItem className="max-w-4xl">
            <Heading id={headingId} size="l">
              {founderVoice.specialtiesTitle}
            </Heading>
          </RevealItem>
        </RevealGroup>
        <RevealGroup stagger={CARD_STAGGER_S}>
          <ol role="list" className={LIST_CLASSES}>
            {founderVoice.specialties.map(({ id, title, desc }) => {
              const SpecialtyIcon = ICONS[id];
              return (
                <li key={id} className="flex min-w-0">
                  <RevealItem variant="up" className="flex min-w-0 flex-1">
                    <SpotlightCard as="div" className={CARD_CLASSES}>
                      <div className="flex items-center justify-between gap-4">
                        <SpecialtyIcon aria-hidden="true" className="size-7 shrink-0" />
                        <span aria-hidden="true" className="font-mono text-sm text-vn-gray-dark">
                          {id}
                        </span>
                      </div>
                      <div className="@container mt-8">
                        <Heading as="h3" size="m" className={TITLE_CLASSES}>
                          {title}
                        </Heading>
                      </div>
                      <p className="mt-3 grow text-pretty text-base text-vn-gray-dark">{desc}</p>
                      <span aria-hidden="true" className="mt-6 block h-[3px] bg-vn-ink" />
                    </SpotlightCard>
                  </RevealItem>
                </li>
              );
            })}
          </ol>
        </RevealGroup>
      </Container>
    </Section>
  );
}
