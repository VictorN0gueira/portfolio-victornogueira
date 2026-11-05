import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TAB_POSITION_STORAGE_KEY } from '../lib/tabPositionStorage';
import { stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import AccessibilityWidget from './AccessibilityWidget';

// The open panel is placed beside the moved tab with a transform, from the size it has. These tests give jsdom (which has no
// layout) a panel of 208x300, a tab at the right edge of a 1024x768 window, and check what is applied and when.

const TRIGGER_NAME = 'Abrir opções de acessibilidade';
const PANEL_NAME = 'Opções de acessibilidade';
const TAB_RECT = { left: 980, top: 669, width: 44, height: 44, right: 1024, bottom: 713, x: 980, y: 669, toJSON: () => ({}) };

let panelHeight = 300;
let resizeCallbacks: Array<() => void> = [];

class FakeResizeObserver {
  constructor(callback: () => void) {
    resizeCallbacks.push(callback);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  stubMatchMedia();
  window.localStorage.clear();
  window.localStorage.setItem(TAB_POSITION_STORAGE_KEY, JSON.stringify({ side: 'right', ratio: 0.9 }));
  Object.defineProperty(document, 'elementsFromPoint', { value: () => [], configurable: true, writable: true });
  panelHeight = 300;
  resizeCallbacks = [];
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(208);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(() => panelHeight);
});

afterEach(() => {
  Reflect.deleteProperty(document, 'elementsFromPoint');
  window.localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function openPanel() {
  const user = userEvent.setup();
  renderWithProviders(<AccessibilityWidget />);
  const trigger = screen.getByRole('button', { name: TRIGGER_NAME });
  vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(TAB_RECT);
  await user.click(trigger);
  const panel = await screen.findByRole('dialog', { name: PANEL_NAME });
  return { trigger, placer: panel.parentElement as HTMLElement };
}

describe('the panel placed beside a moved tab', () => {
  it('is bottom aligned with the tab (growing upward) from the size it has', async () => {
    const { placer } = await openPanel();

    expect(placer.style.transform).toBe('translate(0px, -256px)');
  });

  // F2: "Texto maior" or "Fonte legível" turn on a class of the page after the placement ran, and the panel grows.
  it('is placed again when the panel changes size, so it never leaves the window after the font grows', async () => {
    const { placer } = await openPanel();

    panelHeight = 400;
    act(() => resizeCallbacks.forEach((callback) => callback()));

    expect(placer.style.transform).toBe('translate(0px, -356px)');
  });

  // F5: a drag that ends without a choice leaves the same place, so nothing re-rendered the panel placement.
  it('goes back to its place at rest when a drag is cancelled with the panel open', async () => {
    const { trigger, placer } = await openPanel();

    fireEvent.pointerDown(trigger, { clientX: 1000, clientY: 690, pointerId: 1, pointerType: 'touch', button: 0 });
    // Near the top the panel cannot stay bottom aligned: it is held 16px under the top, so its offset is not the one at rest.
    fireEvent.pointerMove(trigger, { clientX: 900, clientY: 100, pointerId: 1, pointerType: 'touch' });
    expect(placer.style.transform).toBe('translate(0px, -80px)');
    fireEvent.pointerCancel(trigger, { pointerId: 1 });

    expect(placer.style.transform).toBe('translate(0px, -256px)');
  });

  // F6: no probe element, no computed style and no panel measuring on every pointer move.
  it('does not force a layout on every pointer move: the window and the panel size are read once per drag', async () => {
    const { trigger } = await openPanel();
    fireEvent.pointerDown(trigger, { clientX: 1000, clientY: 690, pointerId: 1, pointerType: 'touch', button: 0 });
    fireEvent.pointerMove(trigger, { clientX: 990, clientY: 650, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerMove(trigger, { clientX: 980, clientY: 640, pointerId: 1, pointerType: 'touch' });

    const getComputedStyle = vi.spyOn(window, 'getComputedStyle');
    const createElement = vi.spyOn(document, 'createElement');
    for (let step = 0; step < 8; step += 1) {
      fireEvent.pointerMove(trigger, { clientX: 970 - step * 10, clientY: 630 - step * 10, pointerId: 1, pointerType: 'touch' });
    }

    expect(getComputedStyle).not.toHaveBeenCalled();
    expect(createElement).not.toHaveBeenCalled();
  });
});
