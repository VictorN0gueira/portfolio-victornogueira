import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ROW_COUNT, panelCopy, getRows, getDoneRows, getRunningStep, getCurrentStep, getWindow, getBody, getStepsList, stubOverflowingSteps, getPauseButton, advance, renderPanel } from '../../test/automationPanelKit';
import { triggerIntersection } from '../../test/intersection';
import { AutomationPanel } from './AutomationPanel';

// The setup file does not restore spies, so a stub left by a failing test would leak into the next ones.
afterEach(() => {
  vi.restoreAllMocks();
});

describe('AutomationPanel cycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with no row done and the first one running', () => {
    renderPanel('planilha-whatsapp');

    expect(getDoneRows()).toHaveLength(0);
    expect(getRows().map((row) => row.dataset.state)).toEqual(['active', 'pending', 'pending', 'pending']);
  });

  it('marks one row done after 1400ms and four after 4 times that', () => {
    renderPanel('planilha-whatsapp');

    advance(1);
    expect(getDoneRows()).toHaveLength(1);
    expect(getRows()[0]).toHaveAttribute('data-state', 'done');
    expect(getRows()[1]).toHaveAttribute('data-state', 'active');

    advance(3);
    expect(getDoneRows()).toHaveLength(ROW_COUNT);
  });

  it('restarts on the fifth beat, with every row pending again', () => {
    renderPanel('planilha-whatsapp');

    advance(ROW_COUNT);
    expect(getDoneRows()).toHaveLength(ROW_COUNT);
    advance(1);

    expect(getDoneRows()).toHaveLength(0);
    expect(getRows()[0]).toHaveAttribute('data-state', 'active');
  });

  it('moves the running step with the beat, step k modulo 4, marked with data-active and never with aria-current', () => {
    renderPanel('planilha-whatsapp');

    expect(getRunningStep()).toBe('receber');
    advance(1);
    expect(getRunningStep()).toBe('entender');
    advance(1);
    expect(getRunningStep()).toBe('executar');
    advance(1);
    expect(getRunningStep()).toBe('avisar');
    advance(1);
    expect(getRunningStep()).toBe('receber');
    expect(getCurrentStep()).toBeUndefined();
  });

  // The owner asked for it: the panel does not stop when the mouse is over it.
  it('keeps running while the pointer is over the body, and does not mark the window as paused', () => {
    renderPanel('planilha-whatsapp');
    advance(1);

    fireEvent.pointerEnter(getBody());
    expect(getWindow()).not.toHaveAttribute('data-paused');
    advance(3);
    expect(getDoneRows()).toHaveLength(4);

    fireEvent.pointerLeave(getBody());
    expect(getWindow()).not.toHaveAttribute('data-paused');
    advance(1);
    expect(getDoneRows()).toHaveLength(0);
  });

  it('pauses while the focus is inside the body and goes on when it leaves', () => {
    stubOverflowingSteps();
    renderPanel('planilha-whatsapp');
    advance(1);
    const steps = getStepsList();

    act(() => steps.focus());
    advance(3);
    expect(getDoneRows()).toHaveLength(1);

    act(() => steps.blur());
    advance(1);
    expect(getDoneRows()).toHaveLength(2);
  });

  it('stays paused while the focus holds it, whatever the pointer does', () => {
    stubOverflowingSteps();
    renderPanel('planilha-whatsapp');
    const steps = getStepsList();

    act(() => steps.focus());
    fireEvent.pointerEnter(getBody());
    fireEvent.pointerLeave(getBody());
    advance(3);
    expect(getDoneRows()).toHaveLength(0);

    act(() => steps.blur());
    advance(1);
    expect(getDoneRows()).toHaveLength(1);
  });

  it('restarts the cycle when the task changes', () => {
    const { rerender } = renderPanel('planilha-whatsapp');
    advance(2);
    expect(getDoneRows()).toHaveLength(2);

    rerender(<AutomationPanel task="notas" />);

    expect(getDoneRows()).toHaveLength(0);
    expect(getRows()[0]).toHaveTextContent('Venda confirmada');
    expect(getRows()[0]).toHaveAttribute('data-state', 'active');
    advance(1);
    expect(getDoneRows()).toHaveLength(1);
  });

  it('keeps no timer after it unmounts', () => {
    const { unmount } = renderPanel('planilha-whatsapp');
    advance(1);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('AutomationPanel off screen (R:M13)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not run the timer until the panel is on the screen', () => {
    renderPanel('planilha-whatsapp', false);

    advance(ROW_COUNT);

    expect(getDoneRows()).toHaveLength(0);
  });

  it('holds the CSS loops with data-paused while off screen, and shows no pause in the status', () => {
    renderPanel('planilha-whatsapp', false);

    expect(getWindow()).toHaveAttribute('data-paused', 'true');
    expect(screen.getByText(panelCopy.status.running)).toBeInTheDocument();
    expect(getPauseButton()).toHaveAttribute('aria-pressed', 'false');
  });

  it('runs while it is on screen and stops again when it leaves', () => {
    const { container } = renderPanel('planilha-whatsapp');
    const frame = container.firstElementChild as HTMLElement;

    advance(1);
    expect(getDoneRows()).toHaveLength(1);
    expect(getWindow()).not.toHaveAttribute('data-paused');

    triggerIntersection(frame, false);
    advance(2);

    expect(getDoneRows()).toHaveLength(1);
    expect(getWindow()).toHaveAttribute('data-paused', 'true');
  });
});
