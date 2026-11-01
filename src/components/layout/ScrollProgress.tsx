import { m, useScroll, useSpring } from 'motion/react';
import { useMotionAllowed } from '../../hooks/useMotionAllowed';
import { KEEPS_PLACE_UNDER_SCROLL_LOCK } from '../../lib/scrollLock';

const SPRING = { stiffness: 100, damping: 30, restDelta: 0.001 } as const;

type ScrollProgressTone = 'light' | 'dark';

// ink on the light site, white on a dark page (the blog), both palette colors.
const TONE_CLASSES: Record<ScrollProgressTone, string> = {
  light: 'bg-vn-ink',
  dark: 'bg-white/80',
};

interface ScrollProgressProps {
  /** The tone of the page behind the bar: `light` pages get an ink bar, `dark` pages a white one. */
  tone?: ScrollProgressTone;
}

interface BarProps {
  tone: ScrollProgressTone;
}

const BAR_CLASSES = `${KEEPS_PLACE_UNDER_SCROLL_LOCK} fixed inset-x-0 top-0 z-(--vn-z-progress) h-0.5 origin-left`;

/** The bar follows the scroll position exactly. */
function PlainBar({ tone }: BarProps) {
  const { scrollYProgress } = useScroll();

  return <m.div aria-hidden="true" className={`${BAR_CLASSES} ${TONE_CLASSES[tone]}`} style={{ scaleX: scrollYProgress }} />;
}

/** The bar follows the scroll through a spring that smooths it. The spring exists only here, where motion is welcome. */
function SmoothBar({ tone }: BarProps) {
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, SPRING);

  return <m.div aria-hidden="true" className={`${BAR_CLASSES} ${TONE_CLASSES[tone]}`} style={{ scaleX: smoothProgress }} />;
}

/**
 * A 2px bar across the top of the page that fills as the visitor scrolls. The spring smooths it only
 * when motion is welcome, otherwise the bar follows the scroll position exactly and no spring is created.
 */
export function ScrollProgress({ tone = 'light' }: ScrollProgressProps) {
  const isMotionAllowed = useMotionAllowed();

  return isMotionAllowed ? <SmoothBar tone={tone} /> : <PlainBar tone={tone} />;
}
