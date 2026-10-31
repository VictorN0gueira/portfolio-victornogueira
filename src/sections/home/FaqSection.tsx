import { useId } from 'react';
import { Accordion } from '../../components/ui/Accordion';
import { Button } from '../../components/ui/Button';
import { Container } from '../../components/ui/Container';
import { Heading } from '../../components/ui/Heading';
import { Kicker } from '../../components/ui/Kicker';
import { NewTabHint } from '../../components/ui/NewTabHint';
import { RevealGroup, RevealItem } from '../../components/ui/Reveal';
import { Section } from '../../components/ui/Section';
import { faqs } from '../../data/faqs';
import { homeCopy } from '../../data/homeCopy';
import { whatsappUrl } from '../../lib/constants';

// One name for the whole accordion: the browser then keeps a single question open at a time. Unique on the page.
const ACCORDION_NAME = 'faq-home';

interface FaqIntroProps {
  headingId: string;
}

/** The kicker, the h2, the sub line and the WhatsApp button: the left column from lg, the top when stacked. */
function FaqIntro({ headingId }: FaqIntroProps) {
  const { kicker, heading, sub, cta, message } = homeCopy.faq;
  const newTabHintId = useId();

  return (
    <>
      <NewTabHint id={newTabHintId} />
      <Kicker>{kicker}</Kicker>
      <Heading id={headingId} size="l" className="mt-6">
        {heading}
      </Heading>
      <p className="mt-6 max-w-xl text-pretty text-base text-vn-gray-dark md:text-lg">{sub}</p>
      <Button asChild intent="secondary" tone="light" size="lg" className="mt-8">
        <a href={whatsappUrl(message)} target="_blank" rel="noopener noreferrer" aria-describedby={newTabHintId}>
          {cta}
        </a>
      </Button>
    </>
  );
}

/**
 * The frequently asked questions on a white section (it follows the testimonials, which are cream): the title,
 * the sub line and a secondary WhatsApp button on the left from lg, the accordion of data/faqs.ts on the right,
 * and everything stacked below lg. The accordion is native disclosure (see Accordion). One RevealGroup for the
 * one container, with the two columns as its items. A light section: it has no accent.
 */
export function FaqSection() {
  const headingId = useId();

  return (
    <Section tone="white" labelledBy={headingId}>
      <Container>
        <RevealGroup className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <RevealItem className="min-w-0">
            <FaqIntro headingId={headingId} />
          </RevealItem>
          <RevealItem className="min-w-0">
            <Accordion items={faqs} name={ACCORDION_NAME} />
          </RevealItem>
        </RevealGroup>
      </Container>
    </Section>
  );
}

export default FaqSection;
