import { m } from 'motion/react';
import type { ComponentProps } from 'react';

export const revealProps: ComponentProps<typeof m.div> = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-100px' },
  transition: { duration: 0.8, ease: 'easeOut' },
};
