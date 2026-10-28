import { motion } from 'motion/react';
import type { ComponentProps } from 'react';
import { cn } from './utils';

export const revealProps: ComponentProps<typeof motion.div> = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-100px' },
  transition: { duration: 0.8, ease: 'easeOut' },
};

interface SectionSkeletonProps {
  /**
   * The min-height classes (one per breakpoint) of what the lazy section will be about as tall as. A section that loads
   * late grows from this height to its own, so the closer this is, the less the sections below it (and an anchor such
   * as #metodo) move when it arrives. Full class names, written out, so the stylesheet generator can see them.
   * Given, the skeleton is a band of the new design (cream, the spinner near its top). Not given, it is the compact
   * transparent placeholder the legacy pages (/sobre, /contato, /projetos) had, which sits on whatever page it is on.
   */
  heightClassName?: string;
}

// Neutral on a light and on a dark page alike, since the legacy pages are still dark until they are rebuilt.
const SPINNER_CLASSES = 'size-10 rounded-full border-2 border-vn-gray-mid/40 border-t-vn-gray-mid motion-safe:animate-spin';
const LABEL_CLASSES = 'font-mono text-xs font-medium uppercase tracking-[0.18em] text-vn-gray-mid';

/**
 * Placeholder of a lazy section. It is only a picture of loading, so it is hidden from assistive tech: the sections
 * of a page are several, and each one would announce "Carregando..." again, while every section brings its own heading
 * when it arrives. (The page level fallback below is the one with a status role.)
 */
export function SectionSkeleton({ heightClassName }: SectionSkeletonProps) {
  const band = heightClassName !== undefined;

  return (
    <div
      aria-hidden="true"
      className={cn('flex justify-center py-24', band ? 'items-start bg-vn-cream' : 'items-center', heightClassName)}
    >
      <div className="flex flex-col items-center gap-4">
        <div className={SPINNER_CLASSES} />
        <span className={LABEL_CLASSES}>Carregando...</span>
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
