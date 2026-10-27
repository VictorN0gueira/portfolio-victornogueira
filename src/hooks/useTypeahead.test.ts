import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findTypeaheadMatch, isPrintableKey, useTypeahead } from './useTypeahead';

const LABELS = ['alfa', 'beta', 'alto', 'follow-up de vendas'];
const RESET_MS = 600;

describe('findTypeaheadMatch', () => {
  it('finds the first label that starts with the typed prefix, ignoring case', () => {
    expect(findTypeaheadMatch(LABELS, 'b', 0)).toBe(1);
    expect(findTypeaheadMatch(LABELS, 'be', 0)).toBe(1);
    expect(findTypeaheadMatch(['Beta'], 'be', 0)).toBe(0);
  });

  it('starts after the active option for a single character, so a repeated letter cycles', () => {
    expect(findTypeaheadMatch(LABELS, 'a', 0)).toBe(2);
    expect(findTypeaheadMatch(LABELS, 'a', 2)).toBe(0);
    expect(findTypeaheadMatch(LABELS, 'aa', 0)).toBe(2);
  });

  it('starts at the active option for a longer prefix, which may already match', () => {
    expect(findTypeaheadMatch(LABELS, 'al', 2)).toBe(2);
    expect(findTypeaheadMatch(LABELS, 'follow-up d', 0)).toBe(3);
  });

  it('returns -1 when nothing starts with the prefix', () => {
    expect(findTypeaheadMatch(LABELS, 'z', 0)).toBe(-1);
    expect(findTypeaheadMatch([], 'a', 0)).toBe(-1);
  });
});

describe('isPrintableKey', () => {
  const key = (name: string, modifiers: Partial<Record<'ctrlKey' | 'metaKey' | 'altKey', boolean>> = {}) => ({
    key: name,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    ...modifiers,
  });

  it('accepts one character, space included', () => {
    expect(isPrintableKey(key('a'))).toBe(true);
    expect(isPrintableKey(key(' '))).toBe(true);
  });

  it('rejects named keys and shortcuts', () => {
    expect(isPrintableKey(key('ArrowDown'))).toBe(false);
    expect(isPrintableKey(key('a', { ctrlKey: true }))).toBe(false);
    expect(isPrintableKey(key('a', { metaKey: true }))).toBe(false);
    expect(isPrintableKey(key('a', { altKey: true }))).toBe(false);
  });
});

describe('useTypeahead', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports the match of the typed prefix and keeps building it while characters arrive in time', () => {
    const onMatch = vi.fn();
    const { result } = renderHook(() => useTypeahead(LABELS, 0, onMatch));

    act(() => result.current.type('f'));
    act(() => vi.advanceTimersByTime(RESET_MS - 1));
    act(() => result.current.type('o'));

    expect(onMatch).toHaveBeenNthCalledWith(1, 3);
    expect(onMatch).toHaveBeenNthCalledWith(2, 3);
    expect(result.current.isTyping()).toBe(true);
  });

  it('forgets the prefix after a pause, so the next character starts a new search', () => {
    const onMatch = vi.fn();
    const { result } = renderHook(() => useTypeahead(LABELS, 0, onMatch));

    act(() => result.current.type('f'));
    act(() => vi.advanceTimersByTime(RESET_MS));
    expect(result.current.isTyping()).toBe(false);
    act(() => result.current.type('b'));

    expect(onMatch).toHaveBeenLastCalledWith(1);
  });

  it('does not report anything when no label matches', () => {
    const onMatch = vi.fn();
    const { result } = renderHook(() => useTypeahead(LABELS, 0, onMatch));

    act(() => result.current.type('z'));

    expect(onMatch).not.toHaveBeenCalled();
  });

  it('clears its timer on unmount', () => {
    const { result, unmount } = renderHook(() => useTypeahead(LABELS, 0, vi.fn()));
    act(() => result.current.type('f'));

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
