import { motion } from 'motion/react';
import type { ComponentProps } from 'react';

export const revealProps: ComponentProps<typeof motion.div> = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-100px' },
  transition: { duration: 0.8, ease: 'easeOut' },
};

/* Skeleton de carregamento reutilizável */
export function SectionSkeleton() {
  return (
    <div className="py-24 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-zinc-200 dark:border-zinc-700 border-t-zinc-500 dark:border-t-zinc-400 rounded-full animate-spin" />
        <span className="text-xs text-zinc-400 uppercase tracking-widest font-medium">Carregando...</span>
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
