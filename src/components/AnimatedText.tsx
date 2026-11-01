import { useRef } from 'react';
import { m, useInView } from 'motion/react';
import { useMotionAllowed } from '../hooks/useMotionAllowed';
import { EASE_OUT } from '../lib/motion';

type AnimatedTextProps = {
  text: string;
  className?: string;
  delay?: number;
  underline?: boolean;
};

export function AnimatedText({
  text,
  className = '',
  delay = 0,
  underline = true,
}: AnimatedTextProps) {
  const shouldReduce = !useMotionAllowed();
  const containerRef = useRef<HTMLSpanElement>(null);
  const isInView = useInView(containerRef, { once: true });
  const words = text.split(' ');
  const totalChars = text.replace(/ /g, '').length;
  const underlineDelay = delay + totalChars * 0.03 + 0.08;

  let charIndex = 0;

  return (
    <span ref={containerRef} className={`relative inline-block ${className}`}>
      {/* The letters are split for the animation: a screen reader gets the whole text from the line below, once. */}
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="inline-flex flex-wrap gap-x-[0.25em]">
        {words.map((word, wi) => (
          <span key={wi} className="inline-flex">
            {word.split('').map((char) => {
              const idx = charIndex++;
              return (
                <m.span
                  key={idx}
                  initial={{ opacity: 0, y: shouldReduce ? 0 : 18 }}
                  animate={
                    isInView
                      ? { opacity: 1, y: 0 }
                      : { opacity: 0, y: shouldReduce ? 0 : 18 }
                  }
                  transition={{
                    duration: 0.28,
                    ease: EASE_OUT,
                    delay: shouldReduce ? 0 : delay + idx * 0.03,
                  }}
                  className="inline-block"
                >
                  {char}
                </m.span>
              );
            })}
          </span>
        ))}
      </span>

      {underline && (
        <m.span
          aria-hidden="true"
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
