import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('cn mescla e resolve conflitos do tailwind', () => {
    expect(cn('px-2 py-1', false && 'x', 'px-4')).toBe('py-1 px-4');
  });
});
