import { describe, expect, it, vi } from 'vitest';
import { expectNoConsoleOutput } from './consoleGuard';

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
