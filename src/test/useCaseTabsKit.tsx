import { act, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { homeCopy } from '../data/homeCopy';
import { UseCaseTabs } from '../sections/home/UseCaseTabs';
import { ROTATE_MS } from '../sections/home/useTabsBehavior';
import { triggerIntersection } from './intersection';
import { renderWithProviders } from './render';

/** The same constant the component rotates by, so no test repeats the number. */
export { ROTATE_MS };
export const A11Y_STORAGE_KEY = 'a11y-preferences';
export const TAB_NAMES = ['Atendimento', 'Comercial', 'Financeiro', 'Operações'] as const;
export const { useCases: copy } = homeCopy;

export function getTab(name: string): HTMLElement {
  return screen.getByRole('tab', { name });
}

export function getSelectedName(): string | undefined {
  return screen.getAllByRole('tab').find((tab) => tab.getAttribute('aria-selected') === 'true')?.textContent ?? undefined;
}

export function getPauseToggle(): HTMLElement {
  return screen.getByRole('button', { name: copy.pause });
}

export function getTablist(): HTMLElement {
  return screen.getByRole('tablist', { name: copy.tablistLabel });
}

export function getPanelGroup(): HTMLElement {
  return screen.getByRole('tabpanel').querySelector('[data-reveal-group]') as HTMLElement;
}

export function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

export function getWidget(): HTMLElement {
  return document.querySelector('[data-use-case-widget]') as HTMLElement;
}

/** Reports the tabs and the panel as entering the viewport, or (with false) leaving it, like the browser does. */
export function setInView(isInView: boolean): void {
  triggerIntersection(getWidget(), isInView);
}

interface RenderTabsOptions {
  /** The rotation only runs while the area is on screen, so by default it is reported as in view at once. */
  isInView?: boolean;
}

export function renderTabs({ isInView = true }: RenderTabsOptions = {}) {
  const result = renderWithProviders(<UseCaseTabs />);
  if (isInView) setInView(true);
  return result;
}

const originalMatches = Element.prototype.matches;

/**
 * Settles :focus-visible for the test. jsdom guesses it from the last input events (keyboard or pointer), which makes a
 * test depend on the events before it. True is a keyboard focus, false is a click or a tap that focused the element.
 * The spy is undone by vi.restoreAllMocks.
 */
export function stubFocusVisible(isFocusVisible: boolean): void {
  vi.spyOn(Element.prototype, 'matches').mockImplementation(function (this: Element, selector: string) {
    return selector === ':focus-visible' ? isFocusVisible : originalMatches.call(this, selector);
  });
}
