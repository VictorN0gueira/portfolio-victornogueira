import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from '../test/matchMedia';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

describe('usePrefersReducedMotion', () => {
  it('is false when the system does not ask for reduced motion', () => {
    stubMatchMedia();

    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(false);
  });

  it('is true when the system asks for reduced motion', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });

    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(true);
  });

  it('follows the setting live while mounted', () => {
    const media = stubMatchMedia();
    const { result } = renderHook(() => usePrefersReducedMotion());

    act(() => media.set(REDUCED_MOTION_QUERY, true));
    expect(result.current).toBe(true);

    act(() => media.set(REDUCED_MOTION_QUERY, false));
    expect(result.current).toBe(false);
  });
});
