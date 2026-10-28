import { describe, expect, it } from 'vitest';
import { formatWhatsappDisplay, toEvolutionFormat } from '../../lib/phone';
import { readPastedNumber } from './pastedNumber';

// A structural proof, not a list of examples. Every way a country coded number can be written with separators, over the
// pure function AND through the paste path of the field (the formatter and toEvolutionFormat, the functions the payload is
// built with), with the invariant that ended the whack-a-mole of the heuristics:
//
//   the result is ALWAYS either the number that was meant, or `ignore` (the field is left untouched).
//   NEVER a different valid looking number, NEVER a partial one.
//
// The generation is deterministic (no random) and built from code points: this source holds no invisible or typographic
// character, not even as an escape.

const char = (codePoint: number): string => String.fromCodePoint(codePoint);

// The separators of the grammar: a plain space, hyphen and slash, the typographic dashes U+2010 to U+2015, the minus sign
// U+2212, the no break space U+00A0, the thin space U+2009 and the tab.
const SEPARATORS = [
  ' ', '-', '/', char(0x2010), char(0x2011), char(0x2012), char(0x2013), char(0x2014), char(0x2015), char(0x2212),
  char(0x00a0), char(0x2009), '\t',
];
// Each separator bare ("55-11") and with spaces around it ("55 - 11"): 26 ways to join two groups.
const JOINERS = SEPARATORS.flatMap((separator) => [separator, ` ${separator} `]);

const DIGIT_STRINGS = ['5511900000000', '5511322212345'];
const LABELS = ['', 'Tel: ', 'Tel '];
// A plus, a double zero for the plus, a plus with a space, or nothing.
const LEADS = ['', '+', '00', '+ '];
// What may follow the number: nothing, or one extra group of 1 to 4 digits after a spaced separator.
const TRAILERS = ['', ' - 1', ' / 12', ` ${char(0x2013)} 123`, ` ${char(0x2212)} 1234`];

/** Every way to split `digits` into `groups` non empty parts, in order. */
function compositions(digits: string, groups: number): string[][] {
  if (groups === 1) return [[digits]];
  const out: string[][] = [];
  for (let cut = 1; cut <= digits.length - (groups - 1); cut += 1) {
    for (const rest of compositions(digits.slice(cut), groups - 1)) out.push([digits.slice(0, cut), ...rest]);
  }
  return out;
}

const ALL_COMPOSITIONS = new Map(DIGIT_STRINGS.map((digits) => [digits, [1, 2, 3, 4].flatMap((groups) => compositions(digits, groups))]));

/** The groups joined by the same joiner everywhere, or by a different one at every gap (a deterministic rotation). */
function join(groups: string[], plan: number, isMixed: boolean): string {
  return groups.reduce((text, group, index) => {
    if (index === 0) return group;
    const joiner = isMixed ? JOINERS[(plan + index * 7) % JOINERS.length] : JOINERS[plan % JOINERS.length];
    return text + joiner + group;
  }, '');
}

/** What the field would end up sending for `pasted`, or IGNORED when the paste leaves the field untouched. */
const IGNORED = 'ignored';
function sentFor(pasted: string): string {
  const read = readPastedNumber(pasted);
  if (read.action === 'ignore') return IGNORED;
  // The page handles `replace` itself: the field is set from the text through the formatter.
  if (read.action === 'replace') return toEvolutionFormat(formatWhatsappDisplay(read.text));
  // `default` is the browser: the text lands behind the "+55 " of the empty field and the formatter reads the whole value.
  return toEvolutionFormat(formatWhatsappDisplay(`+55 ${pasted}`));
}

const meant = (digits: string): string => toEvolutionFormat(formatWhatsappDisplay(`+${digits}`));

interface Case {
  text: string;
  digits: string;
  hasTrailer: boolean;
}

/** Every case of the grammar. The cross of compositions and joiners is full; the other axes rotate with the case index. */
function* grammar(): Generator<Case> {
  let counter = 0;
  for (const digits of DIGIT_STRINGS) {
    for (const groups of ALL_COMPOSITIONS.get(digits) ?? []) {
      for (let plan = 0; plan < JOINERS.length; plan += 1) {
        for (const isMixed of groups.length > 2 ? [false, true] : [false]) {
          const body = join(groups, plan, isMixed);
          for (const lead of LEADS) {
            counter += 1;
            const label = LABELS[counter % LABELS.length];
            const trailer = TRAILERS[(counter >> 2) % TRAILERS.length];
            yield { text: `${label}${lead}${body}${trailer}`, digits, hasTrailer: trailer !== '' };
          }
        }
      }
    }
  }
}

describe('the separator grammar of a country coded number', () => {
  it('generates the cases: every grouping of two numbers into 1 to 4 groups, 26 joiners, 4 leads', () => {
    const cases = [...grammar()];

    // 299 groupings per number: 1 + 12 + 66 + 220. Groupings of 3 and 4 groups also run with mixed joiners.
    expect(ALL_COMPOSITIONS.get(DIGIT_STRINGS[0])).toHaveLength(299);
    expect(cases).toHaveLength(121_680);
  });

  it('always gives the number that was meant or leaves the field untouched, never another or a partial one', () => {
    const wrong: string[] = [];
    let counted = 0;
    let replaced = 0;

    for (const { text, digits } of grammar()) {
      counted += 1;
      const sent = sentFor(text);
      if (sent === IGNORED) continue;
      if (sent === meant(digits)) replaced += 1;
      else if (wrong.length < 12) wrong.push(`${JSON.stringify(text)} gave ${sent}, meant ${meant(digits)}`);
    }

    expect(wrong).toEqual([]);
    // The check is not vacuous: plenty of the cases are applied (the numbers with no spaced separator), the rest ignored.
    expect(replaced).toBe(10_402);
    expect(counted).toBe(121_680);
  });

  it('with a trailing group after a spaced separator, gives the number that was meant or leaves the field untouched', () => {
    const wrong: string[] = [];

    for (const { text, digits, hasTrailer } of grammar()) {
      if (!hasTrailer) continue;
      const sent = sentFor(text);
      if (sent !== IGNORED && sent !== meant(digits)) wrong.push(`${JSON.stringify(text)} gave ${sent}`);
      if (wrong.length >= 12) break;
    }

    expect(wrong).toEqual([]);
  });

  it('applies a number written with no spaced separator, whatever the separator, the label or the lead', () => {
    const notApplied: string[] = [];

    for (const digits of DIGIT_STRINGS) {
      for (const groups of ALL_COMPOSITIONS.get(digits) ?? []) {
        for (const separator of SEPARATORS) {
          // Spaces around a separator are the ambiguous case; a bare separator (or a plain space) is one number.
          for (const lead of ['+', '00', '']) {
            const text = `Tel: ${lead}${groups.join(separator)}`;
            if (sentFor(text) !== meant(digits)) notApplied.push(text);
          }
        }
      }
    }

    expect(notApplied).toEqual([]);
  });
});
