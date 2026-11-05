import { useId } from 'react';
import { ContactForm } from '../../components/ContactForm';
import { Container } from '../../components/ui/Container';
import { Heading } from '../../components/ui/Heading';
import { Kicker } from '../../components/ui/Kicker';
import { RevealGroup, RevealItem } from '../../components/ui/Reveal';
import { ScanGrid } from '../../components/ui/ScanGrid';
import { Section } from '../../components/ui/Section';
import { homeCopy } from '../../data/homeCopy';

/** The id the links to /contato#contato and the quote of the simulator point at. */
const SECTION_ID = 'contato';

// The heading is the size l of the brief, capped by the width of its own column: the longest word, "automatiza", is about
// 5.2em wide, so 100cqi over 5.5 keeps it whole in the narrow column of lg and at the larger font of the accessibility
// option. The leading comes with it: a later font size class makes tailwind-merge drop an earlier leading class.
const HEADING_FIT_CLASSES = 'text-[length:min(clamp(1.875rem,1rem+4vw,4rem),calc(100cqi/5.5))] leading-[.98]';

interface ContactFormSectionProps {
  /** A message to fill the form with, for example the quote the ROI simulator builds. A new message replaces the field. */
  prefillMessage?: string;
  /** Bumped by the parent for each request, so the same message fills the field again after the visitor edited it. */
  prefillNonce?: number;
}

/**
 * The form of /contato, id contato: a cream section with the title (the call to action of the home) and, in a black
 * rounded panel with the dark scan grid, the one contact form (it only has a dark surface, see contactStyles). The
 * form is the same component the home uses, with its prefill. The panel and the section carry no accent. Two columns
 * from lg, stacked below it. One RevealGroup for the one container.
 */
export function ContactFormSection({ prefillMessage, prefillNonce }: ContactFormSectionProps) {
  const headingId = useId();
  const { kicker, heading } = homeCopy.finalCta;

  return (
    <Section id={SECTION_ID} tone="cream" labelledBy={headingId}>
      <Container>
        <RevealGroup className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:items-start lg:gap-16">
          <RevealItem className="@container min-w-0">
            <Kicker>{kicker}</Kicker>
            <Heading id={headingId} size="l" className={`mt-6 ${HEADING_FIT_CLASSES}`}>
              {heading}
            </Heading>
          </RevealItem>
          <RevealItem className="min-w-0">
            <div
              data-contact-panel=""
              className="relative isolate overflow-hidden rounded-shell bg-vn-black p-3 text-vn-white xs:p-4 md:p-8"
            >
              <ScanGrid tone="dark" />
              <ContactForm initialMessage={prefillMessage} prefillNonce={prefillNonce} />
            </div>
          </RevealItem>
        </RevealGroup>
      </Container>
    </Section>
  );
}
