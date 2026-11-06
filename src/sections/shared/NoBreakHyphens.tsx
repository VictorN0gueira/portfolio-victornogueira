import { Fragment } from 'react';

interface NoBreakHyphensProps {
  text: string;
}

/**
 * The longest word, punctuation included, that is kept whole. A no-wrap span has no width bound, so a longer hyphenated
 * word (a slug, a compound name) would run past the edge of a 280px screen: it is left to wrap at its hyphens like any text.
 */
export const MAX_NOWRAP_WORD_LENGTH = 16;

// A hyphen between two letters or digits ("e-mail", "98445-1243", "COVID-19"). A lone "-" or one at the edge of a word
// ("pré-") has nothing to keep together.
const INNER_HYPHEN = /[\p{L}\p{N}]-[\p{L}\p{N}]/u;
const WHITE_SPACE = /(\s+)/;

function isKeptWhole(word: string): boolean {
  return word.length <= MAX_NOWRAP_WORD_LENGTH && INNER_HYPHEN.test(word);
}

/**
 * A text where a hyphenated word ("e-mail", "Link-in-Bio") never breaks at its hyphen: it would leave "e-" at the end of
 * a line and "mail" at the start of the next one on a narrow screen. The word goes in a no-wrap span, with the punctuation
 * that sticks to it. It is not a non-breaking hyphen character: the brand fonts may lack that glyph. The text is split on
 * any white space and every separator is kept, so the text stays as it is for assistive technology and for search.
 */
export function NoBreakHyphens({ text }: NoBreakHyphensProps) {
  const parts = text.split(WHITE_SPACE);

  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={`${index}-${part}`}>
          {isKeptWhole(part) ? <span className="whitespace-nowrap">{part}</span> : part}
        </Fragment>
      ))}
    </>
  );
}
