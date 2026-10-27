export const HOURS_MIN = 1;
export const HOURS_MAX = 80;
export const DEFAULT_HOURS = 12;
/** The "2 a 3 pessoas" option of TEAM_OPTIONS. */
export const DEFAULT_TEAM_INDEX = 1;
/**
 * The largest hourly rate the simulator computes with, the same ceiling the earlier calculator had. It keeps the
 * biggest number (80 hours, more than 10 people, this rate) at 14 characters, so the result panel can always fit it.
 */
export const MAX_HOURLY_RATE = 5000;
const HOURS_SPAN = HOURS_MAX - HOURS_MIN;

/**
 * The hourly rate the field holds, as the number the formula uses. An empty or blank field counts as 0, and so does
 * anything that is not a finite number or is negative (the shared formula sanitizes the same way). A rate above the
 * ceiling is computed at the ceiling. The text in the field is never rewritten: only this computed value is.
 */
export function parseHourlyRate(text: string): number {
  const trimmed = text.trim();
  if (trimmed === '') return 0;

  const rate = Number(trimmed);
  if (!Number.isFinite(rate) || rate < 0) return 0;
  return Math.min(rate, MAX_HOURLY_RATE);
}

/** Where the thumb of the hours slider sits, 0 to 100, which is how much of the track is filled. */
export function hoursPercent(hours: number): number {
  const percent = ((hours - HOURS_MIN)/HOURS_SPAN) * 100;
  return Math.min(100, Math.max(0, percent));
}
