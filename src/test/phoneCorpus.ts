/**
 * A generated corpus of Brazilian numbers for the phone tests: every valid DDD with eight digit parts that cover the
 * shapes that matter (each first digit 2 to 9, the nines and repeated digits that the formatter once swallowed, and a
 * seeded pseudo random tail). Deterministic: the same list on every run, so a pinned hash of its outputs means something.
 */

/** The DDDs in use in Brazil (ANATEL), 67 of them. */
export const VALID_DDDS: readonly string[] = [
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24', '27', '28',
  '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48', '49',
  '51', '53', '54', '55',
  '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79',
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  '91', '92', '93', '94', '95', '96', '97', '98', '99',
];

const SEED = 20261029;
const RANDOM_PARTS_PER_FIRST_DIGIT = 10;

/** A tiny seeded generator (mulberry32): no Math.random, so the corpus never changes between runs. */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildEightDigitParts(): string[] {
  const random = seededRandom(SEED);
  const fixed = [
    '99999999', '99998888', '99990000', '98888888', '90000000', '91234567', '99999998', '99999989',
    '99899999', '99989999', '98999999', '90909090', '99009900', '98765432', '32221234', '88884444',
    '21111111', '30000000', '45678901', '50505050', '60000001', '70000009', '80000000', '84451243',
  ];
  const parts = new Set<string>(fixed);
  for (const first of '23456789') {
    for (let index = 0; index < RANDOM_PARTS_PER_FIRST_DIGIT; index += 1) {
      parts.add(`${first}${Math.floor(random() * 10_000_000).toString().padStart(7, '0')}`);
    }
  }
  return [...parts];
}

/** Eight digit parts: 24 fixed ones and 80 seeded ones (about 100 after the duplicates). */
export const EIGHT_DIGIT_PARTS: readonly string[] = buildEightDigitParts();

/** DDD 55 is the one that can be mistaken for the country code, so every shape is also tried on it. */
export const DDDS_FOR_REAL_INPUT: readonly string[] = ['11', '21', '51', '55', '81', '99'];

/** The display a complete number has, built by hand: +55 DD 9 NNNN-NNNN. */
export const expectedDisplay = (ddd: string, part: string): string => `+55 ${ddd} 9 ${part.slice(0, 4)}-${part.slice(4)}`;

/** The value the lead channel gets: 55, the DDD and the eight digits (the mobile 9 is not sent). */
export const expectedEvolution = (ddd: string, part: string): string => `55${ddd}${part}`;
