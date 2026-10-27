import { BrandIcon } from '../../components/ui/BrandIcon';
import { Container } from '../../components/ui/Container';
import { Kicker } from '../../components/ui/Kicker';
import { Marquee } from '../../components/ui/Marquee';
import { Section } from '../../components/ui/Section';
import { integrations } from '../../data/integrations';

const KICKER = 'integrações';
const LINE = 'Conectamos o que você já usa';
const MARQUEE_LABEL = 'Integrações';

// The items never carry ids or state: the Marquee renders them twice. The color changes at once on hover
// (no transition: color is not one of the properties the site animates) and nothing about the box changes.
const ITEM_CLASSES = 'inline-flex items-center gap-3 whitespace-nowrap text-vn-gray-dark hover:text-vn-ink';

// The space between items is the Marquee's --vn-marquee-gap knob: 1.5rem on small screens, so the wrapping rows of the
// no motion layout stay short (15 items), and 2.5rem from sm up.
const MARQUEE_CLASSES = 'mt-8 md:mt-10 [--vn-marquee-gap:1.5rem] sm:[--vn-marquee-gap:2.5rem]';

/**
 * The strip of tools the work connects to. White band with a hairline above and below. The Marquee sits in
 * the Container, a block that gives it a definite width (its frame has no width of its own). Without
 * motion the same items wrap in rows inside the same gutters.
 */
export function IntegrationsMarquee() {
  return (
    <Section tone="white" className="border-y border-vn-gray-light py-[clamp(2.5rem,2rem+3vw,5rem)]">
      <Container>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <Kicker>{KICKER}</Kicker>
          <p className="max-w-xl text-pretty font-display text-[length:clamp(1.25rem,1rem+1.2vw,1.75rem)] font-medium leading-tight tracking-[-0.02em] lg:text-right">
            {LINE}
          </p>
        </div>
        <Marquee ariaLabel={MARQUEE_LABEL} className={MARQUEE_CLASSES}>
          {integrations.map(({ id, label }) => (
            <span key={id} className={ITEM_CLASSES}>
              <BrandIcon id={id} className="size-6 shrink-0" />
              <span className="font-display text-base font-medium min-[480px]:text-lg">{label}</span>
            </span>
          ))}
        </Marquee>
      </Container>
    </Section>
  );
}

export default IntegrationsMarquee;
