import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from '../../test/matchMedia';
import { A11Y_STORAGE_KEY } from '../../contexts/AccessibilityContext';
import {
  ROTATE_MS,
  advance,
  copy,
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

describe('UseCaseTabs keyboard', () => {
  beforeEach(() => {
    stubMatchMedia();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('moves the focus and the selection to the next tab with ArrowRight from a focused tab', () => {
    renderTabs();
    act(() => getTab('Atendimento').focus());

    fireEvent.keyDown(getTab('Atendimento'), { key: 'ArrowRight' });

    expect(getSelectedName()).toBe('Comercial');
    expect(getTab('Comercial')).toHaveFocus();
  });

  it('goes back with ArrowLeft, and wraps from the first tab to the last and from the last to the first', () => {
    renderTabs();
    act(() => getTab('Atendimento').focus());

    fireEvent.keyDown(getTab('Atendimento'), { key: 'ArrowLeft' });
    expect(getSelectedName()).toBe('Operações');
    expect(getTab('Operações')).toHaveFocus();

    fireEvent.keyDown(getTab('Operações'), { key: 'ArrowRight' });
    expect(getSelectedName()).toBe('Atendimento');
    expect(getTab('Atendimento')).toHaveFocus();

    fireEvent.keyDown(getTab('Atendimento'), { key: 'ArrowRight' });
    fireEvent.keyDown(getTab('Comercial'), { key: 'ArrowLeft' });
    expect(getSelectedName()).toBe('Atendimento');
  });

  it('goes to the last tab with End and to the first with Home', () => {
    renderTabs();
    act(() => getTab('Atendimento').focus());

    fireEvent.keyDown(getTab('Atendimento'), { key: 'End' });
    expect(getSelectedName()).toBe('Operações');
    expect(getTab('Operações')).toHaveFocus();

    fireEvent.keyDown(getTab('Operações'), { key: 'Home' });
    expect(getSelectedName()).toBe('Atendimento');
    expect(getTab('Atendimento')).toHaveFocus();
  });

  it('moves from the tab that has the focus, also when the rotation selected another one in the meantime', () => {
    renderTabs();
    act(() => getTab('Atendimento').focus());
    // Window blur: the focus stays on the tab while the hold ends and the rotation goes on.
    fireEvent.blur(getTab('Atendimento'), { relatedTarget: null });
    advance(ROTATE_MS * 2);
    expect(getSelectedName()).toBe('Financeiro');
    expect(getTab('Atendimento')).toHaveFocus();

    fireEvent.keyDown(getTab('Atendimento'), { key: 'ArrowRight' });

    expect(getSelectedName()).toBe('Comercial');
  });

  it('prevents the default of the keys it handles and ignores every other key', () => {
    renderTabs();
    act(() => getTab('Atendimento').focus());

    expect(fireEvent.keyDown(getTab('Atendimento'), { key: 'ArrowRight' })).toBe(false);
    expect(fireEvent.keyDown(getTab('Comercial'), { key: 'ArrowDown' })).toBe(true);
    expect(fireEvent.keyDown(getTab('Comercial'), { key: 'a' })).toBe(true);
    expect(fireEvent.keyDown(getTab('Comercial'), { key: 'Enter' })).toBe(true);

    expect(getSelectedName()).toBe('Comercial');
  });

  it('ends the auto rotation once the keyboard selected a tab', () => {
    renderTabs();
    act(() => getTab('Atendimento').focus());

    fireEvent.keyDown(getTab('Atendimento'), { key: 'ArrowRight' });
    act(() => getTab('Comercial').blur());
    advance(10_000);

    expect(getSelectedName()).toBe('Comercial');
  });

  it('focuses the new tab without letting the browser scroll the page to it', () => {
    const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
    renderTabs();
    act(() => getTab('Atendimento').focus());
    focusSpy.mockClear();

    fireEvent.keyDown(getTab('Atendimento'), { key: 'ArrowRight' });

    expect(focusSpy).toHaveBeenCalledTimes(1);
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
  });
});

describe('UseCaseTabs pause toggle', () => {
  beforeEach(() => {
    stubMatchMedia();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is the shared toggle in its light tone, named "Pausar troca automática", not pressed and exempt from the hold', () => {
    renderTabs();

    expect(getPauseToggle()).toHaveAccessibleName('Pausar troca automática');
    expect(getPauseToggle()).toHaveAttribute('aria-pressed', 'false');
    expect(getPauseToggle()).toHaveAttribute('data-hold-exempt');
    expect(getPauseToggle()).toHaveClass('vn-focus-ring-ink');
  });

  it('keeps one constant name and carries the state in aria-pressed alone', () => {
    renderTabs();

    fireEvent.click(getPauseToggle());

    expect(getPauseToggle()).toHaveAccessibleName('Pausar troca automática');
    expect(getPauseToggle()).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('button', { name: /troca automática$/ })).toHaveLength(1);
    expect(getPauseToggle().getAttribute('aria-label')).toBe(copy.pause);

    fireEvent.click(getPauseToggle());

    expect(getPauseToggle()).toHaveAccessibleName('Pausar troca automática');
    expect(getPauseToggle()).toHaveAttribute('aria-pressed', 'false');
  });

  it('stops the rotation when it is pressed and goes on from there when it is pressed again', () => {
    renderTabs();
    advance(ROTATE_MS);
    expect(getSelectedName()).toBe('Comercial');

    fireEvent.click(getPauseToggle());
    advance(ROTATE_MS * 3);
    expect(getSelectedName()).toBe('Comercial');

    fireEvent.click(getPauseToggle());
    advance(ROTATE_MS);
    expect(getSelectedName()).toBe('Financeiro');
  });

  it('keeps the visitor pause when the pointer or the focus comes and goes over the content', () => {
    renderTabs();
    fireEvent.click(getPauseToggle());

    fireEvent.pointerEnter(getTablist());
    fireEvent.pointerLeave(getTablist());
    act(() => getTab('Atendimento').focus());
    act(() => getTab('Atendimento').blur());
    advance(ROTATE_MS * 3);

    expect(getSelectedName()).toBe('Atendimento');
    expect(getPauseToggle()).toHaveAttribute('aria-pressed', 'true');
  });

  it('is not rendered once the visitor picked a tab, because there is nothing left to pause', () => {
    renderTabs();

    fireEvent.click(getTab('Financeiro'));

    expect(screen.queryByRole('button', { name: copy.pause })).not.toBeInTheDocument();
  });

  it('does not render without motion, where nothing rotates', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });
    renderTabs();

    expect(screen.queryByRole('button', { name: copy.pause })).not.toBeInTheDocument();
  });

  it('does not render when the accessibility toggle turned animations off', () => {
    stubMatchMedia();
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({ noAnimations: true }));
    renderTabs();

    expect(screen.queryByRole('button', { name: copy.pause })).not.toBeInTheDocument();
  });
});

describe('UseCaseTabs hold by pointer and focus', () => {
  beforeEach(() => {
    stubMatchMedia();
    stubFocusVisible(true);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('holds the rotation while the pointer is over the tabs and goes on when it leaves', () => {
    renderTabs();

    fireEvent.pointerEnter(getTablist());
    advance(ROTATE_MS * 3);
    expect(getSelectedName()).toBe('Atendimento');

    fireEvent.pointerLeave(getTablist());
    advance(ROTATE_MS);
    expect(getSelectedName()).toBe('Comercial');
  });

  it('holds the rotation while the pointer is over the panel too', () => {
    renderTabs();

    fireEvent.pointerEnter(screen.getByRole('tabpanel'));
    advance(ROTATE_MS * 3);
    expect(getSelectedName()).toBe('Atendimento');

    fireEvent.pointerLeave(screen.getByRole('tabpanel'));
    advance(ROTATE_MS);
    expect(getSelectedName()).toBe('Comercial');
  });

  it('holds the rotation while the focus is on a tab and goes on when it leaves', () => {
    renderTabs();

    act(() => getTab('Atendimento').focus());
    advance(ROTATE_MS * 3);
    expect(getSelectedName()).toBe('Atendimento');

    act(() => getTab('Atendimento').blur());
    advance(ROTATE_MS);
    expect(getSelectedName()).toBe('Comercial');
  });

  it('keeps holding when the focus moves to another element inside, and lets go only when it leaves', () => {
    renderTabs();
    act(() => getTab('Atendimento').focus());

    fireEvent.blur(getTab('Atendimento'), { relatedTarget: screen.getByRole('tabpanel') });
    advance(ROTATE_MS * 3);
    expect(getSelectedName()).toBe('Atendimento');

    fireEvent.focus(screen.getByRole('tabpanel'));
    advance(ROTATE_MS * 3);
    expect(getSelectedName()).toBe('Atendimento');

    fireEvent.blur(screen.getByRole('tabpanel'), { relatedTarget: null });
    advance(ROTATE_MS);
    expect(getSelectedName()).toBe('Comercial');
  });

  it('stays held while one of the two holds is still on', () => {
    renderTabs();

    act(() => getTab('Atendimento').focus());
    fireEvent.pointerEnter(getTablist());
    fireEvent.pointerLeave(getTablist());
    advance(ROTATE_MS * 3);
    expect(getSelectedName()).toBe('Atendimento');

    act(() => getTab('Atendimento').blur());
    advance(ROTATE_MS);
    expect(getSelectedName()).toBe('Comercial');
  });

  it('does not hold when the focus is on the pause toggle itself', () => {
    renderTabs();

    act(() => getPauseToggle().focus());
    advance(ROTATE_MS);

    expect(getSelectedName()).toBe('Comercial');
  });

  it('does not hold when the pointer is on the pause toggle itself, so a press on it reaches it at once', () => {
    renderTabs();

    fireEvent.pointerEnter(getPauseToggle());
    advance(ROTATE_MS);
    expect(getSelectedName()).toBe('Comercial');

    fireEvent.click(getPauseToggle());
    fireEvent.click(getPauseToggle());
    advance(ROTATE_MS);
    expect(getSelectedName()).toBe('Financeiro');
  });

  it('lets go of the hold when the pointer or the focus moves from a tab to the pause toggle', () => {
    renderTabs();

    fireEvent.pointerEnter(getTablist());
    fireEvent.pointerEnter(getPauseToggle());
    advance(ROTATE_MS);
    expect(getSelectedName()).toBe('Comercial');

    act(() => getTab('Comercial').focus());
    advance(ROTATE_MS);
    expect(getSelectedName()).toBe('Comercial');
    act(() => getPauseToggle().focus());
    advance(ROTATE_MS);
    expect(getSelectedName()).toBe('Financeiro');
  });

  it('holds again when the pointer comes back from the pause toggle to the tabs', () => {
    renderTabs();

    fireEvent.pointerEnter(getPauseToggle());
    fireEvent.pointerEnter(getTablist());
    advance(ROTATE_MS * 3);

    expect(getSelectedName()).toBe('Atendimento');
  });

  it('holds for a keyboard focus on the panel, which shows a focus ring', () => {
    renderTabs();

    act(() => screen.getByRole('tabpanel').focus());
    advance(ROTATE_MS * 3);

    expect(getSelectedName()).toBe('Atendimento');
  });

  it('does not hold for a focus that a click or a tap gave to the panel, so nothing stays held after the pointer leaves', () => {
    renderTabs();
    const panel = screen.getByRole('tabpanel');

    fireEvent.pointerEnter(panel);
    stubFocusVisible(false);
    act(() => panel.focus());
    fireEvent.pointerLeave(panel);
    advance(ROTATE_MS);

    expect(panel).toHaveFocus();
    expect(getSelectedName()).toBe('Comercial');
  });

  it('lets go of a keyboard hold when a click moves the focus to the panel', () => {
    renderTabs();
    act(() => getTab('Atendimento').focus());
    advance(ROTATE_MS * 2);
    expect(getSelectedName()).toBe('Atendimento');

    stubFocusVisible(false);
    act(() => screen.getByRole('tabpanel').focus());
    advance(ROTATE_MS);

    expect(getSelectedName()).toBe('Comercial');
  });
});
