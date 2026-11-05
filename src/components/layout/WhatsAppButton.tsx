import { useId } from 'react';
import { WHATSAPP_GREETING, whatsappUrl } from '../../lib/constants';
import { FLOAT_MARGIN_PX } from '../../lib/floatingLayout';
import { BrandIcon } from '../ui/BrandIcon';
import { NewTabHint } from '../ui/NewTabHint';

// The offsets are inline because the safe area inset has to be compared with the 16px margin:
// the pt-safe family of utilities replaces the padding instead of taking the larger of the two.
// The margin is FLOAT_MARGIN_PX, shared with the accessibility tab, which stacks above this button when it is on the
// left (src/lib/floatingLayout.ts); the 52px of size-[52px] is WHATSAPP_SIZE_PX there.
// The button sits in the bottom left corner, opposite the accessibility tab on the right edge. A modal removes the page
// scrollbar on the right, so nothing anchored on the left needs the scroll lock compensation the right edge needs.
const POSITION = {
  left: `max(${FLOAT_MARGIN_PX}px, env(safe-area-inset-left))`,
  bottom: `max(${FLOAT_MARGIN_PX}px, env(safe-area-inset-bottom))`,
} as const;

/**
 * Floating shortcut to a WhatsApp chat. It sits above the page content (--vn-z-float) and below the header,
 * the progress bar and the mobile menu dialog. On mount a single accent ring grows and fades
 * (.vn-pulse-once in tokens.css, one iteration, not drawn under reduced motion). The focus ring is two
 * tones, white inside and ink outside, because the button floats over both light and black sections.
 * It sits in its own complementary landmark, so no content of the page is left outside a landmark.
 */
export function WhatsAppButton() {
  const newTabHintId = useId();

  return (
    <aside aria-label="Contato rápido">
      <NewTabHint id={newTabHintId} />
      <a
        href={whatsappUrl(WHATSAPP_GREETING)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar no WhatsApp"
        aria-describedby={newTabHintId}
        style={POSITION}
        className="fixed z-(--vn-z-float) grid size-[52px] place-items-center rounded-full border border-vn-gray-dark bg-vn-black text-vn-white shadow-lg transition-transform duration-150 ease-out hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-transparent focus-visible:shadow-[0_0_0_2px_var(--color-vn-white),0_0_0_4px_var(--color-vn-ink)]"
      >
        <span
          aria-hidden="true"
          className="vn-pulse-once pointer-events-none absolute -inset-px rounded-full border-2 border-vn-accent"
        />
        <BrandIcon id="whatsapp" className="relative size-6" />
      </a>
    </aside>
  );
}
