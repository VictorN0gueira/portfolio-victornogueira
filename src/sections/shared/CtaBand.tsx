import { useId } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Container } from '../../components/ui/Container';
import { Cursor } from '../../components/ui/Cursor';
import { Heading } from '../../components/ui/Heading';
import { NewTabHint } from '../../components/ui/NewTabHint';
import { RevealGroup } from '../../components/ui/Reveal';
import { ScanGrid } from '../../components/ui/ScanGrid';
import { Section } from '../../components/ui/Section';
import { whatsappUrl } from '../../lib/constants';
import { splitLastWord } from './splitLastWord';

const WHATSAPP_LABEL = 'Falar no WhatsApp';

// The heading is the large size of the brief, capped by the width of its own column (the same technique as the
// FinalCta of the home): the longest word of the headings is about 10 letters, 5.2em wide, so 100cqi over 5.5 keeps
// it whole at 280px and at the larger font of the accessibility option. The leading comes with it: a later font
// size class makes tailwind-merge drop an earlier leading class.
const HEADING_FIT_CLASSES = 'text-[length:min(clamp(2.25rem,1rem+6vw,6rem),calc(100cqi/5.5))] leading-[.95]';

interface CtaBandProps {
  /** The h2. The last word carries the cursor in the accent. */
  heading: string;
  body: string;
  /** The primary button, a router link. */
  cta: { label: string; to: string };
  /** When given, a secondary WhatsApp button opens a chat with this text, in a new tab. */
  whatsappMessage?: string;
  id?: string;
}

/**
 * The closing band of an inner page: black, with the dark scan grid, a large question ending in the block cursor (the
 * one accent of the band), the body and the buttons. The scan line sweeps only the margins beside the content.
 */
export function CtaBand({ heading, body, cta, whatsappMessage, id }: CtaBandProps) {
  const headingId = useId();
  const newTabHintId = useId();
  const { head, last } = splitLastWord(heading);

  return (
    <Section id={id} tone="black" labelledBy={headingId}>
      <ScanGrid tone="dark" keepContentClear />
      <Container>
        <RevealGroup className="@container max-w-4xl">
          <Heading id={headingId} size="xl" className={HEADING_FIT_CLASSES}>
            {head}
            {/* The last word and the cursor never part: the block cannot wrap onto a line of its own. */}
            <span className="whitespace-nowrap">
              {last}
              <Cursor tone="accent" className="ml-[0.2em]" />
            </span>
          </Heading>
          <p className="mt-6 max-w-xl text-pretty text-base text-vn-gray-light md:text-lg">{body}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild tone="dark" size="lg">
              <Link to={cta.to}>{cta.label}</Link>
            </Button>
            {whatsappMessage && (
              <>
                <NewTabHint id={newTabHintId} />
                <Button asChild intent="secondary" tone="dark" size="lg">
                  <a
                    href={whatsappUrl(whatsappMessage)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-describedby={newTabHintId}
                  >
                    {WHATSAPP_LABEL}
                  </a>
                </Button>
              </>
            )}
          </div>
        </RevealGroup>
      </Container>
    </Section>
  );
}
