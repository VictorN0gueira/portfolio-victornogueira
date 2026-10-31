import * as Popover from '@radix-ui/react-popover';
import { Check } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { cn } from '../../lib/utils';
import {
  COLLISION_PADDING,
  OPTION_CLASSES,
  PANEL_CLASSES,
  PANEL_OFFSET_PX,
  type ChoiceTone,
} from './choiceListStyles';

export type { ChoiceTone } from './choiceListStyles';

export interface ChoiceOption<T extends string | number> {
  value: T;
  label: string;
}

interface ChoiceOptionRowProps {
  tone: ChoiceTone;
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
function ChoiceOptionRow({ tone, label, isSelected, isActive, optionRef, onChoose, onActivate }: ChoiceOptionRowProps) {
  return (
    // The keys of the list are handled once, on the listbox (useListboxNavigation): a click here is the pointer's way in.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <li
      ref={optionRef}
      role="option"
      aria-selected={isSelected}
      tabIndex={isActive ? 0 : -1}
      data-active={isActive}
      className={cn(OPTION_CLASSES[tone], isSelected && 'font-bold')}
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
  /** The list closed: the focus goes back to the trigger unless this prevents it. */
  onCloseAutoFocus?: (event: Event) => void;
  /** The surface the list sits on; `dark` is as wide as its trigger. Default `light`. */
  tone?: ChoiceTone;
  /** Where the list is rendered. Default is the body; the contact form keeps it inside the form. */
  portalContainer?: HTMLElement | null;
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
  onCloseAutoFocus,
  tone = 'light',
  portalContainer,
}: ChoiceListProps) {
  return (
    <Popover.Portal container={portalContainer}>
      <Popover.Content
        asChild
        side="bottom"
        align="start"
        sideOffset={PANEL_OFFSET_PX}
        collisionPadding={COLLISION_PADDING[tone]}
        avoidCollisions
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          onOpenFocus();
        }}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <ul role="listbox" aria-label={label} className={PANEL_CLASSES[tone]} onKeyDown={onKeyDown}>
          {options.map((option, index) => (
            <ChoiceOptionRow
              key={option.value}
              tone={tone}
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
