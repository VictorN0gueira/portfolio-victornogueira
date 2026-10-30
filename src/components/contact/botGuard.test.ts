import { describe, expect, it, vi } from 'vitest';
import { COOLDOWN_MS, MIN_FILL_MS, judgeSubmit, type GuardClock } from './botGuard';

// The test setup turns the time trap and the cooldown off; these tests judge with the real rules.
vi.mock('./botGuard', async (importOriginal) => importOriginal());

const START = 1_000_000;

const clock = (overrides: Partial<GuardClock> = {}): GuardClock => ({
  mountedAt: START,
  firstGestureAt: null,
  lastSentAt: null,
  now: START + 10 * MIN_FILL_MS,
  ...overrides,
});

describe('judgeSubmit', () => {
  it('pins the two numbers', () => {
    expect([MIN_FILL_MS, COOLDOWN_MS]).toEqual([2_000, 30_000]);
  });

  it('sends a calm submit', () => {
    expect(judgeSubmit('', clock())).toBe('send');
  });

  it('calls a filled honeypot a bot, whatever the clock says', () => {
    expect(judgeSubmit('x', clock())).toBe('bot');
    expect(judgeSubmit(' ', clock({ firstGestureAt: START, lastSentAt: START }))).toBe('bot');
  });

  it('starts the time trap clock at the first gesture when there was one, at the mount when there was none', () => {
    const gesture = START + 5_000;
    expect(judgeSubmit('', clock({ firstGestureAt: gesture, now: gesture + MIN_FILL_MS - 1 }))).toBe('bot');
    expect(judgeSubmit('', clock({ firstGestureAt: gesture, now: gesture + MIN_FILL_MS }))).toBe('send');
    expect(judgeSubmit('', clock({ now: START + MIN_FILL_MS - 1 }))).toBe('bot');
    expect(judgeSubmit('', clock({ now: START + MIN_FILL_MS }))).toBe('send');
  });

  it('holds a send that comes less than 30 seconds after the last one that worked', () => {
    const sent = START + 3_000;
    expect(judgeSubmit('', clock({ lastSentAt: sent, now: sent + COOLDOWN_MS - 1 }))).toBe('cooldown');
    expect(judgeSubmit('', clock({ lastSentAt: sent, now: sent + COOLDOWN_MS }))).toBe('send');
  });
});
