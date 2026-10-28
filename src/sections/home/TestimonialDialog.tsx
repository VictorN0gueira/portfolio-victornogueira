import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { homeCopy } from '../../data/homeCopy';
import type { Testimonial } from '../../data/testimonials';
import { useMotionAllowed } from '../../hooks/useMotionAllowed';
import { cn } from '../../lib/utils';
import { LogoImage } from './LogoImage';
import { describeAuthor } from './TestimonialCard';

// The panel keeps at least 1rem from every edge of the screen and more where the safe area needs it (a notch, the home
// indicator, a notch on the side of a phone held sideways). Inline because each side compares the inset with a minimum.
// With the insets set, auto margins center the panel and its height is the one of its content. The inline max-height
// is the 90dvh of the max-h class, also held between the top and the bottom inset: without it a tall panel on a phone
// with a big notch would be over-constrained and the auto margins would go negative, pushing it under the notch.
const PANEL_INSETS = {
  top: 'max(1rem, env(safe-area-inset-top))',
  right: 'max(1rem, env(safe-area-inset-right))',
  bottom: 'max(1rem, env(safe-area-inset-bottom))',
  left: 'max(1rem, env(safe-area-inset-left))',
  maxHeight:
    'min(90dvh, calc(100dvh - max(1rem, env(safe-area-inset-top)) - max(1rem, env(safe-area-inset-bottom))))',
} as const;

const OVERLAY_CLASSES = 'fixed inset-0 z-[160] bg-vn-black/70';
const PANEL_CLASSES =
  'fixed z-[170] m-auto h-fit max-h-[90dvh] max-w-2xl overflow-y-auto overscroll-contain rounded-[clamp(20px,3vw,28px)] border border-vn-gray-light bg-vn-white text-vn-ink outline-none';
const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vn-ink';
const LOGO_SIZE = 64;

interface TestimonialDialogProps {
  /** What the dialog shows. It is kept after the dialog closes, so the content does not vanish during the exit animation. */
  testimonial: Testimonial | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** Runs when the dialog is done closing. The owner puts the focus back on the button that opened it. */
  onCloseAutoFocus: (event: Event) => void;
}

function CloseButton() {
  return (
    // A row with no height that sticks to the top of the scrolling panel: the button stays reachable over a long text.
    <div className="sticky top-0 z-10 flex h-0 justify-end">
      <Dialog.Close asChild>
        <button
          type="button"
          aria-label={homeCopy.testimonials.close}
          className={`mr-3 mt-3 grid size-11 shrink-0 place-items-center rounded-full border border-vn-gray-light bg-vn-white text-vn-ink hover:border-vn-ink ${FOCUS_RING}`}
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </Dialog.Close>
    </div>
  );
}

function DialogBody({ testimonial }: { testimonial: Testimonial }) {
  const { name, logo, logoFit, company, text } = testimonial;

  return (
    <div className="p-5 pt-6 md:p-8">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4 sm:pr-12">
        <div className={cn('size-16 shrink-0 overflow-hidden rounded-2xl border border-vn-gray-light bg-vn-white', logoFit !== 'cover' && 'p-2')}>
          <LogoImage src={logo} name={company} isDecorative fit={logoFit} width={LOGO_SIZE} height={LOGO_SIZE} className="size-full" />
        </div>
        <div className="min-w-0">
          {/* The name of the dialog is plain text (a p, not an h2), so the page outline gains no heading. */}
          <Dialog.Title asChild>
            <p className="sr-only">{homeCopy.testimonials.dialogTitle(name)}</p>
          </Dialog.Title>
          <p className="break-words text-lg font-medium leading-snug">{name}</p>
          <p className="mt-1 break-words text-sm text-vn-gray-dark">{describeAuthor(testimonial)}</p>
        </div>
      </div>
      <Dialog.Description asChild>
        <blockquote className="mt-6 text-pretty break-words border-l-[3px] border-vn-ink pl-4 text-base leading-relaxed md:text-lg">
          {text}
        </blockquote>
      </Dialog.Description>
    </div>
  );
}

/**
 * The full text of one testimonial in a modal Radix dialog: it traps the focus, closes on Escape, on the Fechar button
 * and on a click on the overlay, and marks the rest of the page inert. There is one dialog for the whole section and
 * the owner decides what it shows. The panel scrolls on its own (max 90dvh) and its animation, which only moves
 * opacity and transform, is left out when motion is not allowed.
 */
export function TestimonialDialog({ testimonial, isOpen, onOpenChange, onCloseAutoFocus }: TestimonialDialogProps) {
  const isMotionAllowed = useMotionAllowed();

  if (!testimonial) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={cn(OVERLAY_CLASSES, isMotionAllowed && 'vn-dialog-overlay')} />
        <Dialog.Content
          style={PANEL_INSETS}
          onCloseAutoFocus={onCloseAutoFocus}
          className={cn(PANEL_CLASSES, isMotionAllowed && 'vn-dialog-panel')}
        >
          <CloseButton />
          <DialogBody testimonial={testimonial} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default TestimonialDialog;
