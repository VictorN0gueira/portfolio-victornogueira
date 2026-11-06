import { act, render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBackdropIsDark } from './useBackdropIsDark';

// jsdom has no layout: the page under the tab is a list of layers that the test swaps, like the tab moving onto a
// light or a dark section, and the hook is asked to read it again by the end of the transition of the tab.

const LIGHT = 'rgb(255, 255, 255)';
const DARK = 'rgb(10, 10, 10)';

let backdrop: HTMLElement;

function Probe() {
  const ref = useRef<HTMLButtonElement>(null);
  const isDark = useBackdropIsDark(ref);
  return (
    <button ref={ref} type="button" data-testid="tab" data-dark={String(isDark)}>
      tab
    </button>
  );
}

const isDark = (view: { getByTestId: (id: string) => HTMLElement }) => view.getByTestId('tab').dataset.dark === 'true';

const endTransition = (target: Element, propertyName: string) =>
  act(() => {
    target.dispatchEvent(Object.assign(new Event('transitionend', { bubbles: true }), { propertyName }));
  });

beforeEach(() => {
  vi.useFakeTimers();
  backdrop = document.createElement('div');
  backdrop.style.backgroundColor = LIGHT;
  document.body.append(backdrop);
  Object.defineProperty(document, 'elementsFromPoint', { value: () => [backdrop], configurable: true, writable: true });
});

afterEach(() => {
  backdrop.remove();
  Reflect.deleteProperty(document, 'elementsFromPoint');
  vi.useRealTimers();
});

describe('the colours of the tab follow the page under it', () => {
  it('reads the page again when the tab ends a slide, which is how a step aside changes the place it is drawn at', () => {
    const view = render(<Probe />);
    expect(isDark(view)).toBe(false);

    backdrop.style.backgroundColor = DARK;
    endTransition(view.getByTestId('tab'), 'translate');
    expect(isDark(view)).toBe(true);

    backdrop.style.backgroundColor = LIGHT;
    endTransition(view.getByTestId('tab'), 'translate');
    expect(isDark(view)).toBe(false);
  });

  it('does not read again for the end of a colour transition, which would be reading its own change', () => {
    const view = render(<Probe />);
    backdrop.style.backgroundColor = DARK;
    endTransition(view.getByTestId('tab'), 'background-color');
    expect(isDark(view)).toBe(false);
  });

  it('stops listening when it unmounts', () => {
    const reads = vi.fn(() => [backdrop]);
    Object.defineProperty(document, 'elementsFromPoint', { value: reads, configurable: true, writable: true });
    const view = render(<Probe />);
    const tab = view.getByTestId('tab');
    view.unmount();
    const before = reads.mock.calls.length;
    endTransition(tab, 'translate');
    expect(reads.mock.calls.length).toBe(before);
  });
});
