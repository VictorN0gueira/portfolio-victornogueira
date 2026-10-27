import { act, renderHook } from '@testing-library/react';
import type { KeyboardEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useListboxNavigation } from './useListboxNavigation';

const LABELS = ['5 horas', '10 horas', '20 horas', '40 horas'];

function keyEvent(key: string) {
  const preventDefault = vi.fn();
  const event = { key, ctrlKey: false, metaKey: false, altKey: false, preventDefault } as unknown as KeyboardEvent<HTMLElement>;
  return { event, preventDefault };
}

/** Real list items, registered the way the options of the list register theirs, with a spy on focus. */
function setup(selectedIndex = 1) {
  const onChoose = vi.fn();
  const onDismiss = vi.fn();
  const hook = renderHook(() => useListboxNavigation({ labels: LABELS, selectedIndex, onChoose, onDismiss }));
  const items = LABELS.map(() => document.createElement('li'));
  const focus = items.map((item) => vi.spyOn(item, 'focus'));
  items.forEach((item, index) => hook.result.current.registerOption(index)(item));
  const press = (key: string) => {
    const { event, preventDefault } = keyEvent(key);
    act(() => hook.result.current.onKeyDown(event));
    return preventDefault;
  };
  return { ...hook, items, focus, press, onChoose, onDismiss };
}

describe('useListboxNavigation', () => {
  it('starts with the chosen option as the active one', () => {
    const { result } = setup(2);

    expect(result.current.activeIndex).toBe(2);
  });

  it('moves the active option with the arrows, focusing it, and stops at both ends', () => {
    const { result, focus, press } = setup(1);

    press('ArrowDown');
    expect(result.current.activeIndex).toBe(2);
    expect(focus[2]).toHaveBeenCalledWith({ preventScroll: false });
    press('ArrowDown');
    press('ArrowDown');
    expect(result.current.activeIndex).toBe(3);
    press('ArrowUp');
    press('ArrowUp');
    press('ArrowUp');
    press('ArrowUp');
    expect(result.current.activeIndex).toBe(0);
  });

  it('jumps to the last option with End and to the first with Home', () => {
    const { result, press } = setup(1);

    press('End');
    expect(result.current.activeIndex).toBe(3);
    press('Home');
    expect(result.current.activeIndex).toBe(0);
  });

  it('chooses the active option with Enter and with Space, and dismisses with Tab', () => {
    const { onChoose, onDismiss, press } = setup(1);

    press('Enter');
    press(' ');
    press('Tab');

    expect(onChoose).toHaveBeenCalledTimes(2);
    expect(onChoose).toHaveBeenNthCalledWith(1, 1);
    expect(onChoose).toHaveBeenNthCalledWith(2, 1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('jumps to the option that starts with a typed character, and then a space belongs to the prefix', () => {
    const { result, onChoose, press } = setup(0);

    press('4');
    expect(result.current.activeIndex).toBe(3);
    press(' ');

    expect(onChoose).not.toHaveBeenCalled();
  });

  it('cancels the keys it handles, so the page does not scroll, and leaves the others alone', () => {
    const { press } = setup(1);

    expect(press('ArrowDown')).toHaveBeenCalled();
    expect(press('Enter')).toHaveBeenCalled();
    expect(press('Tab')).toHaveBeenCalled();
    expect(press('F5')).not.toHaveBeenCalled();
    expect(press('Escape')).not.toHaveBeenCalled();
  });

  it('puts the chosen option back as the active one when the list opens again', () => {
    const { result, press } = setup(1);
    press('End');

    act(() => result.current.resetActive());

    expect(result.current.activeIndex).toBe(1);
  });

  it('focuses the chosen option without scrolling the page and brings it into view in its list', () => {
    const { result, items, focus } = setup(2);
    const scrollIntoView = vi.fn();
    items[2].scrollIntoView = scrollIntoView;

    act(() => result.current.focusSelected());

    expect(focus[2]).toHaveBeenCalledWith({ preventScroll: true });
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
  });

  it('survives an environment without scrollIntoView', () => {
    const { result } = setup(2);

    expect(() => act(() => result.current.focusSelected())).not.toThrow();
  });
});
