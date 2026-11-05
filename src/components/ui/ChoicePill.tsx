import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { cn } from '../../lib/utils';
import { whenIdle } from '../../lib/whenIdle';
import type { ChoicePillHandoff, ChoicePillProps } from './ChoicePillPopover';
import { PillFace } from './choicePillFace';
import { loadedChoicePopover, preloadChoicePopover } from './choicePopoverLoader';
import { TRIGGER_CLASSES } from './choicePillStyles';

/** The popover chunk is requested after an idle moment, and no later than this, if nothing asked for it sooner. */
const IDLE_LOAD_TIMEOUT_MS = 2000;
const OPEN_KEYS = new Set(['ArrowDown', 'ArrowUp']);
const PRIMARY_BUTTON = 0;
const NOTHING_RECEIVED: ChoicePillHandoff = { isOpen: false, hasFocus: false, isPress: false };

/**
 * A pill that opens a listbox of options, written to be in the entry without the popover behind it.
 * Until the popover chunk has arrived it is a plain button of the same markup and size as the real pill (same classes,
 * aria-haspopup, aria-expanded, data-state). The chunk is requested when the browser is idle, or at once on the first
 * pointer over, press or focus; a press, a click or an arrow key before it arrives is remembered and opens the list as
 * soon as the real pill takes its place, which also keeps the focus the plain one had (a press counts because the swap
 * can come between the press and the release, and then no click would reach the pill). See ChoicePillPopover for the
 * behavior of the list. A chunk that cannot be fetched is asked for once more after a pause (see choicePopoverLoader); if that fails too the plain pill stays and the next click asks again.
 */
export function ChoicePill<T extends string | number>(props: ChoicePillProps<T>) {
  const { value, options, ariaLabel, className } = props;
  const [handoff, setHandoff] = useState<ChoicePillHandoff | null>(loadedChoicePopover() ? NOTHING_RECEIVED : null);
  const wantsOpen = useRef(false);
  const hasFocus = useRef(false);
  const isPressing = useRef(false);

  const load = useCallback(() => {
    preloadChoicePopover().then(
      () => setHandoff({ isOpen: wantsOpen.current, hasFocus: hasFocus.current, isPress: isPressing.current }),
      () => undefined,
    );
  }, []);

  useEffect(() => (handoff === null ? whenIdle(load, IDLE_LOAD_TIMEOUT_MS) : undefined), [handoff, load]);

  const popover = loadedChoicePopover();
  if (handoff !== null && popover) {
    const RealPill = popover.ChoicePillPopover;
    return <RealPill {...props} handoff={handoff} />;
  }

  const label = options.find((option) => option.value === value)?.label ?? options[0]?.label ?? '';
  const askForList = () => {
    wantsOpen.current = true;
    load();
  };
  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button === PRIMARY_BUTTON) {
      wantsOpen.current = true;
      isPressing.current = true;
    }
    load();
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!OPEN_KEYS.has(event.key)) return;
    event.preventDefault();
    askForList();
  };

  return (
    <button
      type="button"
      aria-haspopup="listbox"
      aria-expanded="false"
      aria-label={ariaLabel(label)}
      data-state="closed"
      className={cn(TRIGGER_CLASSES, className)}
      onPointerEnter={load}
      onPointerDown={handlePointerDown}
      onPointerUp={() => {
        isPressing.current = false;
      }}
      onPointerCancel={() => {
        wantsOpen.current = false;
        isPressing.current = false;
      }}
      onFocus={() => {
        hasFocus.current = true;
        load();
      }}
      onBlur={() => {
        hasFocus.current = false;
      }}
      onClick={askForList}
      onKeyDown={handleKeyDown}
    >
      <PillFace label={label} />
    </button>
  );
}
