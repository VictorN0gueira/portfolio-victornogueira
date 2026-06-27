import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';

type AnimatedTextProps = {
  text: string;
  className?: string;
  delay?: number;
  underline?: boolean;
};

export default function AnimatedText({
  text,
  className = '',
  delay = 0,
  underline = true,
}: AnimatedTextProps) {
  const shouldReduce = useReducedMotion();
  const containerRef = useRef<HTMLSpanElement>(null);
  const isInView = useInView(containerRef, { once: true });
  const words = text.split(' ');
  const totalChars = text.replace(/ /g, '').length;
  const underlineDelay = delay + totalChars * 0.03 + 0.08;

  let charIndex = 0;

  return (
    <span ref={containerRef} className={`relative inline-block ${className}`}>
      <span className="inline-flex flex-wrap gap-x-[0.25em]">
        {words.map((word, wi) => (
          <span key={wi} className="inline-flex">
            {word.split('').map((char) => {
              const idx = charIndex++;
              return (
                <motion.span
                  key={idx}
                  initial={{ opacity: 0, y: shouldReduce ? 0 : 18 }}
                  animate={
                    isInView
                      ? { opacity: 1, y: 0 }
                      : { opacity: 0, y: shouldReduce ? 0 : 18 }
                  }
                  transition={{
                    duration: 0.28,
                    ease: [0.4, 0, 0.2, 1] as const,
                    delay: shouldReduce ? 0 : delay + idx * 0.03,
                  }}
                  className="inline-block"
                >
                  {char}
                </motion.span>
              );
            })}
          </span>
        ))}
      </span>

      {underline && (
        <motion.span
          className="absolute -bottom-1 left-0 h-0.5 rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-300"
          initial={{ width: '0%' }}
          animate={isInView ? { width: '100%' } : { width: '0%' }}
          transition={{
            duration: 0.5,
            delay: shouldReduce ? 0 : underlineDelay,
            ease: 'easeOut',
          }}
        />
      )}
    </span>
  );
}
