import * as Popover from '@radix-ui/react-popover';
import { Check } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { cn } from '../../lib/utils';

export interface ChoiceOption<T extends string | number> {
  value: T;
  label: string;
}

const COLLISION_PADDING_PX = 12;
const PANEL_OFFSET_PX = 8;

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

interface ChoiceOptionRowProps {
  label: string;
  isSelected: boolean;
  isActive: boolean;
  /** Ref callback that lets the list move the focus to this row. */
  optionRef: (node: HTMLLIElement | null) => void;
  onChoose: () => void;
  /** The pointer moved over the row, so it becomes the active one. */
  onActivate: () => void;
}

/** One option of the list. The active row carries the focus (roving tabindex) and the ring; the chosen one is bold. */
function ChoiceOptionRow({ label, isSelected, isActive, optionRef, onChoose, onActivate }: ChoiceOptionRowProps) {
  return (
    <li
      ref={optionRef}
      role="option"
      aria-selected={isSelected}
      tabIndex={isActive ? 0 : -1}
      data-active={isActive}
      className={cn(OPTION_CLASSES, isSelected && 'font-bold')}
      onClick={onChoose}
      onPointerMove={() => {
        if (!isActive) onActivate();
      }}
    >
      <span>{label}</span>
      {isSelected ? <Check aria-hidden="true" className="size-4 shrink-0" /> : null}
    </li>
  );
}

interface ChoiceListProps {
  options: readonly ChoiceOption<string | number>[];
  selectedIndex: number;
  activeIndex: number;
  /** Accessible name of the list. */
  label: string;
  registerOption: (index: number) => (node: HTMLLIElement | null) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  /** The list opened: put the focus on the chosen option. */
  onOpenFocus: () => void;
  onChoose: (index: number) => void;
  onActivate: (index: number) => void;
}

/**
 * The popover panel of a ChoicePill, in a portal: a listbox opened below the trigger, aligned to its start, that
 * flips and shifts to stay 12px inside the screen and scrolls when it is too tall. It sits at z-[100], above the
 * header (z-50) and below the dialog menu (z-[160]). Must be rendered inside a Radix Popover.Root.
 */
export function ChoiceList({
  options,
  selectedIndex,
  activeIndex,
  label,
  registerOption,
  onKeyDown,
  onOpenFocus,
  onChoose,
  onActivate,
}: ChoiceListProps) {
  return (
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
          onOpenFocus();
        }}
      >
        <ul role="listbox" aria-label={label} className={PANEL_CLASSES} onKeyDown={onKeyDown}>
          {options.map((option, index) => (
            <ChoiceOptionRow
              key={option.value}
              label={option.label}
              isSelected={index === selectedIndex}
              isActive={index === activeIndex}
              optionRef={registerOption(index)}
              onChoose={() => onChoose(index)}
              onActivate={() => onActivate(index)}
            />
          ))}
        </ul>
      </Popover.Content>
    </Popover.Portal>
  );
}
