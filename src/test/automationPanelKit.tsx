import { act, screen, within } from '@testing-library/react';
import { vi } from 'vitest';
import { flowPanel } from '../data/heroFlows';
import { homeCopy } from '../data/homeCopy';
import { AutomationPanel } from '../sections/home/AutomationPanel';
import { triggerIntersection } from './intersection';
import { renderWithProviders } from './render';

// What the AutomationPanel suites share: the queries of the window, its rows and steps, the clock and the render that
// puts the panel on the screen (the window runs only while it is visible).

export const STEP_MS = 1400;
export const ROW_COUNT = 4;
export const { panel: panelCopy } = homeCopy.hero;


export function getRows(): HTMLElement[] {
  return within(screen.getByRole('list', { name: flowPanel.aria.rows })).getAllByRole('listitem');
}

export function getDoneRows(): HTMLElement[] {
  return getRows().filter((row) => row.dataset.state === 'done');
}

export function getSteps(): HTMLElement[] {
  return within(screen.getByRole('list', { name: flowPanel.aria.steps })).getAllByRole('listitem');
}

/** The step that runs: only marked, with data-active, while the cycle is running. */
export function getRunningStep(): string | undefined {
  return getSteps().find((step) => step.dataset.active === 'true')?.textContent ?? undefined;
}

/** The step the cycle stopped on: only marked, with aria-current, while it does not run. */
export function getCurrentStep(): string | undefined {
  return getSteps().find((step) => step.getAttribute('aria-current') === 'step')?.textContent ?? undefined;
}

export function getDoneText(row: HTMLElement): HTMLElement {
  return row.querySelector('[data-flow-done]') as HTMLElement;
}

/** The group that carries data-paused. */
export function getWindow(): HTMLElement {
  return screen.getByRole('group', { name: panelCopy.label });
}

/** The body of the window: the part that listens for the pointer and the focus. The title bar is not in it. */
export function getBody(): HTMLElement {
  return getWindow().querySelector('[data-flow-body]') as HTMLElement;
}

export function getStepsList(): HTMLElement {
  return screen.getByRole('list', { name: flowPanel.aria.steps });
}

/**
 * Makes the steps row wider than its box, so it is a tab stop that can take the focus.
 * The spies are undone by the afterEach at the top of this file, also when a test fails before its last line.
 */
export function stubOverflowingSteps(): void {
  vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockImplementation(() => 420);
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(() => 300);
}

export function getPauseButton(): HTMLElement {
  return screen.getByRole('button', { name: /animação$/ });
}

export function advance(steps: number): void {
  act(() => {
    vi.advanceTimersByTime(steps * STEP_MS);
  });
}

/** Renders the panel on the screen: the window runs only while it is visible, and the test observer reports nothing by itself. */
export function renderPanel(task: Parameters<typeof AutomationPanel>[0]['task'], isVisible = true) {
  const result = renderWithProviders(<AutomationPanel task={task} />);
  if (isVisible) triggerIntersection(result.container.firstElementChild as HTMLElement);
  return result;
}
