import { motion } from 'motion/react';
import type { ComponentProps } from 'react';
import { cn } from './utils';

export const revealProps: ComponentProps<typeof motion.div> = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-100px' },
  transition: { duration: 0.8, ease: 'easeOut' },
};

/** The height a skeleton holds when the page does not say how tall its section will be. */
const DEFAULT_SKELETON_HEIGHT = 'min-h-[clamp(18rem,40vh,32rem)]';

interface SectionSkeletonProps {
  /**
   * The min-height classes (one per breakpoint) of what the lazy section will be about as tall as. A section that loads
   * late grows from this height to its own, so the closer this is, the less the sections below it (and an anchor such
   * as #metodo) move when it arrives. Full class names, written out, so the stylesheet generator can see them.
   */
  heightClassName?: string;
}

/** Placeholder of a lazy section: a cream band with the spinner near its top, as tall as the section it stands for. */
export function SectionSkeleton({ heightClassName = DEFAULT_SKELETON_HEIGHT }: SectionSkeletonProps) {
  return (
    <div className={cn('flex items-start justify-center bg-vn-cream py-24', heightClassName)}>
      <div className="flex flex-col items-center gap-4">
        <div className="size-10 rounded-full border-2 border-vn-gray-light border-t-vn-gray-mid motion-safe:animate-spin" />
        <span className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-vn-gray-dark">Carregando...</span>
      </div>
    </div>
  );
}

/* Fallback de página inteira: min-h-dvh evita flash e CLS durante a troca de rota
   com AnimatePresence mode="wait". Usa só os tokens VN One. */
export function PageFallback() {
  return (
    <div role="status" aria-label="Carregando página" className="flex min-h-dvh items-center justify-center bg-vn-cream">
      <div className="size-10 animate-spin rounded-full border-2 border-vn-gray-light border-t-vn-gray-mid" />
    </div>
  );
}
