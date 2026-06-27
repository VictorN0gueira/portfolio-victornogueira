import { motion } from 'motion/react';
import { isTouchDevice } from '../lib/constants';

export default function HeroBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Noise overlay texture — desktop only (fractal noise is too heavy on mobile GPU) */}
      {!isTouchDevice && (
        <div
          className="absolute inset-0 mix-blend-overlay opacity-[0.03] z-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
            backgroundSize: '150px 150px',
          }}
        />
      )}

      {/* Subtle light beam — static on mobile */}
      <motion.div
        className="absolute inset-0 bg-radial-[at_50%_50%] from-black/2 via-transparent to-transparent"
        style={{ opacity: 0.5 }}
        animate={isTouchDevice ? undefined : { opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, repeatType: 'reverse' }}
      />

      {/* Tech Grid Pattern */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--grid-line-color) 1px, transparent 1px),
            linear-gradient(to bottom, var(--grid-line-color) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)',
        }}
      />

      {/* Ambient blobs — static on mobile (blur+scale animation is very expensive on mobile GPU) */}
      <motion.div
        className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-zinc-200/50 dark:bg-zinc-700/50 blur-[120px]"
        style={{ opacity: 0.4 }}
        animate={isTouchDevice ? undefined : { opacity: [0.3, 0.5, 0.3], scale: [1, 1.1, 1] }}
        transition={{ duration: 10, repeat: Infinity, repeatType: 'reverse' }}
      />

      <motion.div
        className="absolute bottom-[10%] left-[-5%] w-[30%] h-[30%] rounded-full bg-zinc-200/30 dark:bg-zinc-700/30 blur-[100px]"
        style={{ opacity: 0.3 }}
        animate={isTouchDevice ? undefined : { opacity: [0.2, 0.4, 0.2], scale: [1, 1.2, 1] }}
        transition={{ duration: 12, repeat: Infinity, repeatType: 'reverse', delay: 2 }}
      />

      {/* Diagonal sweep — desktop only (animates transform, not left) */}
      {!isTouchDevice && (
        <motion.div
          className="absolute -inset-full h-[300%] w-[200%] opacity-[0.03]"
          style={{
            background: 'linear-gradient(115deg, transparent 30%, rgba(0,0,0,0.8) 40%, rgba(0,0,0,0.4) 50%, transparent 60%)',
            rotate: '-15deg',
          }}
          animate={{ x: ['-50%', '150%'] }}
          transition={{ duration: 10, repeat: Infinity, repeatDelay: 5, ease: 'easeInOut' }}
        />
      )}
    </div>
  );
}
