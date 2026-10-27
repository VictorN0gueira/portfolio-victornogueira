import { motion, useScroll, useSpring } from 'motion/react';
import { useMotionAllowed } from '../../hooks/useMotionAllowed';

const SPRING = { stiffness: 100, damping: 30, restDelta: 0.001 } as const;

export type ScrollProgressTone = 'light' | 'dark';

// ink on the light site, white on a dark page (the blog), both palette colors.
const TONE_CLASSES: Record<ScrollProgressTone, string> = {
  light: 'bg-vn-ink',
  dark: 'bg-white/80',
};

interface ScrollProgressProps {
  /** The tone of the page behind the bar: `light` pages get an ink bar, `dark` pages a white one. */
  tone?: ScrollProgressTone;
}

/**
 * A 2px bar across the top of the page that fills as the visitor scrolls. The spring smooths it only
 * when motion is welcome, otherwise the bar follows the scroll position exactly.
 */
export function ScrollProgress({ tone = 'light' }: ScrollProgressProps) {
  const isMotionAllowed = useMotionAllowed();
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, SPRING);

  return (
    <motion.div
      aria-hidden="true"
      className={`fixed inset-x-0 top-0 z-[60] h-0.5 origin-left ${TONE_CLASSES[tone]}`}
      style={{ scaleX: isMotionAllowed ? smoothProgress : scrollYProgress }}
    />
  );
}

export default ScrollProgress;
