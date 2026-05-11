import { motion } from 'motion/react';

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

const isTouchDevice = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

// Avião de papel outline — inspirado no criacao.cc
export function PaperPlane({ className = '', style }: IconProps) {
  return (
    <motion.div
      className={`pointer-events-none select-none ${className}`}
      style={style}
      animate={isTouchDevice ? undefined : { y: [0, -18, 0], rotate: [-18, -12, -18] }}
      transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut' }}
    >
      <svg viewBox="0 0 100 84" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <path
          d="M6 42 L94 6 L64 78 L42 52 Z"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M42 52 L94 6"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M42 52 L48 70"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </motion.div>
  );
}

// Cursor / ponteiro do mouse — bloco sólido, estilo criacao.cc
export function Cursor({ className = '', style }: IconProps) {
  return (
    <motion.div
      className={`pointer-events-none select-none ${className}`}
      style={style}
      animate={isTouchDevice ? undefined : { y: [0, 12, 0], x: [0, 6, 0] }}
      transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
    >
      <svg viewBox="0 0 52 68" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <path d="M2 2 L2 54 L18 38 L28 64 L36 60 L26 34 L48 34 Z" />
      </svg>
    </motion.div>
  );
}

// Asterisco / faísca — elemento decorativo leve
export function Sparkle({ className = '', style }: IconProps) {
  return (
    <motion.div
      className={`pointer-events-none select-none ${className}`}
      style={style}
      animate={isTouchDevice ? undefined : { rotate: [0, 180, 360], scale: [1, 1.1, 1] }}
      transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
    >
      <svg viewBox="0 0 60 60" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <path d="M30 2 L32 26 L56 24 L34 32 L54 50 L30 36 L8 52 L26 32 L4 22 L28 28 Z" />
      </svg>
    </motion.div>
  );
}

// Seta circular — elemento girando devagar
export function RotatingArrow({ className = '', style }: IconProps) {
  return (
    <motion.div
      className={`pointer-events-none select-none ${className}`}
      style={style}
      animate={isTouchDevice ? undefined : { rotate: [0, 360] }}
      transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
    >
      <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="2" strokeDasharray="12 8" />
        <path
          d="M40 6 L46 14 M40 6 L34 14"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
  );
}
