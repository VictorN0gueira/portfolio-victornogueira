import { afterEach, beforeEach, expect, vi } from 'vitest';

export type GuardedConsoleMethod = 'error' | 'warn';

/** What the check needs of a spy: to be a mock that records calls, and to be restorable. */
export interface GuardedSpy {
  mockRestore: () => void;
}

const DEFAULT_METHODS: readonly GuardedConsoleMethod[] = ['error', 'warn'];

/**
 * Asserts that none of the spies was called (`spies[position]` watches `methods[position]`) and restores every one of
 * them. The restore is in a `finally`, so it runs for every spy even when the assertion throws: a failed assertion
 * must not leave a silent spy on the console for the next test, nor hide the spies that come after the failing one.
 */
export function assertSilentThenRestore(spies: readonly GuardedSpy[], methods: readonly GuardedConsoleMethod[]): void {
  try {
    methods.forEach((method, position) => {
      expect(spies[position], `console.${method} was called`).not.toHaveBeenCalled();
    });
  } finally {
    spies.forEach((spy) => spy.mockRestore());
  }
}

/**
 * Keeps a test file's output pristine: call it once at the top of the file (or of a describe) and every test in that
 * scope fails if the code under test writes to console.error or console.warn (an act() warning, a Radix missing title
 * or description warning, a React key warning). The console methods are replaced by silent spies before each test and
 * always restored after it (see assertSilentThenRestore), even when the assertion fails.
 * A test that expects a message must look at the spy and clear it (`vi.mocked(console.warn).mockClear()`).
 */
export function expectNoConsoleOutput(methods: readonly GuardedConsoleMethod[] = DEFAULT_METHODS): void {
  let spies: GuardedSpy[] = [];

  beforeEach(() => {
    spies = methods.map((method) => vi.spyOn(console, method).mockImplementation(() => undefined));
  });

  afterEach(() => {
    const guarded = spies;
    spies = [];
    assertSilentThenRestore(guarded, methods);
  });
}
