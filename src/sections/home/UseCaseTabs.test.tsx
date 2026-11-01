import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { homeCopy } from '../../data/homeCopy';
import { useCases } from '../../data/useCases';
import { findAccentElements } from '../../test/accent';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from '../../test/matchMedia';
import { A11Y_STORAGE_KEY } from '../../contexts/AccessibilityContext';
import {
  ROTATE_MS,
  TAB_NAMES,
  advance,
  copy,
  getPanelGroup,
  getPauseToggle,
  getSelectedName,
  getTab,
  getTablist,
  renderTabs,
} from '../../test/useCaseTabsKit';

// The em dash and the en dash, built from char codes so no file holds them literally.
const DASH_PATTERN = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
// Space, slash, space: the separator the copy rules forbid, built from char codes so no file holds it literally.
const SLASH_SEPARATOR = String.fromCharCode(0x20, 0x2f, 0x20);

/** The aria-hidden copies that sit next to the live tabpanel in its grid cell, found by structure and not by their class. */
function getSizers(): HTMLElement[] {
  const cell = screen.getByRole('tabpanel').parentElement as HTMLElement;
  return (Array.from(cell.children) as HTMLElement[]).filter((child) => child.getAttribute('aria-hidden') === 'true');
}

// The setup file does not restore spies, so a spy left by a failing test would leak into the next ones.
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('UseCaseTabs content', () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  it('shows the kicker, the heading, the sub line and the note exactly as approved', () => {
    renderTabs();

    expect(screen.getByText('onde a automação entra')).toBeInTheDocument();
    expect(screen.getByText('Começa pelo processo que mais pesa na rotina')).toBeInTheDocument();
    expect(
      screen.getByText(homeCopy.useCases.sub),
    ).toBeInTheDocument();
    expect(screen.getByText(homeCopy.useCases.note)).toBeInTheDocument();
  });

  it('has exactly one h2, the heading of the section, and names the section by it', () => {
    renderTabs();

    const headings = screen.getAllByRole('heading', { level: 2 });

    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Começa pelo processo que mais pesa na rotina');
    expect(screen.getByRole('region', { name: /Começa pelo processo/ })).toBeInTheDocument();
  });

  it('titles the panel with an h3, so the outline is h2 and then h3', () => {
    renderTabs();

    const titles = screen.getAllByRole('heading', { level: 3 });

    expect(titles).toHaveLength(1);
    expect(titles[0]).toHaveTextContent(useCases[0].title);
    expect(screen.getAllByRole('heading').map((heading) => heading.tagName)).toEqual(['H2', 'H3']);
  });

  it('lists the four use cases as tabs, in order, in a tablist that has an accessible name', () => {
    renderTabs();

    expect(getTablist()).toHaveAccessibleName('Casos de uso');
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([...TAB_NAMES]);
    expect(getSelectedName()).toBe('Atendimento');
  });

  it.each(useCases.map((useCase, index) => [useCase.tab, index] as const))(
    'shows the title, the body and the three steps of %s once it is selected',
    (name, index) => {
      renderTabs();

      fireEvent.click(getTab(name));
      const panel = screen.getByRole('tabpanel');
      const { title, body, steps } = useCases[index];

      expect(within(panel).getByRole('heading', { level: 3 })).toHaveTextContent(title);
      expect(within(panel).getByText(body)).toBeInTheDocument();
      const items = within(panel).getAllByRole('listitem');
      expect(items).toHaveLength(3);
      steps.forEach((step, stepIndex) => expect(items[stepIndex]).toHaveTextContent(step));
    },
  );

  it('lists the steps in an ordered list named by the "como funciona" label, numbered in the mono font', () => {
    renderTabs();
    const panel = screen.getByRole('tabpanel');

    const list = within(panel).getByRole('list', { name: copy.stepsTitle });

    expect(list.tagName).toBe('OL');
    const numbers = Array.from(list.querySelectorAll('li')).map((item) => item.querySelector('[data-step-number]'));
    expect(numbers.map((number) => number?.textContent)).toEqual(['01', '02', '03']);
    numbers.forEach((number) => {
      expect(number).toHaveClass('font-mono');
      expect(number).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('uses no accent anywhere, draws icons as svg and keeps dashes and slash separators out of the text', () => {
    const { container } = renderTabs();
    expect(findAccentElements(container)).toHaveLength(0);
    expect(container.textContent).not.toMatch(DASH_PATTERN);
    expect(container.textContent).not.toContain(SLASH_SEPARATOR);
    container.querySelectorAll('svg').forEach((icon) => expect(icon).toHaveAttribute('aria-hidden', 'true'));
  });
});

describe('UseCaseTabs semantics', () => {
  beforeEach(() => {
    stubMatchMedia();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('has no live region, so the rotation is never announced', () => {
    const { container } = renderTabs();
    advance(ROTATE_MS);

    expect(container.querySelector('[aria-live]')).toBeNull();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('gives only the selected tab a tab stop, and moves it with the selection', () => {
    renderTabs();

    expect(screen.getAllByRole('tab').map((tab) => tab.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1']);

    advance(ROTATE_MS);

    expect(screen.getAllByRole('tab').map((tab) => tab.getAttribute('tabindex'))).toEqual(['-1', '0', '-1', '-1']);
  });

  it('wires every tab to the one tabpanel, and the tabpanel back to the selected tab', () => {
    renderTabs();
    const panel = screen.getByRole('tabpanel');

    for (const tab of screen.getAllByRole('tab')) {
      expect(tab).toHaveAttribute('aria-controls', panel.id);
    }
    expect(document.getElementById(panel.id)).toBe(panel);
    expect(panel).toHaveAttribute('aria-labelledby', getTab('Atendimento').id);
    expect(panel).toHaveAccessibleName('Atendimento');

    advance(ROTATE_MS);

    expect(screen.getByRole('tabpanel')).toBe(panel);
    expect(panel).toHaveAttribute('aria-labelledby', getTab('Comercial').id);
    expect(panel).toHaveAccessibleName('Comercial');
  });

  it('makes the panel a tab stop, since nothing inside it takes the focus', () => {
    renderTabs();

    expect(screen.getByRole('tabpanel')).toHaveAttribute('tabindex', '0');
    expect(within(screen.getByRole('tabpanel')).queryByRole('link')).not.toBeInTheDocument();
    expect(within(screen.getByRole('tabpanel')).queryByRole('button')).not.toBeInTheDocument();
  });

  it('draws every tab as a 44px tall button, with the selected one in ink and white', () => {
    renderTabs();

    for (const tab of screen.getAllByRole('tab')) {
      expect(tab.tagName).toBe('BUTTON');
      expect(tab).toHaveAttribute('type', 'button');
      expect(tab).toHaveClass('min-h-11');
    }
    expect(getTab('Atendimento')).toHaveClass('bg-vn-ink', 'text-vn-white');
    expect(getTab('Comercial')).not.toHaveClass('bg-vn-ink');
  });

  it('scrolls the tablist sideways with scroll snap below sm and wraps the tabs from sm up', () => {
    renderTabs();

    expect(getTablist()).toHaveClass(
      'overflow-x-auto',
      'overscroll-x-contain',
      'snap-x',
      'snap-mandatory',
      'scrollbar-hide',
      'sm:flex-wrap',
      'sm:flex-initial',
      'sm:overflow-visible',
      'sm:snap-none',
    );
  });

  it('keeps an invisible copy of each of the four contents in the cell of the panel, hidden from assistive tech and the pointer', () => {
    renderTabs();

    const sizers = getSizers();

    expect(sizers).toHaveLength(useCases.length);
    sizers.forEach((sizer, index) => {
      expect(sizer).toHaveAttribute('aria-hidden', 'true');
      expect(sizer).toHaveClass('invisible');
      expect(sizer).toHaveTextContent(useCases[index].title);
    });
  });

  it('draws the sizers with plain divs, with no reveal group or item of their own, and the same layout classes as the live content', () => {
    renderTabs();

    getSizers().forEach((sizer) => {
      expect(sizer.querySelector('[data-reveal-group], [data-reveal-item]')).toBeNull();
      expect((sizer.firstElementChild as HTMLElement).className).toBe(getPanelGroup().className);
    });
  });

  it('has no repeated id on the page, the sizers included', () => {
    renderTabs();

    const ids = Array.from(document.querySelectorAll('[id]')).map((element) => element.id);

    expect(ids.length).toBeGreaterThan(useCases.length * 2);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('stacks the text and the "como funciona" card below lg and puts them side by side from lg', () => {
    renderTabs();

    expect(getPanelGroup()).toHaveClass('grid', 'grid-cols-1');
    expect(getPanelGroup().className).toMatch(/lg:grid-cols-/);
  });
});

describe('UseCaseTabs auto rotation', () => {
  beforeEach(() => {
    stubMatchMedia();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('selects Comercial after the rotation interval and goes on every the rotation interval, wrapping back to Atendimento', () => {
    renderTabs();
    expect(getSelectedName()).toBe('Atendimento');

    advance(ROTATE_MS);
    expect(getSelectedName()).toBe('Comercial');
    advance(ROTATE_MS);
    expect(getSelectedName()).toBe('Financeiro');
    advance(ROTATE_MS);
    expect(getSelectedName()).toBe('Operações');
    advance(ROTATE_MS);
    expect(getSelectedName()).toBe('Atendimento');
  });

  it('shows the content of the use case it rotated to', () => {
    renderTabs();

    advance(ROTATE_MS);

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(useCases[1].title);
  });

  // The reveal is not replayed by the rotation (see UseCaseTabs.browse.test.tsx), so the panel keeps its one group.
  it('keeps one reveal group in the panel after a rotation', () => {
    renderTabs();

    advance(ROTATE_MS);

    expect(screen.getByRole('tabpanel').querySelectorAll('[data-reveal-group]')).toHaveLength(1);
  });

  it('keeps a single reveal group for the whole panel, and none per item', () => {
    const { container } = renderTabs();

    // One for the header of the section and one for the panel.
    expect(container.querySelectorAll('[data-reveal-group]')).toHaveLength(2);
    expect(getPanelGroup().querySelectorAll('[data-reveal-item]').length).toBeGreaterThan(3);
  });

  it('keeps the selection when a tab is clicked, for good', () => {
    renderTabs();

    fireEvent.click(getTab('Financeiro'));
    expect(getSelectedName()).toBe('Financeiro');

    advance(10_000);
    expect(getSelectedName()).toBe('Financeiro');
  });

  it('keeps no timer after it unmounts', () => {
    const { unmount } = renderTabs();
    advance(ROTATE_MS);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });

  it('never moves the DOM focus when it rotates, with nothing focused or with the pause toggle focused', () => {
    const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
    renderTabs();

    advance(ROTATE_MS);
    advance(ROTATE_MS);
    expect(focusSpy).not.toHaveBeenCalled();
    expect(document.body).toHaveFocus();

    act(() => getPauseToggle().focus());
    advance(ROTATE_MS);

    expect(getSelectedName()).toBe('Operações');
    expect(getPauseToggle()).toHaveFocus();
  });
});

describe('UseCaseTabs without motion', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('never advances and creates no timer when the system asks for reduced motion', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });
    renderTabs();

    expect(vi.getTimerCount()).toBe(0);
    advance(ROTATE_MS * 5);

    expect(getSelectedName()).toBe('Atendimento');
  });

  it('never advances when the accessibility toggle turned animations off', () => {
    stubMatchMedia();
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({ noAnimations: true }));
    renderTabs();

    advance(ROTATE_MS * 5);

    expect(getSelectedName()).toBe('Atendimento');
  });

  it('still selects with a click and with the arrow keys', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });
    renderTabs();

    fireEvent.click(getTab('Comercial'));
    expect(getSelectedName()).toBe('Comercial');

    act(() => getTab('Comercial').focus());
    fireEvent.keyDown(getTab('Comercial'), { key: 'ArrowRight' });
    expect(getSelectedName()).toBe('Financeiro');
  });

  it('shows everything at once, with no hidden style on any reveal item', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });
    const { container } = renderTabs();

    const items = container.querySelectorAll('[data-reveal-item]');

    expect(items.length).toBeGreaterThan(3);
    items.forEach((item) => expect(item.getAttribute('style')).toBeNull());
  });
});
