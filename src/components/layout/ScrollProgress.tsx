import { motion, useScroll, useSpring } from 'motion/react';
import { useMotionAllowed } from '../../hooks/useMotionAllowed';

const SPRING = { stiffness: 100, damping: 30, restDelta: 0.001 } as const;

/**
 * A 2px bar across the top of the page that fills as the visitor scrolls. The spring smooths it only
 * when motion is welcome, otherwise the bar follows the scroll position exactly.
 */
export function ScrollProgress() {
  const isMotionAllowed = useMotionAllowed();
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, SPRING);

  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-vn-ink"
      style={{ scaleX: isMotionAllowed ? smoothProgress : scrollYProgress }}
    />
  );
}

export default ScrollProgress;
