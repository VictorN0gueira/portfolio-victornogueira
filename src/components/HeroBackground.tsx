import { motion } from 'motion/react';

export default function HeroBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Noise overlay texture */}
      <div
        className="absolute inset-0 mix-blend-overlay opacity-[0.03] z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '150px 150px',
        }}
      />

      {/* Subtle light beam effect */}
      <motion.div
        className="absolute inset-0 bg-radial-gradient from-black/[0.02] via-transparent to-transparent"
        animate={{
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatType: "reverse"
        }}
      />

      {/* Dynamic dotted grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          opacity: 1,
        }}
      />

      {/* Ambient light sources (Subtle blobs) */}
      <motion.div
        className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-zinc-200/50 blur-[120px]"
        animate={{
          opacity: [0.3, 0.5, 0.3],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />

      <motion.div
        className="absolute bottom-[10%] left-[-5%] w-[30%] h-[30%] rounded-full bg-zinc-200/30 blur-[100px]"
        animate={{
          opacity: [0.2, 0.4, 0.2],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          repeatType: "reverse",
          delay: 2
        }}
      />

      {/* Diagonal highlight animation */}
      <motion.div
        className="absolute -inset-full h-[300%] w-[200%] opacity-[0.03]"
        style={{
          background: 'linear-gradient(115deg, transparent 30%, rgba(0, 0, 0, 0.8) 40%, rgba(0, 0, 0, 0.4) 50%, transparent 60%)',
          transform: 'rotate(-15deg)',
        }}
        animate={{
          left: ['-100%', '100%'],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatDelay: 5,
          ease: "easeInOut"
        }}
      />
    </div>
  );
}
