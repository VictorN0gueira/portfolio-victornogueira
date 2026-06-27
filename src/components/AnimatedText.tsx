import { motion, useReducedMotion } from 'motion/react';

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
  const characters = text.split('');

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: shouldReduce ? 0 : 0.03,
        delayChildren: delay,
      },
    },
  };

  const charVariants = {
    hidden: { opacity: 0, y: shouldReduce ? 0 : 18 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] as const },
    },
  };

  const underlineDelay = delay + characters.length * 0.03 + 0.08;

  return (
    <span className={`relative inline-block ${className}`}>
      <motion.span
        className="inline-flex flex-wrap"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {characters.map((char, i) => (
          <motion.span
            key={i}
            variants={charVariants}
            className="inline-block"
            style={{ whiteSpace: char === ' ' ? 'pre' : 'normal' }}
          >
            {char === ' ' ? ' ' : char}
          </motion.span>
        ))}
      </motion.span>

      {underline && (
        <motion.span
          className="absolute -bottom-1 left-0 h-0.5 rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-300"
          initial={{ width: '0%' }}
          whileInView={{ width: '100%' }}
          viewport={{ once: true }}
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
