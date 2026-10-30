import { Fragment } from 'react';

/**
 * A project title where a hyphenated word (Link-in-Bio) never breaks at its hyphens, so it cannot leave "Bio" alone on
 * a line. The text stays as it is for assistive technology and for search: only a no-wrap span is added.
 */
export default function ProjectTitle({ title }: { title: string }) {
  const words = title.split(' ');

  return (
    <>
      {words.map((word, index) => (
        <Fragment key={`${word}-${index}`}>
          {index > 0 && ' '}
          {word.includes('-') ? <span className="whitespace-nowrap">{word}</span> : word}
        </Fragment>
      ))}
    </>
  );
}
