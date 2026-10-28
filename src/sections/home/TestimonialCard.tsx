import { useId } from 'react';
import { Button } from '../../components/ui/Button';
import { homeCopy } from '../../data/homeCopy';
import type { Testimonial } from '../../data/testimonials';
import { cn } from '../../lib/utils';
import { excerptOf } from './excerpt';
import { LogoImage } from './LogoImage';

const LOGO_SIZE = 56;
const CARD_CLASSES =
  'vn-logo-host flex min-w-0 flex-1 flex-col rounded-[clamp(20px,3vw,28px)] border border-vn-gray-light bg-vn-white p-5 text-vn-ink md:p-6';
const LOGO_BOX_CLASSES = 'size-14 shrink-0 overflow-hidden rounded-2xl border border-vn-gray-light bg-vn-white';

interface TestimonialCardProps {
  testimonial: Testimonial;
  /** Called with the testimonial and the button that was pressed, which gets the focus back when the dialog closes. */
  onOpen: (testimonial: Testimonial, opener: HTMLElement) => void;
}

/** What the author does and where: the role, then the company unless it is only the author's own name again. */
export function describeAuthor({ name, role, company }: Pick<Testimonial, 'name' | 'role' | 'company'>): string {
  return company === name ? role : `${role}, ${company}`;
}

/**
 * One testimonial: the company logo (decorative, the name is written below it), the excerpt in a blockquote, the author
 * and the button that opens the full text. The article is named by the author, and the button says whose testimonial it
 * opens, because six buttons with the same name would be ambiguous to a screen reader. The card is the host of the logo
 * tone: the logo is gray until the card is hovered or has the focus (colored from the start on touch).
 */
export function TestimonialCard({ testimonial, onOpen }: TestimonialCardProps) {
  const nameId = useId();
  const { name, logo, logoFit, text } = testimonial;
  const { readFull, readFullFor } = homeCopy.testimonials;

  return (
    <article aria-labelledby={nameId} className={CARD_CLASSES}>
      <div className={cn(LOGO_BOX_CLASSES, logoFit !== 'cover' && 'p-2')}>
        <LogoImage
          src={logo}
          name={testimonial.company}
          isDecorative
          fit={logoFit}
          width={LOGO_SIZE}
          height={LOGO_SIZE}
          className="size-full vn-logo-tone"
        />
      </div>
      <blockquote className="mt-5 grow text-pretty break-words text-base leading-relaxed">{excerptOf(text)}</blockquote>
      <div className="mt-5 min-w-0 border-t border-vn-gray-light pt-4">
        <p id={nameId} className="break-words text-base font-medium leading-snug">
          {name}
        </p>
        <p className="mt-1 break-words text-sm text-vn-gray-dark">{describeAuthor(testimonial)}</p>
      </div>
      <Button
        intent="secondary"
        aria-label={readFullFor(name)}
        aria-haspopup="dialog"
        className="mt-5 self-start"
        onClick={(event) => onOpen(testimonial, event.currentTarget)}
      >
        {readFull}
      </Button>
    </article>
  );
}

export default TestimonialCard;
