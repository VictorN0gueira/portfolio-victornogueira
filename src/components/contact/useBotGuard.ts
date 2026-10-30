import { useRef, useState } from 'react';
import { COOLDOWN_MESSAGE, judgeSubmit, type SubmitVerdict } from './botGuard';

/**
 * The state behind the honeypot, the time trap and the cooldown (see botGuard.ts for what each one does).
 * The clock readings live in refs: they change no screen, so they must not cause a render.
 */
export function useBotGuard() {
  const [honeypot, setHoneypot] = useState('');
  const [mountedAt] = useState(() => Date.now());
  // The friendly line shown when the cooldown holds a send back; any edit of the form takes it away.
  const [notice, setNotice] = useState<string | undefined>(undefined);
  const firstGestureAt = useRef<number | null>(null);
  const lastSentAt = useRef<number | null>(null);

  /** The first keyboard or pointer gesture on the fields starts the time trap clock; later gestures change nothing. */
  const markInteraction = () => {
    firstGestureAt.current ??= Date.now();
  };

  /**
   * Asked once the form passed validation: send it, treat it as a bot, or hold it for the cooldown.
   * It also puts up (or takes away) the cooldown line.
   */
  const judge = (): SubmitVerdict => {
    const verdict = judgeSubmit(honeypot, {
      mountedAt,
      firstGestureAt: firstGestureAt.current,
      lastSentAt: lastSentAt.current,
      now: Date.now(),
    });
    setNotice(verdict === 'cooldown' ? COOLDOWN_MESSAGE : undefined);
    return verdict;
  };

  /** A send worked: the cooldown starts now. */
  const recordSent = () => {
    lastSentAt.current = Date.now();
  };

  const clearNotice = () => setNotice(undefined);

  return { honeypot, setHoneypot, notice, markInteraction, judge, recordSent, clearNotice };
}
