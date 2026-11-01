import { useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { isPrintableKey, useTypeahead } from './useTypeahead';

interface ListboxNavigationOptions {
  /** The text of each option, in order. Type-ahead matches against it. */
  labels: readonly string[];
  /** The option that is chosen now: the active one starts there each time the list opens. */
  selectedIndex: number;
  /** Enter, Space or a click chose this option. */
  onChoose: (index: number) => void;
  /** Tab asks to leave the list: close it. */
  onDismiss: () => void;
  /** The control that opened the list. Tab moves the focus back to it first, so the browser's own Tab goes on from there. */
  triggerRef?: RefObject<HTMLElement | null>;
}

/** One ref callback per option for the life of the list: a new function on every render makes React detach and attach every ref. */
function useOptionRefs() {
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);
  const refCallbacks = useRef<Array<(node: HTMLLIElement | null) => void>>([]);

  const registerOption = (index: number) => {
    refCallbacks.current[index] ??= (node) => {
      optionRefs.current[index] = node;
    };
    return refCallbacks.current[index];
  };

  return { optionRefs, registerOption };
}

/**
 * The Tab way out of a list: the focus goes back to the trigger first and the list closes, so the browser's own Tab then
 * moves on from the trigger. `onCloseAutoFocus` goes on the popover content: it keeps the library from pulling the focus
 * back to the trigger after that Tab.
 */
function useTabExit(triggerRef: RefObject<HTMLElement | null> | undefined, onDismiss: () => void) {
  const closedByTab = useRef(false);

  const exitByTab = () => {
    closedByTab.current = true;
    triggerRef?.current?.focus({ preventScroll: true });
    onDismiss();
  };

  /** The popover closed: after a Tab the focus is already where the visitor sent it, so it is not pulled back. */
  const onCloseAutoFocus = (event: Event) => {
    if (!closedByTab.current) return;
    closedByTab.current = false;
    event.preventDefault();
  };

  return { exitByTab, onCloseAutoFocus };
}

/**
 * Keyboard and focus logic of a listbox whose options take the focus (roving tabindex): ArrowDown and ArrowUp
 * move the active option (and stop at the ends), Home and End jump to the first and last, Enter or Space
 * choose it, and a typed character jumps to the option that starts with it. Those keys are cancelled, so they never
 * scroll the page or move the focus by themselves. Tab is not cancelled: it closes the list with the focus on the
 * trigger (see useTabExit), so one press leaves the control (a list that kept the first Tab to itself would need two).
 * `registerOption(index)` is the ref callback of each option (the same function every render) and `onKeyDown` goes on
 * the listbox.
 */
export function useListboxNavigation({ labels, selectedIndex, onChoose, onDismiss, triggerRef }: ListboxNavigationOptions) {
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const { optionRefs, registerOption } = useOptionRefs();
  const { exitByTab, onCloseAutoFocus } = useTabExit(triggerRef, onDismiss);

  const focusOption = (index: number, shouldScroll = true) => {
    setActiveIndex(index);
    optionRefs.current[index]?.focus({ preventScroll: !shouldScroll });
  };

  const typeahead = useTypeahead(labels, activeIndex, focusOption);

  /** The list opened: the active option goes back to the chosen one. */
  const resetActive = () => setActiveIndex(selectedIndex);

  /** The list is on screen: the chosen option takes the focus and comes into view, without scrolling the page. */
  const focusSelected = () => {
    focusOption(selectedIndex, false);
    optionRefs.current[selectedIndex]?.scrollIntoView?.({ block: 'nearest' });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const lastIndex = labels.length - 1;

    if (event.key === 'Tab') return exitByTab();
    if (event.key === 'ArrowDown') focusOption(Math.min(activeIndex + 1, lastIndex));
    else if (event.key === 'ArrowUp') focusOption(Math.max(activeIndex - 1, 0));
    else if (event.key === 'Home') focusOption(0);
    else if (event.key === 'End') focusOption(lastIndex);
    else if (event.key === 'Enter' || (event.key === ' ' && !typeahead.isTyping())) onChoose(activeIndex);
    else if (isPrintableKey(event)) typeahead.type(event.key);
    else return;

    event.preventDefault();
  };

  return { activeIndex, focusOption, focusSelected, onCloseAutoFocus, onKeyDown, registerOption, resetActive };
}
