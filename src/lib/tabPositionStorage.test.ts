import { afterEach, describe, expect, it, vi } from 'vitest';
import { A11Y_STORAGE_KEY } from '../contexts/AccessibilityContext';
import { clearTabPosition, readTabPosition, TAB_POSITION_STORAGE_KEY, writeTabPosition } from './tabPositionStorage';

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('tab position storage', () => {
  it('uses its own key, not the one of the accessibility preferences', () => {
    expect(TAB_POSITION_STORAGE_KEY).not.toBe(A11Y_STORAGE_KEY);
    expect(TAB_POSITION_STORAGE_KEY).toBe('vn-a11y-tab-position');
  });

  it('gives null when nothing is stored', () => {
    expect(readTabPosition()).toBeNull();
  });

  it('stores the side and the ratio and reads them back', () => {
    writeTabPosition({ side: 'left', ratio: 0.42 });

    expect(JSON.parse(window.localStorage.getItem(TAB_POSITION_STORAGE_KEY) ?? '')).toEqual({ side: 'left', ratio: 0.42 });
    expect(readTabPosition()).toEqual({ side: 'left', ratio: 0.42 });
  });

  it('accepts the ends of the range', () => {
    writeTabPosition({ side: 'right', ratio: 0 });
    expect(readTabPosition()).toEqual({ side: 'right', ratio: 0 });
    writeTabPosition({ side: 'right', ratio: 1 });
    expect(readTabPosition()).toEqual({ side: 'right', ratio: 1 });
  });

  it('does not touch the accessibility preferences', () => {
    window.localStorage.setItem(A11Y_STORAGE_KEY, '{"fontSize":true}');
    writeTabPosition({ side: 'left', ratio: 0.3 });
    clearTabPosition();

    expect(window.localStorage.getItem(A11Y_STORAGE_KEY)).toBe('{"fontSize":true}');
  });

  it('clears the stored place', () => {
    writeTabPosition({ side: 'left', ratio: 0.3 });
    clearTabPosition();

    expect(readTabPosition()).toBeNull();
  });

  it.each([
    ['not json', '{oops'],
    ['a number', '5'],
    ['null', 'null'],
    ['an array', '[]'],
    ['an unknown side', '{"side":"top","ratio":0.5}'],
    ['a missing side', '{"ratio":0.5}'],
    ['a missing ratio', '{"side":"left"}'],
    ['a string ratio', '{"side":"left","ratio":"0.5"}'],
    ['a ratio under 0', '{"side":"left","ratio":-0.1}'],
    ['a ratio over 1', '{"side":"left","ratio":1.5}'],
    ['a null ratio', '{"side":"left","ratio":null}'],
    ['an empty string', ''],
  ])('falls back to the default on %s', (_name, raw) => {
    window.localStorage.setItem(TAB_POSITION_STORAGE_KEY, raw);

    expect(readTabPosition()).toBeNull();
  });

  it('survives a storage that throws on every call', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });

    expect(readTabPosition()).toBeNull();
    expect(() => writeTabPosition({ side: 'left', ratio: 0.5 })).not.toThrow();
    expect(() => clearTabPosition()).not.toThrow();
  });
});
