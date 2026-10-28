import { describe, expect, it, vi } from 'vitest';
import { assertSilentThenRestore, expectNoConsoleOutput } from './consoleGuard';

/** A fake spy: a mock that records calls, with a mockRestore of its own to count the restores. */
function fakeSpy() {
  const restore = vi.fn();
  return { spy: Object.assign(vi.fn(), { mockRestore: restore }), restore };
}

describe('assertSilentThenRestore', () => {
  it('passes when no spy was called, and restores every spy once', () => {
    const error = fakeSpy();
    const warn = fakeSpy();

    expect(() => assertSilentThenRestore([error.spy, warn.spy], ['error', 'warn'])).not.toThrow();

    expect(error.restore).toHaveBeenCalledTimes(1);
    expect(warn.restore).toHaveBeenCalledTimes(1);
  });

  it('throws an error that names the console method that was called', () => {
    const error = fakeSpy();
    const warn = fakeSpy();
    warn.spy('something went wrong');

    expect(() => assertSilentThenRestore([error.spy, warn.spy], ['error', 'warn'])).toThrow(/console\.warn was called/);
  });

  it('restores every spy even when the assertion throws on the first one', () => {
    const error = fakeSpy();
    const warn = fakeSpy();
    error.spy('boom');

    expect(() => assertSilentThenRestore([error.spy, warn.spy], ['error', 'warn'])).toThrow(/console\.error was called/);

    // The second spy comes after the one that failed: it is restored only if the restore does not depend on the assertion.
    expect(error.restore).toHaveBeenCalledTimes(1);
    expect(warn.restore).toHaveBeenCalledTimes(1);
  });

  it('restores every spy when the last one is the one that was called', () => {
    const error = fakeSpy();
    const warn = fakeSpy();
    warn.spy('late');

    expect(() => assertSilentThenRestore([error.spy, warn.spy], ['error', 'warn'])).toThrow();

    expect(error.restore).toHaveBeenCalledTimes(1);
    expect(warn.restore).toHaveBeenCalledTimes(1);
  });

  it('checks only the methods it is given, in the order of the spies', () => {
    const error = fakeSpy();
    error.spy('ignored message');

    expect(() => assertSilentThenRestore([error.spy], ['error'])).toThrow(/console\.error was called/);
    expect(error.restore).toHaveBeenCalledTimes(1);
  });
});

describe('expectNoConsoleOutput', () => {
  describe('guarding error and warn', () => {
    expectNoConsoleOutput();

    it('replaces console.error and console.warn with silent spies while a test runs', () => {
      expect(vi.isMockFunction(console.error)).toBe(true);
      expect(vi.isMockFunction(console.warn)).toBe(true);
    });

    it('lets the test see a message through the spy, and passes once the test cleared it', () => {
      console.warn('expected message');

      expect(console.warn).toHaveBeenCalledWith('expected message');
      vi.mocked(console.warn).mockClear();
    });

    it('passes when nothing is written', () => {
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe('guarding error only', () => {
    expectNoConsoleOutput(['error']);

    it('leaves console.warn alone', () => {
      expect(vi.isMockFunction(console.error)).toBe(true);
      expect(vi.isMockFunction(console.warn)).toBe(false);
    });
  });

  describe('after the guarded scopes', () => {
    it('has restored both console methods', () => {
      expect(vi.isMockFunction(console.error)).toBe(false);
      expect(vi.isMockFunction(console.warn)).toBe(false);
    });
  });
});
