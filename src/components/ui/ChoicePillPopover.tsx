import * as Popover from '@radix-ui/react-popover';
import { useLayoutEffect, type ComponentProps } from 'react';
import { useChoicePopover } from '../../hooks/useChoicePopover';
import { cn } from '../../lib/utils';
import { ChoiceList, type ChoiceOption } from './ChoiceList';
import { PillFace } from './choicePillFace';
import { TRIGGER_CLASSES } from './choicePillStyles';

export interface ChoicePillProps<T extends string | number> {
  value: T;
  options: readonly ChoiceOption<T>[];
  onChange: (value: T) => void;
  /** Builds the accessible name of the trigger from the label of the current option. */
  ariaLabel: (label: string) => string;
  /** Accessible name of the list: what is being chosen ("Horas por semana"), never the action of the trigger. */
  listLabel: string;
  /** Extra classes for the trigger, for example `lowercase` inside a heading. */
  className?: string;
}

/** What the plain pill of the entry hands over when the popover chunk takes its place. */
export interface ChoicePillHandoff {
  /** The visitor already asked for the list (a click or an arrow key on the plain pill): open it at once. */
  isOpen: boolean;
  /** The plain pill had the focus: the pill that replaces it takes it. */
  hasFocus: boolean;
}

interface ChoiceTriggerProps {
  /** Ref, key handler and the `aria-controls` rule of the trigger, from useChoicePopover. */
  triggerProps: Pick<ComponentProps<typeof Popover.Trigger>, 'ref' | 'onKeyDown' | 'aria-controls'>;
  label: string;
  ariaLabel: string;
  className?: string;
}

/** The pill itself: a button that announces a listbox. Radix adds aria-expanded, data-state and, while the list is open, aria-controls. */
function ChoiceTrigger({ triggerProps, label, ariaLabel, className }: ChoiceTriggerProps) {
  return (
    <Popover.Trigger {...triggerProps} aria-haspopup="listbox" aria-label={ariaLabel} className={cn(TRIGGER_CLASSES, className)}>
      <PillFace label={label} />
    </Popover.Trigger>
  );
}

/**
 * A pill that opens a listbox of options (a Radix popover, not a native select, so it can sit inside a sentence
 * and be styled). The trigger is a button with aria-haspopup="listbox" and aria-expanded. Inside the list the
 * focus lives on the active option: arrow keys, Home and End move it, a typed letter jumps to the matching
 * option, Enter or Space chooses, Escape and Tab close. The focus always returns to the trigger on close.
 * The list opens below the pill, flips and shifts to stay 12px inside the screen, and scrolls when it is too tall.
 * This is the chunk that loads after the first paint (see ChoicePill): `handoff` carries what the plain pill it replaces
 * had already received, so the swap loses neither a click nor the focus.
 */
export function ChoicePillPopover<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
  listLabel,
  className,
  handoff,
}: ChoicePillProps<T> & { handoff: ChoicePillHandoff }) {
  const { isOpen, handleOpenChange, triggerProps, selectedLabel, listProps } = useChoicePopover({
    value,
    options,
    onChange,
    initialOpen: handoff.isOpen,
  });
  const { ref: triggerRef } = triggerProps;

  // A pill that was focused when it swapped keeps the focus (a list that opens at once takes it for its option).
  useLayoutEffect(() => {
    if (handoff.hasFocus && !handoff.isOpen) triggerRef.current?.focus();
  }, [handoff.hasFocus, handoff.isOpen, triggerRef]);

  return (
    <Popover.Root open={isOpen} onOpenChange={handleOpenChange}>
      <ChoiceTrigger
        triggerProps={triggerProps}
        label={selectedLabel}
        ariaLabel={ariaLabel(selectedLabel)}
        className={className}
      />
      <ChoiceList {...listProps} label={listLabel} />
    </Popover.Root>
  );
}

export default ChoicePillPopover;
