import * as Popover from '@radix-ui/react-popover';
import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '../../lib/utils';

export interface ChoiceOption<T extends string | number> {
  value: T;
  label: string;
}

interface ChoicePillProps<T extends string | number> {
  value: T;
  options: readonly ChoiceOption<T>[];
  onChange: (value: T) => void;
  /** Builds the accessible name of the trigger from the label of the current option. */
  ariaLabel: (label: string) => string;
  /** Accessible name of the list. Falls back to the name of the trigger. */
  listLabel?: string;
  /** Extra classes for the trigger, for example `lowercase` inside a heading. */
  className?: string;
}

// How long a typed prefix stays alive, so "fo" finds "follow-up" but a pause starts a new search.
const TYPEAHEAD_RESET_MS = 600;
const COLLISION_PADDING_PX = 12;
const PANEL_OFFSET_PX = 8;

const TRIGGER_CLASSES = [
  'group inline-flex min-h-11 max-w-full items-center gap-[0.3em] rounded-full border border-vn-gray-light bg-vn-white',
  'px-[0.6em] py-[0.04em] text-left align-baseline text-vn-ink cursor-pointer select-none',
  'hover:bg-vn-cream data-[state=open]:bg-vn-cream',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vn-ink',
].join(' ');

const PANEL_CLASSES = [
  'vn-choice-panel relative z-[100] w-max min-w-[min(11rem,92vw)] max-w-[min(92vw,20rem)]',
  'max-h-[var(--radix-popover-content-available-height)] overflow-y-auto overscroll-contain',
  'rounded-2xl border border-vn-gray-light bg-vn-white p-1.5 font-sans text-base font-medium normal-case',
  'tracking-normal text-vn-ink shadow-[0_12px_32px_-12px_rgba(10,10,10,.35)] outline-none',
].join(' ');

const OPTION_CLASSES = [
  'flex min-h-11 cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-3 py-2 leading-tight',
  'outline-none data-[active=true]:bg-vn-cream data-[active=true]:outline-2 data-[active=true]:-outline-offset-2',
  'data-[active=true]:outline-vn-ink',
].join(' ');

/**
 * Index of the option a typed prefix points to, or -1. A single character (or the same character repeated)
 * starts looking after the active option, so pressing "a" again moves to the next option that starts with "a".
 * A longer prefix starts at the active option, which may already match.
 */
function findTypeaheadMatch(labels: readonly string[], typed: string, activeIndex: number): number {
  const isRepeat = [...typed].every((character) => character === typed[0]);
  const query = isRepeat ? typed[0] : typed;
  const start = isRepeat ? activeIndex + 1 : activeIndex;

  for (let offset = 0; offset < labels.length; offset += 1) {
    const index = (start + offset) % labels.length;
    if (labels[index].toLowerCase().startsWith(query)) return index;
  }
  return -1;
}

function isPrintable(event: KeyboardEvent): boolean {
  return event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
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
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);
  const typed = useRef({ text: '', timer: 0 });

  useEffect(() => {
    const state = typed.current;
    return () => window.clearTimeout(state.timer);
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setActiveIndex(selectedIndex);
    setIsOpen(nextOpen);
  };

  const focusOption = (index: number, shouldScroll = true) => {
    setActiveIndex(index);
    optionRefs.current[index]?.focus({ preventScroll: !shouldScroll });
  };

  const choose = (index: number) => {
    onChange(options[index].value);
    setIsOpen(false);
  };

  const handleTypeahead = (character: string) => {
    const state = typed.current;
    window.clearTimeout(state.timer);
    state.text += character.toLowerCase();
    state.timer = window.setTimeout(() => {
      state.text = '';
    }, TYPEAHEAD_RESET_MS);

    const match = findTypeaheadMatch(
      options.map((option) => option.label),
      state.text,
      activeIndex,
    );
    if (match >= 0) focusOption(match);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const lastIndex = options.length - 1;
    const isTyping = typed.current.text !== '';

    if (event.key === 'ArrowDown') focusOption(Math.min(activeIndex + 1, lastIndex));
    else if (event.key === 'ArrowUp') focusOption(Math.max(activeIndex - 1, 0));
    else if (event.key === 'Home') focusOption(0);
    else if (event.key === 'End') focusOption(lastIndex);
    else if (event.key === 'Enter' || (event.key === ' ' && !isTyping)) choose(activeIndex);
    else if (event.key === 'Tab') setIsOpen(false);
    else if (isPrintable(event)) handleTypeahead(event.key);
    else return;

    // The keys handled here must not scroll the page or move the focus by themselves.
    event.preventDefault();
  };

  return (
    <Popover.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-label={ariaLabel(selectedLabel)}
          className={cn(TRIGGER_CLASSES, className)}
        >
          <span>{selectedLabel}</span>
          <ChevronDown
            aria-hidden="true"
            className="size-[0.55em] shrink-0 transition-transform duration-200 ease-out group-data-[state=open]:rotate-180"
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          asChild
          side="bottom"
          align="start"
          sideOffset={PANEL_OFFSET_PX}
          collisionPadding={COLLISION_PADDING_PX}
          avoidCollisions
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            focusOption(selectedIndex, false);
            optionRefs.current[selectedIndex]?.scrollIntoView?.({ block: 'nearest' });
          }}
        >
          <ul
            role="listbox"
            aria-label={listLabel ?? ariaLabel(selectedLabel)}
            className={PANEL_CLASSES}
            onKeyDown={handleKeyDown}
          >
            {options.map((option, index) => (
              <li
                key={option.value}
                ref={(node) => {
                  optionRefs.current[index] = node;
                }}
                role="option"
                aria-selected={index === selectedIndex}
                tabIndex={index === activeIndex ? 0 : -1}
                data-active={index === activeIndex}
                className={cn(OPTION_CLASSES, index === selectedIndex && 'font-bold')}
                onClick={() => choose(index)}
                onPointerMove={() => {
                  if (index !== activeIndex) focusOption(index, false);
                }}
              >
                <span>{option.label}</span>
                {index === selectedIndex ? <Check aria-hidden="true" className="size-4 shrink-0" /> : null}
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export default ChoicePill;
