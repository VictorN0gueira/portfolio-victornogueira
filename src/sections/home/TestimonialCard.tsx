import { memo, useId } from 'react';
import { Button } from '../../components/ui/Button';
import { homeCopy } from '../../data/homeCopy';
import type { Testimonial } from '../../data/testimonials';
import { describeAuthor } from './describeAuthor';
import { excerptOf } from './excerpt';
import { LogoPlate } from './LogoImage';

const CARD_CLASSES =
  'vn-logo-host flex min-w-0 flex-1 flex-col rounded-card border border-vn-gray-light bg-vn-white p-5 text-vn-ink md:p-6';

interface TestimonialCardProps {
  testimonial: Testimonial;
  /** Called with the testimonial and the button that was pressed, which gets the focus back when the dialog closes. */
  onOpen: (testimonial: Testimonial, opener: HTMLElement) => void;
}

/**
 * One testimonial: the company logo on its plate (decorative, the name is written below it), the excerpt in a blockquote, the author
 * and the button that opens the full text. The article is named by the author, and the button says whose testimonial it
 * opens, because six buttons with the same name would be ambiguous to a screen reader. The card is the host of the logo
 * tone: the logo is gray until the card is hovered or has the focus (colored from the start on touch).
 */
function TestimonialCardView({ testimonial, onOpen }: TestimonialCardProps) {
  const nameId = useId();
  const { name, company, logo, text } = testimonial;
  const { readFull, readFullFor } = homeCopy.testimonials;

  return (
    <article aria-labelledby={nameId} className={CARD_CLASSES}>
      <LogoPlate src={logo} name={company} isToned />
      <blockquote className="mt-5 text-pretty break-words text-base leading-relaxed">{excerptOf(text)}</blockquote>
      {/* The author and the button sit at the bottom of the card, so the author rows of a row of cards line up. */}
      <div data-card-footer="" className="mt-auto flex flex-col items-start pt-5">
        <div className="min-w-0 self-stretch border-t border-vn-gray-light pt-4">
          <p id={nameId} className="break-words text-base font-medium leading-snug">
            {name}
          </p>
          <p className="mt-1 break-words text-sm text-vn-gray-dark">{describeAuthor(testimonial)}</p>
        </div>
        <Button
          intent="secondary"
          aria-label={readFullFor(name)}
          aria-haspopup="dialog"
          className="mt-5"
          onClick={(event) => onOpen(testimonial, event.currentTarget)}
        >
          {readFull}
        </Button>
      </div>
    </article>
  );
}

/**
 * Memoized: opening or closing the dialog re-renders the section, and the six cards (and their logos) have not changed.
 * `onOpen` is stable (useTestimonialDialog), and the testimonials are module constants.
 */
export const TestimonialCard = memo(TestimonialCardView);
