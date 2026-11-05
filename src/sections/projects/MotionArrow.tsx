import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useMotionAllowed } from '../../hooks/useMotionAllowed';
import { cn } from '../../lib/utils';

type ArrowDirection = 'left' | 'right';

interface MotionArrowProps {
  direction?: ArrowDirection;
  className?: string;
}

// The arrow settles 4px toward where it points, under the pointer and, as the same cue, on keyboard focus: the parent
// link has `group`, and group-focus-visible is what the keyboard gets. Transform only.
const SETTLE_CLASSES: Record<ArrowDirection, string> = {
  right: 'transition-transform duration-300 ease-out group-hover:translate-x-1 group-focus-visible:translate-x-1',
  left: 'transition-transform duration-300 ease-out group-hover:-translate-x-1 group-focus-visible:-translate-x-1',
};

/**
 * The arrow of a card or of the back link. It moves only where motion is welcome (the system preference and the "Pausar
 * animações" option of the site both count), and the keyboard gets what the pointer gets. Hidden from assistive
 * technology: the text beside it says what the link does.
 */
export function MotionArrow({ direction = 'right', className }: MotionArrowProps) {
  const isMotionAllowed = useMotionAllowed();
  const Icon = direction === 'right' ? ArrowRight : ArrowLeft;

  return (
    <Icon
      aria-hidden="true"
      className={cn('size-4 shrink-0', isMotionAllowed && SETTLE_CLASSES[direction], className)}
    />
  );
}
