import { useCallback, useRef, useState } from 'react';
import type { Testimonial } from '../../data/testimonials';

interface TestimonialDialogState {
  /** The testimonial the dialog shows. It stays after the dialog closes, so the content survives the exit animation. */
  current: Testimonial | null;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  /** Opens the dialog on a testimonial and remembers the button that was pressed. */
  open: (testimonial: Testimonial, opener: HTMLElement) => void;
  /** For onCloseAutoFocus of the dialog: gives the focus back to the button that opened it. */
  returnFocus: (event: Event) => void;
}

/**
 * What one dialog shared by many buttons needs. The dialog has no Radix trigger (every button would claim to be the
 * trigger, and Radix only remembers the last one), so the focus goes back to the pressed button by hand.
 */
export function useTestimonialDialog(): TestimonialDialogState {
  const [current, setCurrent] = useState<Testimonial | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const openerRef = useRef<HTMLElement | null>(null);

  const open = useCallback((testimonial: Testimonial, opener: HTMLElement) => {
    openerRef.current = opener;
    setCurrent(testimonial);
    setIsOpen(true);
  }, []);

  const returnFocus = useCallback((event: Event) => {
    event.preventDefault();
    openerRef.current?.focus();
  }, []);

  return { current, isOpen, setIsOpen, open, returnFocus };
}
