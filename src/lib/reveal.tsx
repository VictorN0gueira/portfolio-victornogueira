import { motion } from 'motion/react';
import type { ComponentProps } from 'react';

export const revealProps: ComponentProps<typeof motion.div> = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-100px' },
  transition: { duration: 0.8, ease: 'easeOut' },
};

// The skeleton and the page fallback moved to their own files; these re-exports keep the old import path working.
export { SectionSkeleton } from '../components/ui/SectionSkeleton';
export { PageFallback } from '../components/layout/PageFallback';
