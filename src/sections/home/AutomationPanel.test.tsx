import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flowPanel, flowSources, flowSteps, heroFlows } from '../../data/heroFlows';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import { AutomationPanel } from './AutomationPanel';

const STEP_MS = 1400;
const ROW_COUNT = 4;
const WIDE_QUERY = '(min-width: 768px)';

function getRows(): HTMLElement[] {
  return within(screen.getByRole('list', { name: flowPanel.aria.rows })).getAllByRole('listitem');
}

function getDoneRows(): HTMLElement[] {
  return getRows().filter((row) => row.dataset.state === 'done');
}

function getSteps(): HTMLElement[] {
  return within(screen.getByRole('list', { name: flowPanel.aria.steps })).getAllByRole('listitem');
}

function getCurrentStep(): string | undefined {
  return getSteps().find((step) => step.getAttribute('aria-current') === 'step')?.textContent ?? undefined;
}

/** The element that listens for the pointer and the focus, which is the parent of the window. */
function getPanelRoot(): HTMLElement {
  return screen.getByText(flowPanel.title).closest('[data-flow-window]') as HTMLElement;
}

function advance(steps: number): void {
  act(() => {
    vi.advanceTimersByTime(steps * STEP_MS);
  });
}

describe('AutomationPanel content', () => {
  it('shows the window title, the status and the footnote exactly as approved', () => {
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);

    expect(screen.getByText('automação ao vivo')).toBeInTheDocument();
    expect(screen.getByText('rodando')).toBeInTheDocument();
    expect(screen.getByText('Exemplo ilustrativo. O fluxo real sai do diagnóstico.')).toBeInTheDocument();
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

    expect(container.querySelectorAll('[class*="vn-accent"]')).toHaveLength(0);
    expect(container.innerHTML.toLowerCase()).not.toContain('00e5a0');
  });

  it('draws icons as svg only, with no glyph characters for the checks or the sources', () => {
    const { container } = renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);

    expect(container.textContent).not.toMatch(/[✓✔→←▶▸]/);
    getRows().forEach((row) => expect(row.querySelector('svg')).not.toBeNull());
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

  it('shows the done text of a row only once the row is done', () => {
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);
    const doneText = getRows()[0].querySelector('[data-flow-done]') as HTMLElement;

    expect(doneText).toHaveTextContent('recebido');
    expect(doneText).toHaveAttribute('aria-hidden', 'true');

    advance(1);

    expect(doneText).not.toHaveAttribute('aria-hidden');
  });

  it('moves the highlighted step with the beat: step k modulo 4', () => {
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);

    expect(getCurrentStep()).toBe('receber');
    advance(1);
    expect(getCurrentStep()).toBe('entender');
    advance(1);
    expect(getCurrentStep()).toBe('executar');
    advance(1);
    expect(getCurrentStep()).toBe('avisar');
    advance(1);
    expect(getCurrentStep()).toBe('receber');
  });

  it('pauses while the pointer is over the panel and goes on when it leaves', () => {
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);
    advance(1);

    fireEvent.pointerEnter(getPanelRoot());
    advance(3);
    expect(getDoneRows()).toHaveLength(1);

    fireEvent.pointerLeave(getPanelRoot());
    advance(1);
    expect(getDoneRows()).toHaveLength(2);
  });

  it('pauses while the focus is inside the panel and goes on when it leaves', () => {
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);
    advance(1);
    const steps = screen.getByRole('list', { name: flowPanel.aria.steps });

    act(() => steps.focus());
    advance(3);
    expect(getDoneRows()).toHaveLength(1);

    act(() => steps.blur());
    advance(1);
    expect(getDoneRows()).toHaveLength(2);
  });

  it('stays paused while one of the two holds is still on', () => {
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);
    const steps = screen.getByRole('list', { name: flowPanel.aria.steps });

    act(() => steps.focus());
    fireEvent.pointerEnter(getPanelRoot());
    fireEvent.pointerLeave(getPanelRoot());
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

  it('shows every done text, highlights no step and draws no tilt', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true, [WIDE_QUERY]: true });
    const { container } = renderWithProviders(<AutomationPanel task="atendimento" />);

    getRows().forEach((row) => {
      expect(row.querySelector('[data-flow-done]')).not.toHaveAttribute('aria-hidden');
    });
    expect(getCurrentStep()).toBeUndefined();
    expect(container.querySelector('[style*="rotateX"]')).toBeNull();
  });
});

describe('AutomationPanel tilt', () => {
  function getTilted(container: HTMLElement): HTMLElement {
    return container.querySelector('[data-flow-tilt]') as HTMLElement;
  }

  it('starts leaning back 14 degrees and a little smaller from md up, with its own perspective', () => {
    stubMatchMedia({ [WIDE_QUERY]: true });
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

  it('animates transform properties only', () => {
    const { container } = renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);

    const style = getTilted(container).style;
    expect(style.width).toBe('');
    expect(style.height).toBe('');
    expect(style.top).toBe('');
    expect(style.margin).toBe('');
  });
});

describe('AutomationPanel steps and cable', () => {
  it('scrolls the steps sideways inside the panel below md, reachable by keyboard and named', () => {
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);

    const steps = screen.getByRole('list', { name: flowPanel.aria.steps });
    expect(steps).toHaveClass('overflow-x-auto', 'scrollbar-hide');
    expect(steps).toHaveAttribute('tabindex', '0');
  });

  it('is not a tab stop from md up, where the steps fit', () => {
    stubMatchMedia({ [WIDE_QUERY]: true });
    renderWithProviders(<AutomationPanel task="planilha-whatsapp" />);

    expect(screen.getByRole('list', { name: flowPanel.aria.steps })).not.toHaveAttribute('tabindex');
  });

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
});
