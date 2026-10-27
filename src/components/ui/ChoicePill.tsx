import * as Popover from '@radix-ui/react-popover';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useListboxNavigation } from '../../hooks/useListboxNavigation';
import { cn } from '../../lib/utils';
import { ChoiceList, type ChoiceOption } from './ChoiceList';

export type { ChoiceOption } from './ChoiceList';

interface ChoicePillProps<T extends string | number> {
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

// The chevron is out of the flow (absolute, at the right padding), so the text is the only item of the pill: the
// baseline of the pill, first and last, is the baseline of its text. A parent can then line something up with the
// last line of a pill whose text wrapped (the period after the task pill of the hero sentence does).
// The right padding is the chevron (0.55em) with its 0.6em margin and the 0.3em gap the pill had before.
const TRIGGER_CLASSES = [
  'group relative inline-flex min-h-11 max-w-full items-center rounded-full border border-vn-gray-light bg-vn-white',
  'py-[0.04em] pr-[1.45em] pl-[0.6em] text-left align-baseline text-vn-ink cursor-pointer select-none',
  'hover:bg-vn-cream data-[state=open]:bg-vn-cream',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vn-ink',
].join(' ');

interface ChoiceTriggerProps {
  label: string;
  ariaLabel: string;
  className?: string;
}

/** The pill itself: a button that announces a listbox. Radix adds aria-expanded, aria-controls and data-state. */
function ChoiceTrigger({ label, ariaLabel, className }: ChoiceTriggerProps) {
  return (
    <Popover.Trigger aria-haspopup="listbox" aria-label={ariaLabel} className={cn(TRIGGER_CLASSES, className)}>
      <span>{label}</span>
      <ChevronDown
        aria-hidden="true"
        className="absolute top-1/2 right-[0.6em] size-[0.55em] -translate-y-1/2 transition-transform duration-200 ease-out group-data-[state=open]:rotate-180"
      />
    </Popover.Trigger>
  );
}

/**
 * A pill that opens a listbox of options (a Radix popover, not a native select, so it can sit inside a sentence
 * and be styled). The trigger is a button with aria-haspopup="listbox" and aria-expanded. Inside the list the
 * focus lives on the active option: arrow keys, Home and End move it, a typed letter jumps to the matching
 * option, Enter or Space chooses, Escape and Tab close. The focus always returns to the trigger on close.
 * The list opens below the pill, flips and shifts to stay 12px inside the screen, and scrolls when it is too tall.
 */
export function ChoicePill<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
  listLabel,
  className,
}: ChoicePillProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const selectedLabel = options[selectedIndex]?.label ?? '';

  const choose = (index: number) => {
    onChange(options[index].value);
    setIsOpen(false);
  };

  const navigation = useListboxNavigation({
    labels: options.map((option) => option.label),
    selectedIndex,
    onChoose: choose,
    onDismiss: () => setIsOpen(false),
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) navigation.resetActive();
    setIsOpen(nextOpen);
  };

  return (
    <Popover.Root open={isOpen} onOpenChange={handleOpenChange}>
      <ChoiceTrigger label={selectedLabel} ariaLabel={ariaLabel(selectedLabel)} className={className} />
      <ChoiceList
        options={options}
        selectedIndex={selectedIndex}
        activeIndex={navigation.activeIndex}
        label={listLabel}
        registerOption={navigation.registerOption}
        onKeyDown={navigation.onKeyDown}
        onOpenFocus={navigation.focusSelected}
        onChoose={choose}
        onActivate={(index) => navigation.focusOption(index, false)}
      />
    </Popover.Root>
  );
}

export default ChoicePill;
