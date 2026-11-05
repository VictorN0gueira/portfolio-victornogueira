import { useEffect, useState } from 'react';
import { useMotionAllowed } from './useMotionAllowed';

// The title is lowercase by CSS, so the letters that stand in for it are lowercase too.
const SCRAMBLE_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789@#$%&!?';
const ACCENTED_LETTERS = new Set(['ã', 'â', 'á', 'à', 'ê', 'é', 'í', 'ó', 'ô', 'ú', 'ç', 'ñ']);
const START_DELAY_MS = 400;
const TICK_MS = 28;
const LETTERS_PER_TICK = 0.4;

type Phase = 'waiting' | 'running' | 'settled';

interface Run {
  /** The text this run is about: a run of another text is a run that did not start. */
  text: string;
  phase: Phase;
  frame: string;
}

interface Scramble {
  /** The text to draw: the real one, or a frame of the scramble while `isScrambling`. */
  shown: string;
  isScrambling: boolean;
}

function scrambled(text: string, revealed: number): string {
  return text
    .split('')
    .map((char, index) => {
      if (char === ' ') return ' ';
      if (ACCENTED_LETTERS.has(char.toLowerCase())) return char;
      if (index < Math.floor(revealed)) return text[index];
      return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
    })
    .join('');
}

/**
 * The text as it is typed on a terminal: after a short wait the letters are swapped for stand ins and the real ones settle
 * from the left, ending on the exact text. The hook only says what to draw: the real text stays the one the page is made of
 * (see NotFound), and a frame is a picture of it.
 *
 * With reduced motion (the system, or the widget's "Pausar animações") the real text is shown and no timer runs. A pause in
 * the middle drops the run: resuming waits again and starts over. A title that already settled stays as it is. A new text
 * starts a new run.
 */
export function useScramble(text: string): Scramble {
  const [run, setRun] = useState<Run>({ text, phase: 'waiting', frame: '' });
  const isMotionAllowed = useMotionAllowed();
  const phase = run.text === text ? run.phase : 'waiting';

  useEffect(() => {
    if (!isMotionAllowed || phase !== 'waiting') return;
    const timer = setTimeout(() => setRun({ text, phase: 'running', frame: '' }), START_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text, phase, isMotionAllowed]);

  useEffect(() => {
    if (!isMotionAllowed || phase !== 'running') return;
    let revealed = 0;
    let isFinished = false;

    const interval = setInterval(() => {
      revealed += LETTERS_PER_TICK;
      if (revealed >= text.length) {
        // The last tick still had a scrambled letter: end on the real text.
        isFinished = true;
        clearInterval(interval);
        setRun({ text, phase: 'settled', frame: '' });
        return;
      }
      setRun({ text, phase: 'running', frame: scrambled(text, revealed) });
    }, TICK_MS);

    return () => {
      clearInterval(interval);
      // Cut short by a pause or a new text: the run is dropped, a later start waits again.
      if (!isFinished) setRun((current) => (current.text === text ? { text, phase: 'waiting', frame: '' } : current));
    };
  }, [text, phase, isMotionAllowed]);

  const isScrambling = isMotionAllowed && phase === 'running' && run.frame !== '';
  return { shown: isScrambling ? run.frame : text, isScrambling };
}
