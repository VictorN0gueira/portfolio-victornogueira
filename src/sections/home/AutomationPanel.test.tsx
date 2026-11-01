import { act, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flowPanel, flowSources, flowSteps, heroFlows } from '../../data/heroFlows';
import { homeCopy } from '../../data/homeCopy';
import { MD_QUERY } from '../../lib/breakpoints';
import { findAccentElements } from '../../test/accent';
import { ROW_COUNT, getRows, getDoneRows, getSteps, getDoneText, getWindow, getPauseButton, advance, renderPanel } from '../../test/automationPanelKit';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from '../../test/matchMedia';

// The setup file does not restore spies, so a stub left by a failing test would leak into the next ones.
afterEach(() => {
  vi.restoreAllMocks();
});

describe('AutomationPanel content', () => {
  it('shows the window title, the status and the footnote of the copy module', () => {
    renderPanel('planilha-whatsapp');

    expect(screen.getByText(flowPanel.title)).toBeInTheDocument();
    expect(screen.getByText(homeCopy.hero.panel.status.running)).toBeInTheDocument();
    expect(screen.getByText(flowPanel.footnote)).toBeInTheDocument();
  });

  it('lists the four rows of the chosen task, in order, with their detail', () => {
    renderPanel('planilha-whatsapp');

    const rows = getRows();
    expect(rows).toHaveLength(ROW_COUNT);
    heroFlows['planilha-whatsapp'].forEach((flowRow, index) => {
      expect(rows[index]).toHaveTextContent(flowRow.title);
      expect(rows[index]).toHaveTextContent(flowRow.detail);
    });
  });

  it('shows the rows of the notes task, with "Nota emitida" in it', () => {
    renderPanel('notas');

    expect(screen.getByText('Nota emitida')).toBeInTheDocument();
    expect(screen.queryByText('Pedido chega no WhatsApp')).not.toBeInTheDocument();
  });

  it('names the four steps and the four sources', () => {
    renderPanel('planilha-whatsapp');

    expect(getSteps().map((step) => step.textContent)).toEqual([...flowSteps]);
    const sources = within(screen.getByRole('list', { name: flowPanel.aria.sources })).getAllByRole('listitem');
    expect(sources.map((source) => source.textContent)).toEqual([...flowSources]);
  });

  it('uses no accent color anywhere inside it', () => {
    const { container } = renderPanel('planilha-whatsapp');

    expect(findAccentElements(container)).toHaveLength(0);
  });

  it('draws icons as svg only, with no glyph characters for the checks, the sources or the pause control', () => {
    const { container } = renderPanel('planilha-whatsapp');

    expect(container.textContent).not.toMatch(/[✓✔→←▶▸⏸⏯]/);
    getRows().forEach((row) => expect(row.querySelector('svg')).not.toBeNull());
    expect(getPauseButton().querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(getPauseButton().textContent).toBe('');
  });
});

describe('AutomationPanel semantics', () => {
  it('is a named group, with the title and the detail of every row always exposed', () => {
    renderPanel('planilha-whatsapp');

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
      renderPanel('planilha-whatsapp');
      advance(2);

      expect(getDoneRows()).toHaveLength(2);
      getRows().forEach((row) => expect(getDoneText(row)).toHaveAttribute('aria-hidden', 'true'));
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('AutomationPanel tilt', () => {
  function getTilted(container: HTMLElement): HTMLElement {
    return container.querySelector('[data-flow-tilt]') as HTMLElement;
  }

  it('starts leaning back 14 degrees and a little smaller from md up, with its own perspective', () => {
    stubMatchMedia({ [MD_QUERY]: true });
    const { container } = renderPanel('planilha-whatsapp');

    const { transform, transformOrigin } = getTilted(container).style;
    expect(transform).toContain('perspective(1400px)');
    expect(transform).toContain('rotateX(14deg)');
    expect(transform).toContain('scale(0.94)');
    expect(transformOrigin).toBe('top center');
  });

  it('starts at 8 degrees below md', () => {
    const { container } = renderPanel('planilha-whatsapp');

    expect(getTilted(container).style.transform).toContain('rotateX(8deg)');
  });

  it('writes nothing but the perspective, the rotation and the scale into the transform', () => {
    const { container } = renderPanel('planilha-whatsapp');

    const functions = getTilted(container).style.transform.match(/\w+(?=\()/g) ?? [];
    expect([...functions].sort()).toEqual(['perspective', 'rotateX', 'scale']);
  });
});

describe('AutomationPanel steps and cable', () => {
  it('draws the cable as svg that screen readers skip, with a pulse that CSS animates', () => {
    const { container } = renderPanel('planilha-whatsapp');

    const cables = container.querySelectorAll('[data-flow-cable]');
    expect(cables.length).toBeGreaterThan(0);
    cables.forEach((cable) => {
      expect(cable.tagName.toLowerCase()).toBe('svg');
      expect(cable).toHaveAttribute('aria-hidden', 'true');
      expect(cable.querySelector('.vn-cable-pulse')).not.toBeNull();
    });
  });

  it('normalizes the path length of every pulse to 100, so one dash fits cables of any size, and sets no layout style', () => {
    const { container } = renderPanel('planilha-whatsapp');

    container.querySelectorAll('.vn-cable-pulse').forEach((pulse) => {
      expect(pulse).toHaveAttribute('pathLength', '100');
      expect(pulse.getAttribute('style') ?? '').not.toMatch(/width|height|top|left/);
    });
  });

  it('draws the cable column and the grid column from the same width', () => {
    const { container } = renderPanel('planilha-whatsapp');

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
    renderPanel('planilha-whatsapp');

    const steps = screen.getByRole('list', { name: flowPanel.aria.steps });
    expect(steps).toHaveClass('overflow-x-auto', 'scrollbar-hide');
    expect(steps).toHaveAttribute('tabindex', '0');
  });

  it('is not a tab stop when the steps fit, at any screen width', () => {
    scrollWidth = 300;
    clientWidth = 300;
    stubMatchMedia({ [MD_QUERY]: false });
    renderPanel('planilha-whatsapp');

    expect(screen.getByRole('list', { name: flowPanel.aria.steps })).not.toHaveAttribute('tabindex');
  });

  it('fades the right edge and keeps room at the end while the steps overflow, so a clipped pill reads as scrollable (V:D11)', () => {
    scrollWidth = 420;
    clientWidth = 300;
    renderPanel('planilha-whatsapp');

    const steps = screen.getByRole('list', { name: flowPanel.aria.steps });
    expect(steps.className).toContain('[mask-image:linear-gradient(to_right,#000_calc(100%-2rem),transparent)]');
    expect(steps).toHaveClass('pr-8');
  });

  it('draws no fade and no extra padding when the steps fit', () => {
    scrollWidth = 300;
    clientWidth = 300;
    renderPanel('planilha-whatsapp');

    const steps = screen.getByRole('list', { name: flowPanel.aria.steps });
    expect(steps.className).not.toContain('mask-image');
    expect(steps).not.toHaveClass('pr-8');
  });
});

describe('AutomationPanel motion preference', () => {
  it('keeps the same window in the page when the visitor turns motion off, so nothing remounts', () => {
    const media = stubMatchMedia();
    renderPanel('planilha-whatsapp');
    const windowBefore = getWindow();

    act(() => media.set(REDUCED_MOTION_QUERY, true));

    expect(getWindow()).toBe(windowBefore);
    expect(screen.queryByRole('button', { name: /animação$/ })).not.toBeInTheDocument();
  });

  it('lies flat without motion, and the same two wrapper elements stay', async () => {
    const media = stubMatchMedia();
    const { container } = renderPanel('planilha-whatsapp');
    const tilted = container.querySelector('[data-flow-tilt]') as HTMLElement;
    expect(tilted.style.transform).toContain('rotateX');

    act(() => media.set(REDUCED_MOTION_QUERY, true));

    expect(container.querySelector('[data-flow-tilt]')).toBe(tilted);
    await waitFor(() => expect(tilted.style.transform).toBe('none'));
  });
});
