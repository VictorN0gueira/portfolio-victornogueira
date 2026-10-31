import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('cn mescla e resolve conflitos do tailwind', () => {
    const isOff = Boolean(0);

    expect(cn('px-2 py-1', isOff && 'x', 'px-4')).toBe('py-1 px-4');
  });
});
