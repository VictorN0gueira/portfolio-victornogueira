import { useId, useState } from 'react';
import { BrandIcon } from '../../components/ui/BrandIcon';
import { Container } from '../../components/ui/Container';
import { Heading } from '../../components/ui/Heading';
import { Kicker } from '../../components/ui/Kicker';
import { Marquee } from '../../components/ui/Marquee';
import { PauseToggle } from '../../components/ui/PauseToggle';
import { Section } from '../../components/ui/Section';
import { integrations } from '../../data/integrations';
import { useMotionAllowed } from '../../hooks/useMotionAllowed';

const KICKER = 'integrações';
const LINE = 'A gente conecta o que você já usa';
const MARQUEE_LABEL = 'Integrações';
// The constant name of the pause button (WCAG 2.2.2): aria-pressed carries the state, the name never changes.
const PAUSE_LABEL = 'Pausar faixa de integrações';

// The items never carry ids or state: the Marquee renders them twice. They are list items in full ink and nothing about
// them reacts to the pointer: they are not links, so a hover color would suggest a click that does nothing.
const ITEM_CLASSES = 'inline-flex items-center gap-3 whitespace-nowrap text-vn-ink';

// The space between items is the Marquee's --vn-marquee-gap knob: 1.5rem on small screens, so the wrapping rows of the
// no motion layout stay short (15 items), and 2.5rem from sm up.
const MARQUEE_CLASSES = 'mt-8 md:mt-10 [--vn-marquee-gap:1.5rem] sm:[--vn-marquee-gap:2.5rem]';

/**
 * The strip of tools the work connects to. White band with a hairline above and below, named by its h2. The kicker and
 * the pause button share the first line (the button is a real control: the loop never stops by itself and a hover is
 * no way to stop it on a keyboard or a touch screen), the heading sits left aligned under them. The Marquee sits in
 * the Container, a block that gives it a definite width (its frame has no width of its own). Without motion the same
 * items wrap in rows inside the same gutters and there is no pause button, since nothing moves.
 */
export function IntegrationsMarquee() {
  const headingId = useId();
  const isMotionAllowed = useMotionAllowed();
  const [isPaused, setIsPaused] = useState(false);

  return (
    <Section tone="white" labelledBy={headingId} className="border-y border-vn-gray-light py-[clamp(2.5rem,2rem+3vw,5rem)]">
      <Container>
        <div className="flex items-center justify-between gap-4">
          <Kicker>{KICKER}</Kicker>
          {isMotionAllowed ? (
            <PauseToggle
              isPaused={isPaused}
              label={PAUSE_LABEL}
              onToggle={() => setIsPaused((current) => !current)}
              tone="light"
              className="-my-2 -mr-1"
            />
          ) : null}
        </div>
        <Heading id={headingId} size="m" className="mt-4 max-w-xl text-[length:clamp(1.75rem,1.2rem+2vw,2.5rem)] leading-[.98]">
          {LINE}
        </Heading>
        <Marquee ariaLabel={MARQUEE_LABEL} className={MARQUEE_CLASSES} isPaused={isPaused} groupAs="ul">
          {integrations.map(({ id, label }) => (
            <li key={id} className={ITEM_CLASSES}>
              <BrandIcon id={id} className="size-6 shrink-0" />
              <span className="font-display text-base font-medium min-[480px]:text-lg">{label}</span>
            </li>
          ))}
        </Marquee>
      </Container>
    </Section>
  );
}

export default IntegrationsMarquee;
