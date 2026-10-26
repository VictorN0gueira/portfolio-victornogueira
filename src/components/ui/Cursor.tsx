import { cn } from '../../lib/utils';

export type CursorTone = 'ink' | 'white' | 'accent';

interface CursorProps {
  tone?: CursorTone;
  className?: string;
}

const TONE_CLASSES: Record<CursorTone, string> = {
  ink: 'bg-vn-ink',
  white: 'bg-vn-white',
  accent: 'bg-vn-accent',
};

/**
 * Terminal style block cursor that blinks after a word. The blink is `.vn-cursor` in tokens.css,
 * which stops it (the block stays visible) under reduced motion and `.a11y-no-animations`.
 * The accent tone counts as the section's single accent element and belongs on black only.
 */
export function Cursor({ tone = 'ink', className }: CursorProps) {
  return (
    <span
      aria-hidden="true"
      className={cn('vn-cursor inline-block h-[1em] w-[0.5em] align-[-0.1em]', TONE_CLASSES[tone], className)}
    />
  );
}

export default Cursor;
