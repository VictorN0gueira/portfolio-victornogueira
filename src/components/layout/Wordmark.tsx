import { m, useInView } from 'motion/react';
import { useRef } from 'react';
import { useMotionAllowed } from '../../hooks/useMotionAllowed';
import { Container } from '../ui/Container';
import { EASE_OUT } from '../../lib/motion';

const WORDMARK_HIDDEN = 'inset(100% 0% 0% 0%)';
const WORDMARK_SHOWN = 'inset(0% 0% 0% 0%)';
const WORDMARK_REVEAL = { duration: 0.9, ease: EASE_OUT } as const;
const WORDMARK_INSTANT = { duration: 0 } as const;
const WORDMARK_IN_VIEW = { once: true, amount: 0.4 } as const;

// The text is about 2.99em wide, so 33cqw always fits the box. The clamp is the design size (22vw, 72px to 320px);
// the cap only bites when the root font is enlarged (a11y-font-large) or the gutters do not scale with the screen.
const WORDMARK_FONT_SIZE = 'min(clamp(4.5rem, 22vw, 20rem), 33cqw)';

/**
 * The giant "vn one" in chrome that unveils once when it scrolls into view. It is decoration: the logo link above it
 * already names the brand, so it is hidden from assistive tech and has no text twin.
 * The observer sits on the wrapper: the wordmark itself starts fully clipped. The wrapper is also an inline-size
 * container, so the wordmark caps its size by the width it really has (33cqw of the content box). Below sm the wrapper
 * keeps 2rem free on each side: with the gutter that is at least 3rem, which clears the accessibility tab fixed to
 * the right edge, and the cap shrinks to match.
 */
export function Wordmark() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(wrapperRef, WORDMARK_IN_VIEW);
  const isMotionAllowed = useMotionAllowed();
  const isShown = isInView || !isMotionAllowed;

  return (
    <Container className="mt-12 md:mt-16">
      <div ref={wrapperRef} className="[container-type:inline-size] max-sm:px-8">
        <m.p
          data-footer-wordmark=""
          aria-hidden="true"
          className="vn-chrome-text overflow-clip whitespace-nowrap pb-[0.04em] text-center font-display font-bold leading-[0.85] tracking-[-0.04em]"
          style={{ fontSize: WORDMARK_FONT_SIZE }}
          initial={isMotionAllowed ? { clipPath: WORDMARK_HIDDEN } : false}
          animate={{ clipPath: isShown ? WORDMARK_SHOWN : WORDMARK_HIDDEN }}
          transition={isMotionAllowed ? WORDMARK_REVEAL : WORDMARK_INSTANT}
        >
          vn one
        </m.p>
      </div>
    </Container>
  );
}
