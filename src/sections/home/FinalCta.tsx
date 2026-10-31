import { useId } from 'react';
import { ContactForm } from '../../components/ContactForm';
import { Button } from '../../components/ui/Button';
import { Container } from '../../components/ui/Container';
import { Cursor } from '../../components/ui/Cursor';
import { Heading } from '../../components/ui/Heading';
import { Kicker } from '../../components/ui/Kicker';
import { NewTabHint } from '../../components/ui/NewTabHint';
import { RevealGroup, RevealItem } from '../../components/ui/Reveal';
import { ScanGrid } from '../../components/ui/ScanGrid';
import { Section } from '../../components/ui/Section';
import { homeCopy } from '../../data/homeCopy';
import { whatsappUrl } from '../../lib/constants';
import { cn } from '../../lib/utils';

/** The id the links to /#contato point at. */
const SECTION_ID = 'contato';

// The heading is the large size of the brief, capped by the width of its own column: the longest word, "automatiza",
// is about 5.2em wide, so 100cqi over 5.5 keeps it whole (a word that is wider than the column would be broken
// mid-word) in the half column of lg and at the larger font of the accessibility option, where 6rem is 115px.
// The leading comes with it: a later font size class makes tailwind-merge drop an earlier leading class.
const HEADING_FIT_CLASSES = 'text-[length:min(clamp(2.25rem,1rem+6vw,6rem),calc(100cqi/5.5))] leading-[.95]';

interface FinalCtaIntroProps {
  headingId: string;
}

/** The kicker, the large heading with its cursor, the body and the WhatsApp button. */
function FinalCtaIntro({ headingId }: FinalCtaIntroProps) {
  const { kicker, heading, body, cta, message } = homeCopy.finalCta;
  const newTabHintId = useId();
  // The last word and the cursor never part: the block cannot wrap onto a line of its own.
  const lastWordStart = heading.lastIndexOf(' ') + 1;
  const headingStart = heading.slice(0, lastWordStart);
  const lastWord = heading.slice(lastWordStart);

  return (
    <>
      <NewTabHint id={newTabHintId} />
      <Kicker tone="dark">{kicker}</Kicker>
      <Heading id={headingId} size="xl" className={cn('mt-6', HEADING_FIT_CLASSES)}>
        {headingStart}
        <span className="whitespace-nowrap">
          {lastWord}
          <Cursor tone="accent" className="ml-[0.2em]" />
        </span>
      </Heading>
      <p className="mt-6 max-w-xl text-pretty text-base text-vn-gray-light md:text-lg">{body}</p>
      <Button asChild intent="secondary" tone="dark" size="lg" className="mt-8">
        <a href={whatsappUrl(message)} target="_blank" rel="noopener noreferrer" aria-describedby={newTabHintId}>
          {cta}
        </a>
      </Button>
    </>
  );
}

interface FinalCtaProps {
  /** A message to fill the form with, for example the quote the ROI simulator builds. A new message replaces the field. */
  prefillMessage?: string;
  /** Bumped by the parent for each request, so the same message fills the field again after the visitor edited it. */
  prefillNonce?: number;
}

/**
 * The closing call to action of the home, id contato: a black section with the dark scan grid, a large question
 * ending in the block cursor (the one accent of the section; the form adds none), the WhatsApp button and the
 * contact form. The scan line of the grid sweeps only the margins beside the content, never the heading or the form.
 * Two columns from lg, stacked below it with the form at full width. One RevealGroup for the one
 * container.
 */
export function FinalCta({ prefillMessage, prefillNonce }: FinalCtaProps) {
  const headingId = useId();

  return (
    <Section id={SECTION_ID} tone="black" labelledBy={headingId}>
      <ScanGrid tone="dark" keepContentClear />
      <Container>
        <RevealGroup className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-start lg:gap-16">
          <RevealItem className="@container min-w-0">
            <FinalCtaIntro headingId={headingId} />
          </RevealItem>
          <RevealItem className="min-w-0">
            <ContactForm initialMessage={prefillMessage} prefillNonce={prefillNonce} />
          </RevealItem>
        </RevealGroup>
      </Container>
    </Section>
  );
}

export default FinalCta;
