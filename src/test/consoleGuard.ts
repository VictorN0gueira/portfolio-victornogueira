import { afterEach, beforeEach, expect, vi, type MockInstance } from 'vitest';

export type GuardedConsoleMethod = 'error' | 'warn';

const DEFAULT_METHODS: readonly GuardedConsoleMethod[] = ['error', 'warn'];

/**
 * Keeps a test file's output pristine: call it once at the top of the file (or of a describe) and every test in that
 * scope fails if the code under test writes to console.error or console.warn (an act() warning, a Radix missing title
 * or description warning, a React key warning). The console methods are replaced by silent spies before each test and
 * always restored after it, even when the assertion fails, so one failure cannot leak a spy into the next test.
 * A test that expects a message must look at the spy and clear it (`vi.mocked(console.warn).mockClear()`).
 */
export function expectNoConsoleOutput(methods: readonly GuardedConsoleMethod[] = DEFAULT_METHODS): void {
  let spies: MockInstance[] = [];

  beforeEach(() => {
    spies = methods.map((method) => vi.spyOn(console, method).mockImplementation(() => undefined));
  });

  afterEach(() => {
    try {
      methods.forEach((method, position) => {
        expect(spies[position], `console.${method} was called`).not.toHaveBeenCalled();
      });
    } finally {
      spies.forEach((spy) => spy.mockRestore());
      spies = [];
    }
  });
}
