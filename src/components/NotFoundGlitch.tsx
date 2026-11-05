const NUMBER = '404';
// One size for the three layers, so they sit exactly on each other: from a 280px phone to a 2560px monitor.
const NUMBER_CLASSES = 'font-display font-bold leading-none text-[length:clamp(5rem,min(1rem+30vw,32dvh),16rem)]';

/**
 * The 404 as a decoration (aria-hidden: the h1 says it). The base is chrome text. Two copies, one white and one mid gray,
 * sit on top of it and flick through a few bands of the number for a moment (`.vn-glitch-a` and `.vn-glitch-b` in
 * motion.css, transform and clip-path only). With reduced motion or "Pausar animações" they stay clipped, so the
 * number is the still chrome one.
 */
export function NotFoundGlitch() {
  return (
    <div aria-hidden="true" className={`relative select-none ${NUMBER_CLASSES}`}>
      <span className="vn-chrome-text block">{NUMBER}</span>
      <span className="vn-glitch-a absolute inset-0 text-vn-white">{NUMBER}</span>
      <span className="vn-glitch-b absolute inset-0 text-vn-gray-mid">{NUMBER}</span>
    </div>
  );
}
