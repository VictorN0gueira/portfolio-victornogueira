import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flowPanel } from '../../data/heroFlows';
import { homeCopy } from '../../data/homeCopy';
import { MD_QUERY } from '../../lib/breakpoints';
import { ROW_COUNT, panelCopy, getRows, getDoneRows, getRunningStep, getCurrentStep, getDoneText, getWindow, getBody, getStepsList, stubOverflowingSteps, getPauseButton, advance, renderPanel } from '../../test/automationPanelKit';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from '../../test/matchMedia';
import { AutomationPanel } from './AutomationPanel';

// The setup file does not restore spies, so a stub left by a failing test would leak into the next ones.
afterEach(() => {
  vi.restoreAllMocks();
});

describe('AutomationPanel pause control', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sits in the title bar next to the status, named by the pause label of the copy module and not pressed', () => {
    renderPanel('planilha-whatsapp');

    const titleBar = screen.getByText(flowPanel.title).parentElement as HTMLElement;
    expect(titleBar.contains(getPauseButton())).toBe(true);
    expect(titleBar.contains(screen.getByText(panelCopy.status.running))).toBe(true);
    expect(getPauseButton()).toHaveAccessibleName(homeCopy.hero.panel.pause);
    expect(getPauseButton()).toHaveAttribute('aria-pressed', 'false');
    expect(getPauseButton()).toHaveAttribute('type', 'button');
  });

  it('has a 52px hit area (44px is the least it may show when the panel tilts), a visible focus ring that works on the dark bar, and is a small icon button to the eye', () => {
    renderPanel('planilha-whatsapp');

    expect(getPauseButton()).toHaveClass('size-[3.25rem]', 'focus-visible:outline-2', 'focus-visible:outline-vn-white');
    expect(getPauseButton().firstElementChild).toHaveClass('size-7', 'rounded-full');
  });

  // The button was moved onto the shared PauseToggle (dark tone) with no change of look: these are the exact classes it had.
  it('has exactly the classes of the dark tone of the shared toggle, with the 52px hit area and the margins that keep the title bar', () => {
    renderPanel('planilha-whatsapp');
    const classesOf = (element: Element | null) => Array.from(element?.classList ?? []).sort();

    expect(classesOf(getPauseButton())).toEqual(
      [
        'group',
        '-mt-2',
        '-mb-4',
        '-ml-1',
        '-mr-3',
        '[&>span]:-translate-y-1',
        'grid',
        'size-[3.25rem]',
        'shrink-0',
        'cursor-pointer',
        'place-items-center',
        'rounded-full',
        'focus-visible:outline-2',
        'focus-visible:outline-vn-white',
      ].sort(),
    );
    expect(classesOf(getPauseButton().firstElementChild)).toEqual(
      [
        'grid',
        'size-7',
        'place-items-center',
        'rounded-full',
        'border',
        'border-vn-gray-mid',
        'text-vn-gray-light',
        'group-hover:bg-vn-gray-dark',
      ].sort(),
    );
    expect(getPauseButton().querySelector('svg')).toHaveClass('size-3.5');
  });

  it('stops the rows and marks the window as paused when it is pressed, and goes on when it is pressed again', () => {
    renderPanel('planilha-whatsapp');
    advance(1);
    expect(getWindow()).not.toHaveAttribute('data-paused');

    fireEvent.click(getPauseButton());

    expect(getPauseButton()).toHaveAttribute('aria-pressed', 'true');
    expect(getPauseButton()).toHaveAccessibleName(homeCopy.hero.panel.pause);
    expect(getWindow()).toHaveAttribute('data-paused', 'true');
    advance(4);
    expect(getDoneRows()).toHaveLength(1);

    fireEvent.click(getPauseButton());

    expect(getPauseButton()).toHaveAttribute('aria-pressed', 'false');
    expect(getPauseButton()).toHaveAccessibleName(homeCopy.hero.panel.pause);
    expect(getWindow()).not.toHaveAttribute('data-paused');
    advance(1);
    expect(getDoneRows()).toHaveLength(2);
  });

  it('keeps one constant name, the pause label, and carries the state in aria-pressed alone', () => {
    renderPanel('planilha-whatsapp');

    expect(getPauseButton()).toHaveAccessibleName(homeCopy.hero.panel.pause);
    expect(getPauseButton()).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(getPauseButton());

    expect(getPauseButton()).toHaveAccessibleName(homeCopy.hero.panel.pause);
    expect(getPauseButton()).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('button', { name: /animação$/ })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Retomar animação' })).not.toBeInTheDocument();
    expect(getPauseButton().getAttribute('aria-label')).toBe(panelCopy.pause);
  });

  it('keeps a pause of the visitor when the pointer leaves and when the focus leaves', () => {
    renderPanel('planilha-whatsapp');
    advance(1);
    fireEvent.click(getPauseButton());

    fireEvent.pointerEnter(getBody());
    fireEvent.pointerLeave(getBody());
    act(() => getPauseButton().focus());
    act(() => getPauseButton().blur());
    advance(4);

    expect(getWindow()).toHaveAttribute('data-paused', 'true');
    expect(getDoneRows()).toHaveLength(1);
    expect(getPauseButton()).toHaveAttribute('aria-pressed', 'true');
  });

  it('also marks the window as paused while the focus holds the body, and clears it when it lets go (the pointer never does)', () => {
    stubOverflowingSteps();
    renderPanel('planilha-whatsapp');

    fireEvent.pointerEnter(getBody());
    expect(getWindow()).not.toHaveAttribute('data-paused');
    fireEvent.pointerLeave(getBody());

    act(() => getStepsList().focus());
    expect(getWindow()).toHaveAttribute('data-paused', 'true');
    act(() => getStepsList().blur());
    expect(getWindow()).not.toHaveAttribute('data-paused');
    // A hold of the focus is not the choice of the visitor: the button does not show it as pressed.
    expect(getPauseButton()).toHaveAttribute('aria-pressed', 'false');
  });

  it('does not hold the cycle when the pointer or the focus is on the pause control itself, so Resume works at once', () => {
    renderPanel('planilha-whatsapp');
    const titleBar = screen.getByText(flowPanel.title).parentElement as HTMLElement;

    fireEvent.pointerEnter(titleBar);
    act(() => getPauseButton().focus());

    expect(getWindow()).not.toHaveAttribute('data-paused');
    advance(1);
    expect(getDoneRows()).toHaveLength(1);

    fireEvent.click(getPauseButton());
    fireEvent.click(getPauseButton());
    advance(1);
    expect(getDoneRows()).toHaveLength(2);
  });

  it('keeps the pause of the visitor when the task changes, and starts the new task from its first row', () => {
    const { rerender } = renderPanel('planilha-whatsapp');
    advance(2);
    fireEvent.click(getPauseButton());

    rerender(<AutomationPanel task="notas" />);

    expect(getPauseButton()).toHaveAttribute('aria-pressed', 'true');
    expect(getWindow()).toHaveAttribute('data-paused', 'true');
    expect(getDoneRows()).toHaveLength(0);
    advance(4);
    expect(getDoneRows()).toHaveLength(0);
  });

  it('exposes the done text of the done rows and marks the step it stopped on while paused', () => {
    renderPanel('planilha-whatsapp');
    advance(2);

    fireEvent.click(getPauseButton());

    getRows().forEach((row, index) => {
      if (index < 2) expect(getDoneText(row)).not.toHaveAttribute('aria-hidden');
      else expect(getDoneText(row)).toHaveAttribute('aria-hidden', 'true');
    });
    expect(getCurrentStep()).toBe('executar');
    expect(getRunningStep()).toBeUndefined();
  });

  it('hides the done text again and goes back to data-active when it resumes', () => {
    renderPanel('planilha-whatsapp');
    advance(2);
    fireEvent.click(getPauseButton());
    fireEvent.click(getPauseButton());

    getRows().forEach((row) => expect(getDoneText(row)).toHaveAttribute('aria-hidden', 'true'));
    expect(getCurrentStep()).toBeUndefined();
    expect(getRunningStep()).toBe('executar');
  });
});

describe('AutomationPanel status', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('says "rodando" while it runs', () => {
    renderPanel('planilha-whatsapp');

    expect(screen.getByText(homeCopy.hero.panel.status.running)).toBeInTheDocument();
    expect(screen.queryByText(homeCopy.hero.panel.status.paused)).not.toBeInTheDocument();
  });

  it('says "pausado" when the visitor paused it, and "rodando" again when they resume', () => {
    renderPanel('planilha-whatsapp');
    const titleBar = screen.getByText(flowPanel.title).parentElement as HTMLElement;

    fireEvent.click(getPauseButton());

    expect(within(titleBar).getByText(homeCopy.hero.panel.status.paused)).toBeInTheDocument();
    expect(within(titleBar).queryByText(homeCopy.hero.panel.status.running)).not.toBeInTheDocument();

    fireEvent.click(getPauseButton());

    expect(within(titleBar).getByText(homeCopy.hero.panel.status.running)).toBeInTheDocument();
    expect(within(titleBar).queryByText(homeCopy.hero.panel.status.paused)).not.toBeInTheDocument();
  });

  // The status is the visitor's explicit choice only: a hold by the focus ends by itself the moment it leaves.
  it('keeps "rodando" while only the focus holds the cycle', () => {
    stubOverflowingSteps();
    renderPanel('planilha-whatsapp');

    act(() => getStepsList().focus());
    expect(getWindow()).toHaveAttribute('data-paused', 'true');
    expect(screen.getByText(homeCopy.hero.panel.status.running)).toBeInTheDocument();
    expect(screen.queryByText(homeCopy.hero.panel.status.paused)).not.toBeInTheDocument();
  });

  it('keeps "pausado" when the pointer comes and goes, and when the task changes', () => {
    const { rerender } = renderPanel('planilha-whatsapp');
    fireEvent.click(getPauseButton());

    fireEvent.pointerEnter(getBody());
    fireEvent.pointerLeave(getBody());
    expect(screen.getByText(homeCopy.hero.panel.status.paused)).toBeInTheDocument();

    rerender(<AutomationPanel task="notas" />);
    expect(screen.getByText(homeCopy.hero.panel.status.paused)).toBeInTheDocument();
  });

  it('says "rodando" without motion, where there is no pause control', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });
    renderPanel('planilha-whatsapp');

    expect(screen.getByText(homeCopy.hero.panel.status.running)).toBeInTheDocument();
    expect(screen.queryByText(homeCopy.hero.panel.status.paused)).not.toBeInTheDocument();
  });
});

describe('AutomationPanel with reduced motion', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the four rows already done and creates no timer', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });
    renderPanel('planilha-whatsapp');

    expect(getDoneRows()).toHaveLength(ROW_COUNT);
    expect(vi.getTimerCount()).toBe(0);
    advance(ROW_COUNT * 2);
    expect(getDoneRows()).toHaveLength(ROW_COUNT);
  });

  it('shows every done text, marks no step and draws no tilt', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true, [MD_QUERY]: true });
    const { container } = renderPanel('atendimento');

    getRows().forEach((row) => expect(getDoneText(row)).not.toHaveAttribute('aria-hidden'));
    expect(getRunningStep()).toBeUndefined();
    expect(getCurrentStep()).toBeUndefined();
    expect(container.querySelector('[style*="rotateX"]')).toBeNull();
  });

  it('does not render the pause control, because nothing moves, and never marks the window as paused', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });
    renderPanel('planilha-whatsapp');

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(getWindow()).not.toHaveAttribute('data-paused');
    fireEvent.pointerEnter(getBody());
    expect(getWindow()).not.toHaveAttribute('data-paused');
  });
});
