import { useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import type { ChoiceOption } from '../components/ui/ChoiceList';
import { useListboxNavigation } from './useListboxNavigation';

interface ChoicePopoverOptions<T extends string | number> {
  value: T;
  options: readonly ChoiceOption<T>[];
  onChange: (value: T) => void;
  /**
   * A value that is not in the options means nothing is chosen yet (an empty select): no option is marked chosen, and the
   * navigation starts at the first one. Without it such a value counts as the first option, as it does for the hero pill.
   */
  allowEmpty?: boolean;
}

const ARROW_KEYS = new Set(['ArrowDown', 'ArrowUp']);

/**
 * What goes on the Radix trigger besides its own props: the ref the focus returns to, the arrow keys that open the
 * closed list (as a native select does), and no `aria-controls` while the list is not mounted, because Radix points it
 * at an id that does not exist yet. While the list is open the attribute is left to Radix, which sets the real one.
 */
function useTriggerProps(triggerRef: RefObject<HTMLButtonElement | null>, isOpen: boolean, open: () => void) {
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (isOpen || !ARROW_KEYS.has(event.key)) return;
    event.preventDefault();
    open();
  };

  return { ref: triggerRef, onKeyDown, ...(isOpen ? {} : { 'aria-controls': undefined }) };
}

type Navigation = ReturnType<typeof useListboxNavigation>;

/** What ChoiceList needs from the navigation: the options, which one is chosen and active, and the handlers. */
function listPropsOf<T extends string | number>(
  options: readonly ChoiceOption<T>[],
  selectedIndex: number,
  choose: (index: number) => void,
  navigation: Navigation,
) {
  return {
    options,
    selectedIndex,
    activeIndex: navigation.activeIndex,
    registerOption: navigation.registerOption,
    onKeyDown: navigation.onKeyDown,
    onOpenFocus: navigation.focusSelected,
    onCloseAutoFocus: navigation.onCloseAutoFocus,
    onChoose: choose,
    onActivate: (index: number) => navigation.focusOption(index, false),
  };
}

/**
 * The state both listbox controls share (the pill of the hero and the select of the contact form): whether the list is
 * open, which option is chosen, the keyboard navigation and the trigger props (the ref the navigation sends the focus
 * back to, the arrow keys that open the list, the `aria-controls` rule). `listProps` is what ChoiceList needs from it.
 */
export function useChoicePopover<T extends string | number>({
  value,
  options,
  onChange,
  allowEmpty = false,
}: ChoicePopoverOptions<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const foundIndex = options.findIndex((option) => option.value === value);
  const startIndex = Math.max(0, foundIndex);
  const selectedIndex = allowEmpty ? foundIndex : startIndex;

  const choose = (index: number) => {
    onChange(options[index].value);
    setIsOpen(false);
  };

  const navigation = useListboxNavigation({
    labels: options.map((option) => option.label),
    selectedIndex: startIndex,
    onChoose: choose,
    onDismiss: () => setIsOpen(false),
    triggerRef,
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) navigation.resetActive();
    setIsOpen(nextOpen);
  };

  const triggerProps = useTriggerProps(triggerRef, isOpen, () => handleOpenChange(true));

  const listProps = listPropsOf(options, selectedIndex, choose, navigation);

  return {
    isOpen,
    handleOpenChange,
    triggerProps,
    selectedIndex,
    selectedLabel: options[selectedIndex]?.label ?? '',
    listProps,
  };
}
