import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from '../../test/matchMedia';
import { removeScrollIntoViewStub, stubScrollIntoViewEverywhere } from '../../test/scroll';
import {
  ROTATE_MS,
  advance,
  getPauseToggle,
  getSelectedName,
  getTab,
  getTablist,
  renderTabs,
  stubFocusVisible,
} from '../../test/useCaseTabsKit';

// The setup file does not restore spies, so a spy left by a failing test would leak into the next ones.
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('UseCaseTabs progress bar', () => {
  beforeEach(() => {
    stubMatchMedia();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function getBar(tab: HTMLElement): HTMLElement | null {
    return tab.querySelector('[data-tab-progress]');
  }

  function getBars(): HTMLElement[] {
    return screen.getAllByRole('tab').flatMap((tab) => getBar(tab) ?? []);
  }

  it('is drawn inside the selected tab only, and moves to the next tab with the rotation', () => {
    renderTabs();

    expect(getBar(getTab('Atendimento'))).not.toBeNull();
    expect(getBars()).toHaveLength(1);

    advance(ROTATE_MS);

    expect(getBar(getTab('Comercial'))).not.toBeNull();
    expect(getBars()).toHaveLength(1);
  });

  it('is hidden from assistive tech, keeps the name of the tab and takes the rotation interval as its duration', () => {
    renderTabs();
    const bar = getBar(getTab('Atendimento')) as HTMLElement;
    const fill = bar.querySelector('.vn-tab-progress') as HTMLElement;

    expect(bar).toHaveAttribute('aria-hidden', 'true');
    expect(fill).not.toBeNull();
    expect(fill.style.getPropertyValue('--vn-tab-duration')).toBe(`${ROTATE_MS}ms`);
    expect(getTab('Atendimento')).toHaveAccessibleName('Atendimento');
  });

  it('is gone once the visitor picked a tab', () => {
    renderTabs();

    fireEvent.click(getTab('Financeiro'));

    expect(getBars()).toHaveLength(0);
  });

  it('is gone while the visitor has paused, and starts over when the rotation resumes', () => {
    renderTabs();
    advance(ROTATE_MS);
    const before = getBar(getTab('Comercial'));

    fireEvent.click(getPauseToggle());
    expect(getBars()).toHaveLength(0);

    fireEvent.click(getPauseToggle());
    expect(getBars()).toHaveLength(1);
    expect(getBar(getTab('Comercial'))).not.toBe(before);
  });

  it('is gone while the pointer or the focus holds the rotation, and starts over when it lets go', () => {
    stubFocusVisible(true);
    renderTabs();

    fireEvent.pointerEnter(getTablist());
    expect(getBars()).toHaveLength(0);
    fireEvent.pointerLeave(getTablist());
    expect(getBars()).toHaveLength(1);

    act(() => getTab('Atendimento').focus());
    expect(getBars()).toHaveLength(0);
    act(() => getTab('Atendimento').blur());
    expect(getBars()).toHaveLength(1);
  });

  it('is not drawn without motion', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });
    renderTabs();

    expect(getBars()).toHaveLength(0);
  });
});

describe('UseCaseTabs keeps the active tab in view', () => {
  const EDGE_PX = 6;
  const TAB_STEP_PX = 140;
  const TAB_WIDTH_PX = 132;
  const LIST_WIDTH_PX = 300;

  beforeEach(() => {
    stubMatchMedia();
    vi.useFakeTimers();
    // Tabs are direct children of the tablist, which is their offset parent: the first sits at the list padding.
    vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (this: HTMLElement) {
      return EDGE_PX + Array.from(this.parentElement?.children ?? []).indexOf(this) * TAB_STEP_PX;
    });
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(TAB_WIDTH_PX);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(LIST_WIDTH_PX);
  });

  afterEach(() => {
    vi.useRealTimers();
    removeScrollIntoViewStub();
  });

  it('scrolls the tablist, not the page, when the rotation selects a tab that is out of view', () => {
    const scrollIntoView = stubScrollIntoViewEverywhere();
    renderTabs();
    expect(getTablist().scrollLeft).toBe(0);

    advance(ROTATE_MS);
    expect(getTablist().scrollLeft).toBe(0);

    advance(ROTATE_MS);
    expect(getTablist().scrollLeft).toBe(EDGE_PX + 2 * TAB_STEP_PX - EDGE_PX);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('keeps the tab in view when it is already visible, and comes back to the start when it wraps', () => {
    renderTabs();
    advance(ROTATE_MS * 2);
    const scrolled = getTablist().scrollLeft;
    expect(scrolled).toBeGreaterThan(0);

    advance(ROTATE_MS);
    expect(getTablist().scrollLeft).toBe(scrolled);

    advance(ROTATE_MS);
    expect(getSelectedName()).toBe('Atendimento');
    expect(getTablist().scrollLeft).toBe(0);
  });

  it('does the same when the keyboard selects a tab', () => {
    renderTabs();
    act(() => getTab('Atendimento').focus());

    fireEvent.keyDown(getTab('Atendimento'), { key: 'End' });

    expect(getSelectedName()).toBe('Operações');
    expect(getTablist().scrollLeft).toBeGreaterThan(0);
  });

  it('makes the scroll smooth only while motion is allowed', () => {
    renderTabs();
    expect(getTablist()).toHaveClass('scroll-smooth');
  });

  it('keeps the scroll instant without motion', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });
    renderTabs();

    expect(getTablist()).not.toHaveClass('scroll-smooth');
  });
});
