import type { RateIssue } from './roiFeedbackCopy';

export const HOURS_MIN = 1;
export const HOURS_MAX = 80;
export const DEFAULT_HOURS = 12;
/** The "2 a 3 pessoas" option of TEAM_OPTIONS. */
export const DEFAULT_TEAM_INDEX = 1;
/**
 * The largest hourly rate the simulator computes with, the max the earlier calculator's field advertised. It keeps the
 * biggest number (80 hours, more than 10 people, this rate) at 14 characters, so the result panel can always fit it.
 * A rate above it is counted at it, and the simulator says so (see isHourlyRateCapped).
 */
export const MAX_HOURLY_RATE = 5000;
const HOURS_SPAN = HOURS_MAX - HOURS_MIN;

/** The number the text of the field writes: blank is 0 and anything unreadable is NaN, with no limit applied yet. */
function readRate(text: string): number {
  const trimmed = text.trim();
  return trimmed === '' ? 0 : Number(trimmed);
}

/**
 * The hourly rate the field holds, as the number the formula uses. An empty or blank field counts as 0, and so does
 * anything that is not a finite number or is negative (the shared formula sanitizes the same way). A rate above the
 * ceiling is computed at the ceiling. The text in the field is never rewritten: only this computed value is.
 */
export function parseHourlyRate(text: string): number {
  const rate = readRate(text);
  if (!Number.isFinite(rate) || rate < 0) return 0;
  return Math.min(rate, MAX_HOURLY_RATE);
}

/**
 * True when the text is a finite rate above the ceiling, so it is counted at the ceiling and the visitor must be told.
 * Text that is not finite (for example an exponent that overflows) is a plain 0 and gets no note.
 */
export function isHourlyRateCapped(text: string): boolean {
  const rate = readRate(text);
  return Number.isFinite(rate) && rate > MAX_HOURLY_RATE;
}

/** Where the thumb of the hours slider sits, 0 to 100, which is how much of the track is filled. */
export function hoursPercent(hours: number): number {
  const percent = ((hours - HOURS_MIN) / HOURS_SPAN) * 100;
  return Math.min(100, Math.max(0, percent));
}

/**
 * What is wrong with the text of the hourly rate, or null when it is usable. A negative rate and a number that is not
 * finite (an exponent that overflows) both count as R$ 0 in the formula, so the visitor is told instead of left to wonder.
 * An empty field is not an issue: it is a plain R$ 0, and a rate above the ceiling has its own note (isHourlyRateCapped).
 */
export function rateIssue(text: string): RateIssue | null {
  const rate = readRate(text);
  if (rate < 0) return 'negative';
  return Number.isFinite(rate) ? null : 'unreadable';
}
