import { Fragment } from 'react';

interface NoBreakHyphensProps {
  text: string;
}

/**
 * A text where a hyphenated word ("e-mail", "Link-in-Bio") never breaks at its hyphen: it would leave "e-" at the end of
 * a line and "mail" at the start of the next one on a narrow screen. The word goes in a no-wrap span, with the punctuation
 * that sticks to it. It is not a non-breaking hyphen character: the brand fonts may lack that glyph. The text stays as it
 * is for assistive technology and for search.
 */
export function NoBreakHyphens({ text }: NoBreakHyphensProps) {
  const words = text.split(' ');

  return (
    <>
      {words.map((word, index) => (
        <Fragment key={`${index}-${word}`}>
          {index > 0 && ' '}
          {word.includes('-') ? <span className="whitespace-nowrap">{word}</span> : word}
        </Fragment>
      ))}
    </>
  );
}
