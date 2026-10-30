import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flowPanel, flowSources, flowSteps, heroFlows } from '../../data/heroFlows';
import { homeCopy } from '../../data/homeCopy';
import { MD_QUERY } from '../../lib/breakpoints';
import { findAccentElements } from '../../test/accent';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import { AutomationPanel } from './AutomationPanel';

const STEP_MS = 1400;
const ROW_COUNT = 4;
const { panel: panelCopy } = homeCopy.hero;

// The setup file does not restore spies, so a stub left by a failing test would leak into the next ones.
afterEach(() => {
  vi.restoreAllMocks();
});

function getRows(): HTMLElement[] {
  return within(screen.getByRole('list', { name: flowPanel.aria.rows })).getAllByRole('listitem');
}

function getDoneRows(): HTMLElement[] {
  return getRows().filter((row) => row.dataset.state === 'done');
}

function getSteps(): HTMLElement[] {
  return within(screen.getByRole('list', { name: flowPanel.aria.steps })).getAllByRole('listitem');
}

/** The step that runs: only marked, with data-active, while the cycle is running. */
function getRunningStep(): string | undefined {
  return getSteps().find((step) => step.dataset.active === 'true')?.textContent ?? undefined;
}

/** The step the cycle stopped on: only marked, with aria-current, while it does not run. */
function getCurrentStep(): string | undefined {
  return getSteps().find((step) => step.getAttribute('aria-current') === 'step')?.textContent ?? undefined;
}

function getDoneText(row: HTMLElement): HTMLElement {
  return row.querySelector('[data-flow-done]') as HTMLElement;
}

/** The group that carries data-paused. */
function getWindow(): HTMLElement {
  return screen.getByRole('group', { name: panelCopy.label });
}

/** The body of the window: the part that listens for the pointer and the focus. The title bar is not in it. */
function getBody(): HTMLElement {
  return getWindow().querySelector('[data-flow-body]') as HTMLElement;
}

function getStepsList(): HTMLElement {
  return screen.getByRole('list', { name: flowPanel.aria.steps });
}

/**
 * Makes the steps row wider than its box, so it is a tab stop that can take the focus.
 * The spies are undone by the afterEach at the top of this file, also when a test fails before its last line.
 */
function stubOverflowingSteps(): void {
  vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockImplementation(() => 420);
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(() => 300);
}

function getPauseButton(): HTMLElement {
  return screen.getByRole('button', { name: /animação$/ });
}

function advance(steps: number): void {
  act(() => {
    vi.advanceTimersByTime(steps * STEP_MS);
  });
}

describe('AutomationPanel content', () => {
  it('shows the window title, the status and the footnote of the copy module', () => {
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);

    expect(screen.getByText(flowPanel.title)).toBeInTheDocument();
    expect(screen.getByText(homeCopy.hero.panel.status.running)).toBeInTheDocument();
    expect(screen.getByText(flowPanel.footnote)).toBeInTheDocument();
  });

  it('lists the four rows of the chosen task, in order, with their detail', () => {
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);

    const rows = getRows();
    expect(rows).toHaveLength(ROW_COUNT);
    heroFlows['planilha-whatsapp'].forEach((flowRow, index) => {
      expect(rows[index]).toHaveTextContent(flowRow.title);
      expect(rows[index]).toHaveTextContent(flowRow.detail);
    });
  });

  it('shows the rows of the notes task, with "Nota emitida" in it', () => {
    renderWithProviders(<AutomationPanel task="notas" />);

    expect(screen.getByText('Nota emitida')).toBeInTheDocument();
    expect(screen.queryByText('Pedido chega no WhatsApp')).not.toBeInTheDocument();
  });

  it('names the four steps and the four sources', () => {
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);

    expect(getSteps().map((step) => step.textContent)).toEqual([...flowSteps]);
    const sources = within(screen.getByRole('list', { name: flowPanel.aria.sources })).getAllByRole('listitem');
    expect(sources.map((source) => source.textContent)).toEqual([...flowSources]);
  });

  it('uses no accent color anywhere inside it', () => {
    const { container } = renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);

    expect(findAccentElements(container)).toHaveLength(0);
  });

  it('draws icons as svg only, with no glyph characters for the checks, the sources or the pause control', () => {
    const { container } = renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);

    expect(container.textContent).not.toMatch(/[✓✔→←▶▸⏸⏯]/);
    getRows().forEach((row) => expect(row.querySelector('svg')).not.toBeNull());
    expect(getPauseButton().querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(getPauseButton().textContent).toBe('');
  });
});

describe('AutomationPanel semantics', () => {
  it('is a named group, with the title and the detail of every row always exposed', () => {
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);

    expect(getWindow()).toHaveAccessibleName(homeCopy.hero.panel.label);
    getRows().forEach((row) => {
      const exposed = Array.from(row.querySelectorAll('p'));
      expect(exposed).toHaveLength(2);
      exposed.forEach((text) => expect(text.closest('[aria-hidden="true"]')).toBeNull());
    });
  });

  it('keeps the done text hidden from assistive tech on every row while the cycle runs, done rows included', () => {
    vi.useFakeTimers();
    try {
      renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);
      advance(2);

      expect(getDoneRows()).toHaveLength(2);
      getRows().forEach((row) => expect(getDoneText(row)).toHaveAttribute('aria-hidden', 'true'));
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('AutomationPanel cycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with no row done and the first one running', () => {
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);

    expect(getDoneRows()).toHaveLength(0);
    expect(getRows().map((row) => row.dataset.state)).toEqual(['active', 'pending', 'pending', 'pending']);
  });

  it('marks one row done after 1400ms and four after 4 times that', () => {
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);

    advance(1);
    expect(getDoneRows()).toHaveLength(1);
    expect(getRows()[0]).toHaveAttribute('data-state', 'done');
    expect(getRows()[1]).toHaveAttribute('data-state', 'active');

    advance(3);
    expect(getDoneRows()).toHaveLength(ROW_COUNT);
  });

  it('restarts on the fifth beat, with every row pending again', () => {
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);

    advance(ROW_COUNT);
    expect(getDoneRows()).toHaveLength(ROW_COUNT);
    advance(1);

    expect(getDoneRows()).toHaveLength(0);
    expect(getRows()[0]).toHaveAttribute('data-state', 'active');
  });

  it('moves the running step with the beat, step k modulo 4, marked with data-active and never with aria-current', () => {
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);

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
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);
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
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);
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
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);
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
    const { rerender } = renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);
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
    const { unmount } = renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);
    advance(1);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('AutomationPanel pause control', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sits in the title bar next to the status, named by the pause label of the copy module and not pressed', () => {
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);

    const titleBar = screen.getByText(flowPanel.title).parentElement as HTMLElement;
    expect(titleBar.contains(getPauseButton())).toBe(true);
    expect(titleBar.contains(screen.getByText(panelCopy.status.running))).toBe(true);
    expect(getPauseButton()).toHaveAccessibleName(homeCopy.hero.panel.pause);
    expect(getPauseButton()).toHaveAttribute('aria-pressed', 'false');
    expect(getPauseButton()).toHaveAttribute('type', 'button');
  });

  it('has a 52px hit area (44px is the least it may show when the panel tilts), a visible focus ring that works on the dark bar, and is a small icon button to the eye', () => {
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);

    expect(getPauseButton()).toHaveClass('size-[3.25rem]', 'focus-visible:outline-2', 'focus-visible:outline-vn-white');
    expect(getPauseButton().firstElementChild).toHaveClass('size-7', 'rounded-full');
  });

  // The button was moved onto the shared PauseToggle (dark tone) with no change of look: these are the exact classes it had.
  it('has exactly the classes of the dark tone of the shared toggle, with the 52px hit area and the margins that keep the title bar', () => {
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);
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
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);
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
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);

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
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);
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
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);

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
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);
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
    const { rerender } = renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);
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
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);
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
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);
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
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);

    expect(screen.getByText(homeCopy.hero.panel.status.running)).toBeInTheDocument();
    expect(screen.queryByText(homeCopy.hero.panel.status.paused)).not.toBeInTheDocument();
  });

  it('says "pausado" when the visitor paused it, and "rodando" again when they resume', () => {
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);
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
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);

    act(() => getStepsList().focus());
    expect(getWindow()).toHaveAttribute('data-paused', 'true');
    expect(screen.getByText(homeCopy.hero.panel.status.running)).toBeInTheDocument();
    expect(screen.queryByText(homeCopy.hero.panel.status.paused)).not.toBeInTheDocument();
  });

  it('keeps "pausado" when the pointer comes and goes, and when the task changes', () => {
    const { rerender } = renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);
    fireEvent.click(getPauseButton());

    fireEvent.pointerEnter(getBody());
    fireEvent.pointerLeave(getBody());
    expect(screen.getByText(homeCopy.hero.panel.status.paused)).toBeInTheDocument();

    rerender(<AutomationPanel task="notas" />);
    expect(screen.getByText(homeCopy.hero.panel.status.paused)).toBeInTheDocument();
  });

  it('says "rodando" without motion, where there is no pause control', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);

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
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);

    expect(getDoneRows()).toHaveLength(ROW_COUNT);
    expect(vi.getTimerCount()).toBe(0);
    advance(ROW_COUNT * 2);
    expect(getDoneRows()).toHaveLength(ROW_COUNT);
  });

  it('shows every done text, marks no step and draws no tilt', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true, [MD_QUERY]: true });
    const { container } = renderWithProviders(<AutomationPanel task="atendimento" />);

    getRows().forEach((row) => expect(getDoneText(row)).not.toHaveAttribute('aria-hidden'));
    expect(getRunningStep()).toBeUndefined();
    expect(getCurrentStep()).toBeUndefined();
    expect(container.querySelector('[style*="rotateX"]')).toBeNull();
  });

  it('does not render the pause control, because nothing moves, and never marks the window as paused', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(getWindow()).not.toHaveAttribute('data-paused');
    fireEvent.pointerEnter(getBody());
    expect(getWindow()).not.toHaveAttribute('data-paused');
  });
});

describe('AutomationPanel tilt', () => {
  function getTilted(container: HTMLElement): HTMLElement {
    return container.querySelector('[data-flow-tilt]') as HTMLElement;
  }

  it('starts leaning back 14 degrees and a little smaller from md up, with its own perspective', () => {
    stubMatchMedia({ [MD_QUERY]: true });
    const { container } = renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);

    const { transform, transformOrigin } = getTilted(container).style;
    expect(transform).toContain('perspective(1400px)');
    expect(transform).toContain('rotateX(14deg)');
    expect(transform).toContain('scale(0.94)');
    expect(transformOrigin).toBe('top center');
  });

  it('starts at 8 degrees below md', () => {
    const { container } = renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);

    expect(getTilted(container).style.transform).toContain('rotateX(8deg)');
  });

  it('writes nothing but the perspective, the rotation and the scale into the transform', () => {
    const { container } = renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);

    const functions = getTilted(container).style.transform.match(/\w+(?=\()/g) ?? [];
    expect([...functions].sort()).toEqual(['perspective', 'rotateX', 'scale']);
  });
});

describe('AutomationPanel steps and cable', () => {
  it('draws the cable as svg that screen readers skip, with a pulse that CSS animates', () => {
    const { container } = renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);

    const cables = container.querySelectorAll('[data-flow-cable]');
    expect(cables.length).toBeGreaterThan(0);
    cables.forEach((cable) => {
      expect(cable.tagName.toLowerCase()).toBe('svg');
      expect(cable).toHaveAttribute('aria-hidden', 'true');
      expect(cable.querySelector('.vn-cable-pulse')).not.toBeNull();
    });
  });

  it('normalizes the path length of every pulse to 100, so one dash fits cables of any size, and sets no layout style', () => {
    const { container } = renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);

    container.querySelectorAll('.vn-cable-pulse').forEach((pulse) => {
      expect(pulse).toHaveAttribute('pathLength', '100');
      expect(pulse.getAttribute('style') ?? '').not.toMatch(/width|height|top|left/);
    });
  });

  it('draws the cable column and the grid column from the same width', () => {
    const { container } = renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);

    const grid = container.querySelector('[data-flow-grid]') as HTMLElement;
    const desktopCable = container.querySelector('svg[data-flow-cable].md\\:block') as SVGElement;
    expect(grid.style.getPropertyValue('--cable-w')).toBe(`${desktopCable.getAttribute('width')}px`);
    expect(grid.className).toContain('md:grid-cols-[10rem_var(--cable-w)_minmax(0,1fr)]');
    expect(grid.className).not.toContain('72px');
  });
});

describe('AutomationPanel steps row', () => {
  let scrollWidth = 0;
  let clientWidth = 0;

  beforeEach(() => {
    vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockImplementation(() => scrollWidth);
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(() => clientWidth);
  });

  it('scrolls sideways inside the panel, hides its scrollbar, and is a named tab stop when the steps do overflow', () => {
    scrollWidth = 420;
    clientWidth = 300;
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);

    const steps = screen.getByRole('list', { name: flowPanel.aria.steps });
    expect(steps).toHaveClass('overflow-x-auto', 'scrollbar-hide');
    expect(steps).toHaveAttribute('tabindex', '0');
  });

  it('is not a tab stop when the steps fit, at any screen width', () => {
    scrollWidth = 300;
    clientWidth = 300;
    stubMatchMedia({ [MD_QUERY]: false });
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);

    expect(screen.getByRole('list', { name: flowPanel.aria.steps })).not.toHaveAttribute('tabindex');
  });
});
