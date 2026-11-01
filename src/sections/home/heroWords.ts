const ONLY_PUNCTUATION = /^[.,;:!?)]+$/;
// A word this short (an article or "de") looks lost alone at the end of a line.
const SHORT_WORD_MAX_LENGTH = 3;
// A run needs this many words before its first word is bound to the next. Fewer and the last pair rule is enough: a run
// of three bound whole ("Sua equipe perde") would take a whole line on a wide screen and push the next pill down.
const MIN_WORDS_TO_BIND_THE_FIRST = 4;

const joinWords = (words: readonly string[]): string => words.join(' ');

function opensWithWeakWord(word: string): boolean {
  return word.length <= SHORT_WORD_MAX_LENGTH || word.endsWith(',');
}

/**
 * Groups the words of a run of text of the hero sentence into pieces that never part at a line break, so no plain word
 * is left alone on a line (a pill is a wide neighbour: it often pushes the words around it onto a line of their own).
 * Each piece is an inline block of the sentence: it moves to the next line whole, and only when it is wider than the
 * heading itself (a phone at the smallest width with the larger font) does it wrap, at its spaces, never inside a word.
 * The last two words are one piece ("por mês."), and a first word that is short or ends with a comma ("a",
 * "Automatizando,") is bound to the next one when the run has four words or more. Punctuation that opens
 * the run stays a word of its own, because the sentence glues it to the pill before it.
 */
export function groupWords(allWords: readonly string[]): string[] {
  const firstWord = allWords.findIndex((word) => !ONLY_PUNCTUATION.test(word));
  const start = firstWord === -1 ? allWords.length : firstWord;
  const words = allWords.slice(start);
  const count = words.length;
  if (count < 2) return [...allWords];

  const opening = allWords.slice(0, start);
  const isFirstBound = count >= MIN_WORDS_TO_BIND_THE_FIRST && opensWithWeakWord(words[0]);
  const head = isFirstBound ? [joinWords(words.slice(0, 2)), ...words.slice(2, -2)] : words.slice(0, -2);
  return [...opening, ...head, joinWords(words.slice(-2))];
}
