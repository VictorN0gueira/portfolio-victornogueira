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
// The title is sized from the width of its own card (cqi, the @container wrapper around it), at most 1.75rem. The longest
// word, "Desenvolvimento", is about 7.7em wide, so 11cqi keeps it whole. The 1.125rem floor only wins in a card narrower
// than about 164px, which the layout never makes: the cards stack in one column below lg and share three columns from lg
// (at least 248px of text per card), where 11cqi is above the floor even with the font at 120%. The e2e of /sobre checks
// the widths where the layout changes. It replaces the font size of the size m heading.
const TITLE_CLASSES = 'text-[length:clamp(1.125rem,11cqi,1.75rem)]';
// The h2 is sized like the size l heading but also capped by its own column: "Especialidades" is 14 letters, about 7.6em
// wide, so 100cqi over 8.4 keeps it whole at 280px with the large font (the 1.875rem floor of size l made it 36px there).
const SECTION_TITLE_CLASSES = 'text-[length:min(clamp(1.875rem,1rem+4vw,4rem),calc(100cqi/8.4))]';
const LIST_CLASSES = 'mt-10 grid grid-cols-1 gap-4 md:mt-14 lg:grid-cols-3 lg:gap-5';
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
          <RevealItem className="@container max-w-4xl">
            <Heading id={headingId} size="l" className={SECTION_TITLE_CLASSES}>
              {founderVoice.specialtiesTitle}
            </Heading>
          </RevealItem>
        </RevealGroup>
        <RevealGroup stagger={CARD_STAGGER_S}>
          {/* role="list" on <ol>: Tailwind preflight removes list-style, and Safari then drops ordered-list semantics.
              role="list" restores the list role but overrides the implicit ordered-list role: intentional here since
              ordinal position is conveyed by the visible badge below, which is not aria-hidden. */}
          <ol role="list" className={LIST_CLASSES}>
            {founderVoice.specialties.map(({ id, title, desc }) => {
              const SpecialtyIcon = ICONS[id];
              return (
                <li key={id} className="flex min-w-0">
                  <RevealItem variant="up" className="flex min-w-0 flex-1">
                    <SpotlightCard as="div" className={CARD_CLASSES}>
                      <div className="flex items-center justify-between gap-4">
                        <SpecialtyIcon aria-hidden="true" className="size-7 shrink-0" />
                        <span className="font-mono text-sm text-vn-gray-dark">
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
