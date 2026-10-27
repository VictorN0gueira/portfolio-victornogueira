import { useEffect, useRef } from 'react';

// How long a typed prefix stays alive, so "fo" finds "follow-up" but a pause starts a new search.
const TYPEAHEAD_RESET_MS = 600;

/**
 * Index of the label a typed prefix points to, or -1. A single character (or the same character repeated)
 * starts looking after the active option, so pressing "a" again moves to the next label that starts with "a".
 * A longer prefix starts at the active option, which may already match.
 */
export function findTypeaheadMatch(labels: readonly string[], typed: string, activeIndex: number): number {
  const isRepeat = [...typed].every((character) => character === typed[0]);
  const query = isRepeat ? typed[0] : typed;
  const start = isRepeat ? activeIndex + 1 : activeIndex;

  for (let offset = 0; offset < labels.length; offset += 1) {
    const index = (start + offset) % labels.length;
    if (labels[index].toLowerCase().startsWith(query)) return index;
  }
  return -1;
}

/** True for a key that types a character: one character long and not part of a shortcut. */
export function isPrintableKey(event: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean }): boolean {
  return event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
}

/**
 * Type-ahead for a list: characters typed within 600ms of each other build a prefix, and the first label that
 * starts with it is reported to `onMatch`. `isTyping` tells whether a prefix is alive, so a space typed in the
 * middle of a word is part of it instead of a choice. The timer is cleared when the component unmounts.
 */
export function useTypeahead(labels: readonly string[], activeIndex: number, onMatch: (index: number) => void) {
  const buffer = useRef({ text: '', timer: 0 });

  useEffect(() => {
    const state = buffer.current;
    return () => window.clearTimeout(state.timer);
  }, []);

  const type = (character: string) => {
    const state = buffer.current;
    window.clearTimeout(state.timer);
    state.text += character.toLowerCase();
    state.timer = window.setTimeout(() => {
      state.text = '';
    }, TYPEAHEAD_RESET_MS);

    const match = findTypeaheadMatch(labels, state.text, activeIndex);
    if (match >= 0) onMatch(match);
  };

  const isTyping = () => buffer.current.text !== '';

  return { type, isTyping };
}
