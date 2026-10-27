// Widths measured in Chromium with the real Space Grotesk Bold, tracking -0.03em and tabular figures: "R$ " is 1.402em,
// a digit 0.59em and a dot 0.268em. Every amount with the same number of digits is as wide as the others (tabular).
const PREFIX_EM = 1.402;
const DIGIT_EM = 0.59;
const DOT_EM = 0.268;
const DIGITS_PER_GROUP = 3;
// A little room on top of the measured width, so a different rounding of the glyphs never overflows the box.
const FIT_MARGIN = 1.03;

/** The width, in em, that an amount written like formatBRL does (whole reais), with a margin of 3%. */
export function amountWidthEm(amount: number): number {
  const digits = String(Math.round(amount)).length;
  const dots = Math.floor((digits - 1) / DIGITS_PER_GROUP);
  return (PREFIX_EM + digits * DIGIT_EM + dots * DOT_EM) * FIT_MARGIN;
}

/** The biggest amount that has as many digits as this one, for example 99.999 for 62.400. */
export const largestAmountWithDigitsOf = (amount: number): number => 10 ** String(Math.round(amount)).length - 1;
