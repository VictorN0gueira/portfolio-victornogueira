import { useCallback, useEffect, useRef, useState, type ButtonHTMLAttributes, type KeyboardEvent, type PointerEvent } from 'react';
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

/** Calls `onEnd` once, when the pointer that is down now goes up or is cancelled, wherever it is released. */
function onPressEnd(onEnd: () => void) {
  const end = () => {
    document.removeEventListener('pointerup', end, true);
    document.removeEventListener('pointercancel', end, true);
    onEnd();
  };
  document.addEventListener('pointerup', end, true);
  document.addEventListener('pointercancel', end, true);
}

/**
 * What the plain pill receives while the chunk is not there, to hand over to the real pill: a request for the list, the
 * focus, and whether the pointer is still down. A press asks for the list too, and counts as in progress until that
 * pointer goes up or is cancelled, wherever it is released (a second press while the first is down changes nothing).
 */
function useRememberedRequest() {
  const wantsOpen = useRef(false);
  const hasFocus = useRef(false);
  const isPressing = useRef(false);

  const read = useCallback(
    (): ChoicePillHandoff => ({ isOpen: wantsOpen.current, hasFocus: hasFocus.current, isPress: isPressing.current }),
    [],
  );
  const ask = useCallback(() => {
    wantsOpen.current = true;
  }, []);
  const forgetAsk = useCallback(() => {
    wantsOpen.current = false;
  }, []);
  const setFocus = useCallback((isFocused: boolean) => {
    hasFocus.current = isFocused;
  }, []);
  const press = useCallback(() => {
    wantsOpen.current = true;
    if (isPressing.current) return;
    isPressing.current = true;
    onPressEnd(() => {
      isPressing.current = false;
    });
  }, []);

  return { read, ask, forgetAsk, setFocus, press };
}

interface PlainPillProps {
  label: string;
  ariaLabel: string;
  className?: string;
  /** The handlers that remember what the visitor does and ask for the chunk. */
  handlers: ButtonHTMLAttributes<HTMLButtonElement>;
}

/** The pill of the entry: the same markup, classes and size as the real one, with nothing of the popover behind it. */
function PlainPill({ label, ariaLabel, className, handlers }: PlainPillProps) {
  return (
    <button
      type="button"
      aria-haspopup="listbox"
      aria-expanded="false"
      aria-label={ariaLabel}
      data-state="closed"
      className={cn(TRIGGER_CLASSES, className)}
      {...handlers}
    >
      <PillFace label={label} />
    </button>
  );
}

type RememberedRequest = ReturnType<typeof useRememberedRequest>;

/** The handlers of the plain pill: each one remembers what the visitor did and asks for the chunk. */
function plainPillHandlers(load: () => void, request: RememberedRequest): ButtonHTMLAttributes<HTMLButtonElement> {
  const { ask, forgetAsk, setFocus, press } = request;
  const askForList = () => {
    ask();
    load();
  };
  return {
    onPointerEnter: load,
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.button === PRIMARY_BUTTON) press();
      load();
    },
    onPointerCancel: forgetAsk,
    onFocus: () => {
      setFocus(true);
      load();
    },
    onBlur: () => setFocus(false),
    onClick: askForList,
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      if (!OPEN_KEYS.has(event.key)) return;
      event.preventDefault();
      askForList();
    },
  };
}

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
  const request = useRememberedRequest();
  const { read } = request;

  const load = useCallback(() => {
    preloadChoicePopover().then(
      () => setHandoff(read()),
      () => undefined,
    );
  }, [read]);

  useEffect(() => (handoff === null ? whenIdle(load, IDLE_LOAD_TIMEOUT_MS) : undefined), [handoff, load]);

  const popover = loadedChoicePopover();
  if (handoff !== null && popover) {
    const RealPill = popover.ChoicePillPopover;
    return <RealPill {...props} handoff={handoff} />;
  }

  const label = options.find((option) => option.value === value)?.label ?? options[0]?.label ?? '';
  return <PlainPill label={label} ariaLabel={ariaLabel(label)} className={className} handlers={plainPillHandlers(load, request)} />;
}
