import { useId } from 'react';
import { Container } from '../../components/ui/Container';
import { Heading } from '../../components/ui/Heading';
import { Kicker } from '../../components/ui/Kicker';
import { RevealGroup, RevealItem } from '../../components/ui/Reveal';
import { Section } from '../../components/ui/Section';
import { homeCopy } from '../../data/homeCopy';
import { testimonials } from '../../data/testimonials';
import { cn } from '../../lib/utils';
import { ClientGrid } from './ClientGrid';
import { TestimonialCard } from './TestimonialCard';
import { TestimonialDialog } from './TestimonialDialog';
import { useTestimonialDialog } from './useTestimonialDialog';

const DEFAULT_ID = 'clientes';
// The time between one card and the next, in seconds.
const CARD_STAGGER_S = 0.1;

// A column below md, two from md and three from lg.
const GRID_CLASSES = 'grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3';
// From lg the cards of the middle column sit 4rem lower (the 2nd and the 5th of six). Below lg they line up. The
// cards stretch to the bottom of their row, so the staggered part is the tops.
const LG_COLUMNS = 3;
const LOWERED_COLUMN = 1;

interface TestimonialsProps {
  /** The id of the section, which the link to /#clientes points at. */
  id?: string;
}

/**
 * The testimonials of the home on a cream section: a kicker and the h2, six cards with an excerpt each, and the grid of
 * client logos at the end. The full text opens in one dialog (useTestimonialDialog holds which testimonial it shows and
 * which button to give the focus back to). There is no autoplay and no rating. The header, the cards and the client grid are
 * three RevealGroups (one observer each).
 */
export function Testimonials({ id = DEFAULT_ID }: TestimonialsProps) {
  const headingId = useId();
  const { kicker, heading } = homeCopy.testimonials;
  const dialog = useTestimonialDialog();

  return (
    <Section id={id} tone="cream" labelledBy={headingId}>
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
        </RevealGroup>
        <RevealGroup stagger={CARD_STAGGER_S} className="mt-10 md:mt-14">
          <div className={GRID_CLASSES}>
            {testimonials.map((testimonial, position) => (
              <RevealItem
                key={testimonial.id}
                className={cn('flex min-w-0', position % LG_COLUMNS === LOWERED_COLUMN && 'lg:mt-16')}
              >
                <TestimonialCard testimonial={testimonial} onOpen={dialog.open} />
              </RevealItem>
            ))}
          </div>
        </RevealGroup>
        <div className="mt-16 md:mt-24">
          <ClientGrid />
        </div>
      </Container>
      <TestimonialDialog
        testimonial={dialog.current}
        isOpen={dialog.isOpen}
        onOpenChange={dialog.setIsOpen}
        onCloseAutoFocus={dialog.returnFocus}
      />
    </Section>
  );
}

export default Testimonials;
