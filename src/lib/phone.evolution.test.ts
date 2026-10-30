import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { EIGHT_DIGIT_PARTS, VALID_DDDS, expectedEvolution } from '../test/phoneCorpus';
import { toEvolutionFormat, toLocalDigits } from './phone';

// The value the lead channel sends for a number must not move. This table was run on phone.ts BEFORE the typing fix and
// its outputs are pinned by hash; it must pass unchanged after it. Every number is also compared with a value built
// by hand, so the pin is not only "the same as before" but also "what the channel documents": 55, DDD, eight digits.

/** The ways the same number reaches the formatter: bare, with the mobile 9, punctuated, with the +55 display, with 55. */
function shapesOf(ddd: string, part: string): string[] {
  const local11 = `${ddd}9${part}`;
  const local10 = `${ddd}${part}`;
  return [
    local11,
    local10,
    `(${ddd}) 9${part.slice(0, 4)}-${part.slice(4)}`,
    `+55 ${ddd} 9 ${part.slice(0, 4)}-${part.slice(4)}`,
    `+55${local11}`,
    `55${local11}`,
    `+55 ${local10}`,
    `55${local10}`,
  ];
}

const corpus = VALID_DDDS.flatMap((ddd) => EIGHT_DIGIT_PARTS.flatMap((part) => shapesOf(ddd, part).map((raw) => ({ ddd, part, raw }))));

// toEvolutionFormat and toLocalDigits over the whole corpus, joined, from the code before the typing fix.
const PINNED_SHA256 = '2cf22e3c720ef8f12c334b8df3087bc6eb05e67f317d99b19e227f8c186faf48';

describe('toEvolutionFormat over a generated table', () => {
  it('has a big corpus', () => {
    expect(VALID_DDDS).toHaveLength(67);
    expect(corpus.length).toBeGreaterThan(50_000);
  });

  it('sends 55, the DDD and the eight digits for every shape of every number (DDD 55 included)', () => {
    const wrong = corpus.filter(({ ddd, part, raw }) => toEvolutionFormat(raw) !== expectedEvolution(ddd, part)).map(({ raw }) => raw);

    expect(wrong).toEqual([]);
  });

  it('gives exactly the outputs it gave before the fix (pinned by hash)', () => {
    const hash = createHash('sha256');
    for (const { raw } of corpus) hash.update(`${raw}|${toLocalDigits(raw)}|${toEvolutionFormat(raw)}\n`);

    const hex = hash.digest('hex');
    expect(hex).toBe(PINNED_SHA256);
  });
});
