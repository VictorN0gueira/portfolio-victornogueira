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

/* Fallback de página inteira — min-h-screen evita flash branco e CLS
   durante a troca de rota com AnimatePresence mode="wait" */
export function PageFallback() {
  return (
    <div className="min-h-screen bg-brand-white flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-zinc-200 dark:border-zinc-700 border-t-zinc-500 dark:border-t-zinc-400 rounded-full animate-spin" />
    </div>
  );
}
