import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Undo2, type LucideIcon } from 'lucide-react';
import { useId } from 'react';
import type { StepDirection, TabSide } from '../lib/floatingLayout';
import { a11yWidgetCopy } from './a11yWidgetCopy';
import { PANEL_FOCUS_RING } from './AccessibilityOptions';

const ARROW_BUTTON_CLASSES = `flex min-h-11 min-w-11 flex-1 items-center justify-center text-vn-gray-light transition-colors hover:bg-white/8 hover:text-white ${PANEL_FOCUS_RING}`;

interface AccessibilityPositionGroupProps {
  toSide: (side: TabSide) => void;
  step: (direction: StepDirection) => void;
  reset: () => void;
}

/**
 * The way to move the tab without dragging it (WCAG 2.2, 2.5.7): four arrow buttons and one to go back to the default
 * place. They use the same position as the drag. No live region: the tab visibly moves, and the buttons are named.
 */
export function AccessibilityPositionGroup({ toSide, step, reset }: AccessibilityPositionGroupProps) {
  const labelId = useId();
  const arrows: Array<[LucideIcon, string, () => void]> = [
    [ArrowLeft, a11yWidgetCopy.moveLeftLabel, () => toSide('left')],
    [ArrowRight, a11yWidgetCopy.moveRightLabel, () => toSide('right')],
    [ArrowUp, a11yWidgetCopy.moveUpLabel, () => step('up')],
    [ArrowDown, a11yWidgetCopy.moveDownLabel, () => step('down')],
  ];

  return (
    <div role="group" aria-labelledby={labelId} className="shrink-0 border-t border-white/10">
      <span id={labelId} className="block px-4 pb-1 pt-2.5 text-xs font-semibold uppercase tracking-widest text-vn-gray-light">
        {a11yWidgetCopy.positionGroupLabel}
      </span>
      <div className="flex">
        {arrows.map(([Icon, label, onPress]) => (
          <button key={label} type="button" aria-label={label} onClick={onPress} className={ARROW_BUTTON_CLASSES}>
            <Icon aria-hidden="true" className="size-5" />
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={reset}
        className={`flex min-h-11 w-full items-center justify-center gap-2 text-xs text-vn-gray-mid transition-colors hover:text-vn-gray-light ${PANEL_FOCUS_RING}`}
      >
        <Undo2 aria-hidden="true" className="size-3.5 shrink-0" />
        {a11yWidgetCopy.resetPositionLabel}
      </button>
    </div>
  );
}
