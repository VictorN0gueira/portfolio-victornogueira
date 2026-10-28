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

    // The assertion throws at the first spy, before anything looks at the second one, so the second spy is restored only because the restore runs in a finally.
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

  it('checks only the methods it is given: a spy of a method that is not in the list may have been called', () => {
    const error = fakeSpy();
    const warn = fakeSpy();
    warn.spy('not guarded here');

    expect(() => assertSilentThenRestore([error.spy, warn.spy], ['error'])).not.toThrow();

    expect(error.restore).toHaveBeenCalledTimes(1);
    expect(warn.restore).toHaveBeenCalledTimes(1);
  });

  it('still fails for a method that is in the list when another one is left out of it', () => {
    const error = fakeSpy();
    const warn = fakeSpy();
    error.spy('guarded');
    warn.spy('not guarded here');

    expect(() => assertSilentThenRestore([error.spy, warn.spy], ['error'])).toThrow(/console\.error was called/);

    expect(error.restore).toHaveBeenCalledTimes(1);
    expect(warn.restore).toHaveBeenCalledTimes(1);
  });

  it('names each spy after the method at the same position in the list', () => {
    const first = fakeSpy();
    const second = fakeSpy();
    first.spy('called');

    expect(() => assertSilentThenRestore([first.spy, second.spy], ['warn', 'error'])).toThrow(/console\.warn was called/);
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
