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

  it('sends a calm submit with no wait', () => {
    expect(judgeSubmit('', clock())).toEqual({ action: 'send', waitMs: 0 });
  });

  it('calls a filled honeypot a bot, whatever the clock says', () => {
    expect(judgeSubmit('x', clock())).toEqual({ action: 'bot' });
    expect(judgeSubmit(' ', clock({ firstGestureAt: START, lastSentAt: START }))).toEqual({ action: 'bot' });
  });

  it('never drops a fast submit: it sends it after the rest of the 2 seconds', () => {
    const gesture = START + 5_000;
    expect(judgeSubmit('', clock({ firstGestureAt: gesture, now: gesture }))).toEqual({ action: 'send', waitMs: 2_000 });
    expect(judgeSubmit('', clock({ firstGestureAt: gesture, now: gesture + MIN_FILL_MS - 1 }))).toEqual({
      action: 'send',
      waitMs: 1,
    });
    expect(judgeSubmit('', clock({ firstGestureAt: gesture, now: gesture + MIN_FILL_MS }))).toEqual({
      action: 'send',
      waitMs: 0,
    });
  });

  it('starts the clock at the mount for a visitor with no gesture', () => {
    expect(judgeSubmit('', clock({ now: START + 500 }))).toEqual({ action: 'send', waitMs: 1_500 });
    expect(judgeSubmit('', clock({ now: START + MIN_FILL_MS }))).toEqual({ action: 'send', waitMs: 0 });
  });

  it('holds a send that comes less than 30 seconds after the last one that worked', () => {
    const sent = START + 3_000;
    expect(judgeSubmit('', clock({ lastSentAt: sent, now: sent + COOLDOWN_MS - 1 }))).toEqual({ action: 'cooldown' });
    expect(judgeSubmit('', clock({ lastSentAt: sent, now: sent + COOLDOWN_MS }))).toEqual({ action: 'send', waitMs: 0 });
  });
});
