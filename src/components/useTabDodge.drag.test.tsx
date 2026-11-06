import { act, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { dy, frame, installHarnessHooks, setup } from './useTabDodge.harness';

installHarnessHooks();

describe('the end of a drag', () => {
  it('puts the tab home at once when the pointer lets go of a drag, before the new place is laid out', () => {
    const { tab, a } = setup();
    act(() => a.focus());
    frame();
    expect(dy(tab)).toBe('-38px');

    tab.dataset.dragging = 'true';
    fireEvent.pointerUp(document.body);
    expect(dy(tab)).toBe('0px');
    expect(tab.style.transition).toBe('');
  });

  for (const [name, event] of [
    ['a key', () => fireEvent.keyDown(document, { key: 'Shift' })],
    ['the window losing the focus', () => fireEvent.blur(window)],
    ['a context menu', () => fireEvent.contextMenu(document.body)],
  ] as const) {
    it(`keeps the tab under the pointer when ${name} comes in the middle of a drag`, () => {
      const { tab, a } = setup();
      act(() => a.focus());
      frame();
      tab.dataset.dragging = 'true';
      act(() => {
        event();
      });
      frame();
      expect(dy(tab)).toBe('-38px');
    });
  }

  it('puts the tab home when the pointer is cancelled in the middle of a drag', () => {
    const { tab, a } = setup();
    act(() => a.focus());
    frame();
    tab.dataset.dragging = 'true';
    fireEvent.pointerCancel(document.body);
    expect(dy(tab)).toBe('0px');
  });

  it('leaves a dodge alone when the pointer lets go of something that was not a drag of the tab', () => {
    const { tab, a } = setup();
    act(() => a.focus());
    frame();
    fireEvent.pointerUp(document.body);
    expect(dy(tab)).toBe('-38px');
  });
});

describe('another pointer or a wheel in the middle of a drag', () => {
  const OWN = 1;
  const OTHER = 7;

  /** A dodged tab, pressed by one pointer and now being dragged by it. */
  function dragDodgedTab() {
    const harness = setup();
    act(() => harness.a.focus());
    frame();
    expect(dy(harness.tab)).toBe('-38px');
    fireEvent.pointerDown(harness.tab, { button: 0, pointerId: OWN });
    harness.tab.dataset.dragging = 'true';
    return harness;
  }

  for (const [name, event] of [
    ['a wheel turn', () => fireEvent.wheel(document.body)],
    ['a pointerdown of another pointer', () => fireEvent.pointerDown(document.body, { button: 0, pointerId: OTHER })],
    ['a touchstart elsewhere', () => fireEvent.touchStart(document.body)],
    ['a pointerup of another pointer', () => fireEvent.pointerUp(document.body, { pointerId: OTHER })],
    ['a pointercancel of another pointer', () => fireEvent.pointerCancel(document.body, { pointerId: OTHER })],
  ] as const) {
    it(`keeps the dodge the tab carries for ${name}`, () => {
      const { tab } = dragDodgedTab();
      act(() => {
        event();
      });
      frame();
      expect(dy(tab)).toBe('-38px');
    });
  }

  it('still clears the dodge for the release of the pointer that dragged', () => {
    const { tab } = dragDodgedTab();
    fireEvent.pointerUp(document.body, { pointerId: OWN });
    expect(dy(tab)).toBe('0px');
  });

  it('still clears the dodge for the cancel of the pointer that dragged', () => {
    const { tab } = dragDodgedTab();
    fireEvent.pointerCancel(document.body, { pointerId: OWN });
    expect(dy(tab)).toBe('0px');
  });

  it('sends the tab home for a wheel turn when it is not being dragged', () => {
    const { tab, a } = setup();
    act(() => a.focus());
    frame();
    fireEvent.wheel(document.body);
    expect(dy(tab)).toBe('0px');
  });
});
