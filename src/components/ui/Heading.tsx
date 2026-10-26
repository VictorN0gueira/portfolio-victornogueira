import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4';
export type HeadingSize = 'xl' | 'l' | 'm';

interface HeadingProps {
  as?: HeadingTag;
  size?: HeadingSize;
  children: ReactNode;
  id?: string;
  className?: string;
}

const SIZE_CLASSES: Record<HeadingSize, string> = {
  xl: 'text-[length:clamp(2.25rem,1rem+6vw,6rem)] leading-[.95]',
  l: 'text-[length:clamp(1.875rem,1rem+4vw,4rem)] leading-[.98]',
  m: 'text-[length:clamp(1.5rem,1.2rem+1vw,1.75rem)] leading-[.98]',
};

/**
 * Display heading. The text stays in its original case in the DOM and CSS lowercases it.
 * It sets no color: it inherits the text color of the Section it sits in.
 * `break-words` keeps a long word from overflowing a 280px screen.
 */
export function Heading({ as: Tag = 'h2', size = 'l', children, id, className }: HeadingProps) {
  return (
    <Tag
      id={id}
      className={cn(
        'font-display font-bold lowercase tracking-[-0.03em] text-balance break-words',
        SIZE_CLASSES[size],
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export default Heading;
