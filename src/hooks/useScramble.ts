import { useEffect, useState } from 'react';
import { useMotionAllowed } from './useMotionAllowed';

// The title is lowercase by CSS, so the letters that stand in for it are lowercase too.
const SCRAMBLE_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789@#$%&!?';
const ACCENTED_LETTERS = new Set(['ã', 'â', 'á', 'à', 'ê', 'é', 'í', 'ó', 'ô', 'ú', 'ç', 'ñ']);
const START_DELAY_MS = 400;
const TICK_MS = 28;
const LETTERS_PER_TICK = 0.4;

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
 * from the left, ending on the exact text. With reduced motion (the system, or the widget's "Pausar animações") the text is
 * the real one at once and no timer runs, also if the pause comes while the effect is running.
 */
export function useScramble(text: string): string {
  const [display, setDisplay] = useState('');
  const [isActive, setIsActive] = useState(false);
  const isMotionAllowed = useMotionAllowed();

  useEffect(() => {
    if (!isMotionAllowed) return;
    const timer = setTimeout(() => setIsActive(true), START_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text, isMotionAllowed]);

  useEffect(() => {
    if (!isActive || !isMotionAllowed) return;
    let revealed = 0;

    const interval = setInterval(() => {
      setDisplay(scrambled(text, revealed));
      revealed += LETTERS_PER_TICK;
      if (revealed >= text.length) {
        // The last tick above still had a scrambled letter: end on the real text.
        setDisplay(text);
        clearInterval(interval);
      }
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [text, isActive, isMotionAllowed]);

  return isMotionAllowed ? display || text : text;
}
