import { describe, expect, it } from 'vitest';
import { amountWidthEm, largestAmountWithDigitsOf } from './amountFit';

// The width in em of "R$ " plus 1 to 9 digits with their dots, measured in Chromium with the real Space Grotesk Bold.
const MEASURED_EM = [1.992, 2.582, 3.172, 4.03, 4.62, 5.21, 6.068, 6.658, 7.248];
const MAX_OVERSHOOT = 1.05;

describe('amountWidthEm', () => {
  it('is never narrower than the measured width of an amount with that many digits', () => {
    MEASURED_EM.forEach((measured, index) => {
      const digits = index + 1;

      expect(amountWidthEm(10 ** (digits - 1)), `${digits} digits`).toBeGreaterThanOrEqual(measured);
    });
  });

  it('is at most 5 percent wider than the measured width, so the number is not shrunk for nothing', () => {
    MEASURED_EM.forEach((measured, index) => {
      const digits = index + 1;

      expect(amountWidthEm(10 ** (digits - 1)), `${digits} digits`).toBeLessThanOrEqual(measured * MAX_OVERSHOOT);
    });
  });

  it('is the same for every amount with the same number of digits, because the figures are tabular', () => {
    expect(amountWidthEm(10000)).toBe(amountWidthEm(99999));
    expect(amountWidthEm(1000000)).toBe(amountWidthEm(9999999));
  });

  it('grows with every digit', () => {
    for (let digits = 1; digits < MEASURED_EM.length; digits += 1) {
      expect(amountWidthEm(10 ** digits)).toBeGreaterThan(amountWidthEm(10 ** (digits - 1)));
    }
  });

  it('treats zero as one digit and rounds to whole reais like the text does', () => {
    expect(amountWidthEm(0)).toBe(amountWidthEm(9));
    expect(amountWidthEm(999.6)).toBe(amountWidthEm(1000));
  });
});

describe('largestAmountWithDigitsOf', () => {
  it('is the biggest amount that has as many digits as the one given', () => {
    expect(largestAmountWithDigitsOf(0)).toBe(9);
    expect(largestAmountWithDigitsOf(7)).toBe(9);
    expect(largestAmountWithDigitsOf(62400)).toBe(99999);
    expect(largestAmountWithDigitsOf(7800000)).toBe(9999999);
  });

  it('rounds to whole reais first', () => {
    expect(largestAmountWithDigitsOf(99.6)).toBe(999);
  });
});
