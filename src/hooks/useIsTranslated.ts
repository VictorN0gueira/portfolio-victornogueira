import { useSyncExternalStore } from 'react';

// The page is written in Portuguese (index.html: lang="pt-BR"). A translator changes the language of the root, and
// the one of Google adds a class that starts with "translated-" (translated-ltr, translated-rtl).
const PAGE_LANGUAGE = 'pt';
const TRANSLATED_CLASS = /(^|\s)translated-/;
const WATCHED_ATTRIBUTES = ['class', 'lang'];

function getSnapshot(): boolean {
  const root = document.documentElement;
  const language = root.lang.trim().toLowerCase().split('-')[0];
  return TRANSLATED_CLASS.test(root.className) || (language !== '' && language !== PAGE_LANGUAGE);
}

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: WATCHED_ATTRIBUTES });
  return () => observer.disconnect();
}

const getServerSnapshot = (): boolean => false;

/**
 * Whether a browser translator is working on the page. It rewrites the text nodes, so anything drawn over them (like
 * the scramble of the 404 title) would show jumbled words in the language of the visitor. Live: it follows the root.
 */
export function useIsTranslated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
