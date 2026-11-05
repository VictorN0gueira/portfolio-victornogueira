import * as Popover from '@radix-ui/react-popover';
import { useEffect, useLayoutEffect, useRef, type ComponentProps } from 'react';
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
  /**
   * The swap came while the pointer was still down. The browser's own mousedown can arrive after it and drop the focus
   * that the list just gave to its option (the pill that was pressed is gone), so the focus is checked again when the
   * press ends.
   */
  isPress: boolean;
}

/**
 * After the pointer goes up the browser may still send the mouse events of a tap: on a touch screen they come as a task
 * of their own, a while after the pointer events. The check stays armed this long for them.
 */
const COMPAT_MOUSE_WAIT_MS = 500;

/**
 * After a list that opened in the middle of a press: when the press ends, and again after the mouse events that follow
 * it, the chosen option takes the focus if the browser dropped it (nothing has the focus). A focus the visitor moved on
 * purpose is left alone, and a list that has closed since has no option left to focus, so the call does nothing then.
 */
function useFocusAfterPress(isPress: boolean, focusOption: () => void) {
  // The latest focus function, so the listeners below need no dependency on it.
  const latestFocusOption = useRef(focusOption);
  useEffect(() => {
    latestFocusOption.current = focusOption;
  });

  useEffect(() => {
    if (!isPress) return undefined;
    const timers: number[] = [];
    const listeners: Array<[string, () => void]> = [];
    const later = (task: () => void, delay: number) => {
      timers.push(window.setTimeout(task, delay));
    };
    const stopListening = () => {
      for (const [type, listener] of listeners) document.removeEventListener(type, listener, true);
      listeners.length = 0;
    };
    const restoreIfLost = () =>
      later(() => {
        const active = document.activeElement;
        if (!active || active === document.body) latestFocusOption.current();
      }, 0);
    // pointerup may be followed by the mouse events of a tap, so it keeps listening; mouseup and pointercancel are the end.
    const onPointerUp = () => {
      restoreIfLost();
      later(stopListening, COMPAT_MOUSE_WAIT_MS);
    };
    const onEnd = () => {
      restoreIfLost();
      stopListening();
    };
    listeners.push(['pointerup', onPointerUp], ['pointercancel', onEnd], ['mouseup', onEnd]);
    for (const [type, listener] of listeners) document.addEventListener(type, listener, true);
    return () => {
      stopListening();
      for (const id of timers) window.clearTimeout(id);
    };
  }, [isPress]);
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
  useFocusAfterPress(handoff.isPress && handoff.isOpen, listProps.onOpenFocus);

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
