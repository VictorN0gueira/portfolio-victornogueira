import { afterEach, describe, expect, it, vi } from 'vitest';
import { setVisibility } from './visibility';

afterEach(() => {
  Reflect.deleteProperty(document, 'visibilityState');
});

describe('setVisibility', () => {
  it('makes the document report the state and tells the listeners once', () => {
    const listener = vi.fn();
    document.addEventListener('visibilitychange', listener);

    setVisibility('hidden');

    expect(document.visibilityState).toBe('hidden');
    expect(listener).toHaveBeenCalledTimes(1);
    document.removeEventListener('visibilitychange', listener);
  });

  it('can go back to visible, and the real getter returns once the override is deleted', () => {
    setVisibility('hidden');
    setVisibility('visible');
    expect(document.visibilityState).toBe('visible');

    Reflect.deleteProperty(document, 'visibilityState');

    expect(document.visibilityState).toBe('visible');
  });
});
