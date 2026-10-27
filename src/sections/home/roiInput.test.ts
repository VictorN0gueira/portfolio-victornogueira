import { describe, expect, it } from 'vitest';
import { DEFAULT_HOURLY_RATE, TEAM_OPTIONS } from '../../lib/roi';
import {
  DEFAULT_HOURS,
  DEFAULT_TEAM_INDEX,
  HOURS_MAX,
  HOURS_MIN,
  MAX_HOURLY_RATE,
  hoursPercent,
  isHourlyRateCapped,
  parseHourlyRate,
} from './roiInput';

describe('simulator defaults', () => {
  it('starts at 12 hours, the 2 to 3 people option and the shared default rate', () => {
    expect(DEFAULT_HOURS).toBe(12);
    expect(TEAM_OPTIONS[DEFAULT_TEAM_INDEX].label).toBe('2 a 3 pessoas');
    expect(DEFAULT_HOURLY_RATE).toBe(50);
  });

  it('slides from 1 to 80 hours', () => {
    expect(HOURS_MIN).toBe(1);
    expect(HOURS_MAX).toBe(80);
  });
});

describe('parseHourlyRate', () => {
  it('reads a plain number', () => {
    expect(parseHourlyRate('50')).toBe(50);
    expect(parseHourlyRate('12.5')).toBe(12.5);
    expect(parseHourlyRate('0')).toBe(0);
  });

  it('reads leading zeros, an exponent and a plus sign as the number they write', () => {
    expect(parseHourlyRate('0050')).toBe(50);
    expect(parseHourlyRate('5e2')).toBe(500);
    expect(parseHourlyRate('+5')).toBe(5);
  });

  it('counts an empty or blank field as 0', () => {
    expect(parseHourlyRate('')).toBe(0);
    expect(parseHourlyRate('   ')).toBe(0);
  });

  it('counts a negative rate as 0', () => {
    expect(parseHourlyRate('-5')).toBe(0);
    expect(parseHourlyRate('-0.01')).toBe(0);
  });

  it('counts anything that is not a finite number as 0, never NaN', () => {
    for (const text of ['abc', '1e999', '-1e999', 'Infinity', 'NaN', '12,5']) {
      expect(parseHourlyRate(text)).toBe(0);
    }
  });

  it('caps an absurd rate at the largest one the simulator draws', () => {
    expect(parseHourlyRate(String(MAX_HOURLY_RATE))).toBe(MAX_HOURLY_RATE);
    expect(parseHourlyRate(String(MAX_HOURLY_RATE + 1))).toBe(MAX_HOURLY_RATE);
    expect(parseHourlyRate('1e300')).toBe(MAX_HOURLY_RATE);
  });
});

describe('isHourlyRateCapped', () => {
  it('is true for a finite rate above the ceiling', () => {
    for (const text of ['5000.01', '6000', '1e300', '99999999999']) {
      expect(isHourlyRateCapped(text), text).toBe(true);
    }
  });

  it('is false at the ceiling and below it', () => {
    for (const text of ['5000', '4999.99', '50', '0']) {
      expect(isHourlyRateCapped(text), text).toBe(false);
    }
  });

  it('is false for text that counts as a plain 0: infinity, negative, empty and not a number', () => {
    for (const text of ['1e999', '-1', '-1e999', '', '   ', 'abc', 'NaN']) {
      expect(isHourlyRateCapped(text), text).toBe(false);
    }
  });

  it('agrees with parseHourlyRate: capped text parses to the ceiling', () => {
    expect(parseHourlyRate('6000')).toBe(MAX_HOURLY_RATE);
    expect(isHourlyRateCapped('6000')).toBe(true);
  });
});

describe('hoursPercent', () => {
  it('maps the ends of the slider to 0 and 100 percent', () => {
    expect(hoursPercent(HOURS_MIN)).toBe(0);
    expect(hoursPercent(HOURS_MAX)).toBe(100);
  });

  it('is proportional in between', () => {
    expect(hoursPercent(40.5)).toBeCloseTo(50, 5);
  });

  it('stays inside 0 to 100 for a value outside the slider', () => {
    expect(hoursPercent(0)).toBe(0);
    expect(hoursPercent(500)).toBe(100);
  });
});
