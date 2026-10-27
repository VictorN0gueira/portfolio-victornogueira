import { useRef, useState, type KeyboardEvent } from 'react';
import { isPrintableKey, useTypeahead } from './useTypeahead';

interface ListboxNavigationOptions {
  /** The text of each option, in order. Type-ahead matches against it. */
  labels: readonly string[];
  /** The option that is chosen now: the active one starts there each time the list opens. */
  selectedIndex: number;
  /** Enter, Space or a click chose this option. */
  onChoose: (index: number) => void;
  /** Tab asks to leave the list. */
  onDismiss: () => void;
}

/**
 * Keyboard and focus logic of a listbox whose options take the focus (roving tabindex): ArrowDown and ArrowUp
 * move the active option (and stop at the ends), Home and End jump to the first and last, Enter or Space
 * choose it, Tab dismisses, and a typed character jumps to the option that starts with it. The keys handled here
 * are cancelled, so they never scroll the page or move the focus by themselves.
 * `registerOption(index)` is the ref callback of each option and `onKeyDown` goes on the listbox.
 */
export function useListboxNavigation({ labels, selectedIndex, onChoose, onDismiss }: ListboxNavigationOptions) {
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);

  const focusOption = (index: number, shouldScroll = true) => {
    setActiveIndex(index);
    optionRefs.current[index]?.focus({ preventScroll: !shouldScroll });
  };

  const typeahead = useTypeahead(labels, activeIndex, focusOption);

  const registerOption = (index: number) => (node: HTMLLIElement | null) => {
    optionRefs.current[index] = node;
  };

  /** The list opened: the active option goes back to the chosen one. */
  const resetActive = () => setActiveIndex(selectedIndex);

  /** The list is on screen: the chosen option takes the focus and comes into view, without scrolling the page. */
  const focusSelected = () => {
    focusOption(selectedIndex, false);
    optionRefs.current[selectedIndex]?.scrollIntoView?.({ block: 'nearest' });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const lastIndex = labels.length - 1;

    if (event.key === 'ArrowDown') focusOption(Math.min(activeIndex + 1, lastIndex));
    else if (event.key === 'ArrowUp') focusOption(Math.max(activeIndex - 1, 0));
    else if (event.key === 'Home') focusOption(0);
    else if (event.key === 'End') focusOption(lastIndex);
    else if (event.key === 'Enter' || (event.key === ' ' && !typeahead.isTyping())) onChoose(activeIndex);
    else if (event.key === 'Tab') onDismiss();
    else if (isPrintableKey(event)) typeahead.type(event.key);
    else return;

    event.preventDefault();
  };

  return { activeIndex, focusOption, focusSelected, onKeyDown, registerOption, resetActive };
}
