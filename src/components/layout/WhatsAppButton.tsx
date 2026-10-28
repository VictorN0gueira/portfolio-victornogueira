import { WHATSAPP_GREETING, whatsappUrl } from '../../lib/constants';
import BrandIcon from '../ui/BrandIcon';

// The offsets are inline because the safe area inset has to be compared with the 16px margin:
// the pt-safe family of utilities replaces the padding instead of taking the larger of the two.
const POSITION = {
  right: 'max(16px, env(safe-area-inset-right))',
  bottom: 'max(16px, env(safe-area-inset-bottom))',
} as const;

/**
 * Floating shortcut to a WhatsApp chat. It sits above the page content (z-40) and below the header,
 * the progress bar and the mobile menu dialog. On mount a single accent ring grows and fades
 * (.vn-pulse-once in tokens.css, one iteration, not drawn under reduced motion). The focus ring is two
 * tones, white inside and ink outside, because the button floats over both light and black sections.
 * It sits in its own complementary landmark, so no content of the page is left outside a landmark.
 */
export function WhatsAppButton() {
  return (
    <aside aria-label="Contato rápido">
      <a
        href={whatsappUrl(WHATSAPP_GREETING)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar no WhatsApp"
        style={POSITION}
        className="fixed z-40 grid size-[52px] place-items-center rounded-full border border-vn-gray-dark bg-vn-black text-vn-white shadow-lg transition-transform duration-150 ease-out hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-transparent focus-visible:shadow-[0_0_0_2px_var(--color-vn-white),0_0_0_4px_var(--color-vn-ink)]"
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

export default WhatsAppButton;
