import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubMatchMedia } from '../../test/matchMedia';
import {
  ROTATE_MS,
  advance,
  getPauseToggle,
  getSelectedName,
  getTab,
  getWidget,
  renderTabs,
  setInView,
} from '../../test/useCaseTabsKit';

const PARTIAL_WAIT_MS = 3000;

function getBars(): HTMLElement[] {
  return Array.from(getWidget().querySelectorAll<HTMLElement>('[data-tab-progress]'));
}

function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
}

// The setup file does not restore spies, so a spy left by a failing test would leak into the next ones.
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('UseCaseTabs rotation and the viewport', () => {
  beforeEach(() => {
    stubMatchMedia();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not rotate and draws no bar while the tabs are out of view, and starts when they come into view', () => {
    renderTabs({ isInView: false });

    advance(ROTATE_MS * 3);
    expect(getSelectedName()).toBe('Atendimento');
    expect(getBars()).toHaveLength(0);

    setInView(true);
    expect(getBars()).toHaveLength(1);
    advance(ROTATE_MS);
    expect(getSelectedName()).toBe('Comercial');
  });

  it('stops the timer and the bar when it leaves the view', () => {
    renderTabs();
    advance(ROTATE_MS);
    expect(getSelectedName()).toBe('Comercial');
    expect(getBars()).toHaveLength(1);

    setInView(false);

    expect(getBars()).toHaveLength(0);
    advance(ROTATE_MS * 3);
    expect(getSelectedName()).toBe('Comercial');
  });

  it('starts over from zero when it comes back, with a new bar', () => {
    renderTabs();
    advance(PARTIAL_WAIT_MS);
    const before = getBars()[0];

    setInView(false);
    setInView(true);

    expect(getBars()).toHaveLength(1);
    expect(getBars()[0]).not.toBe(before);
    advance(PARTIAL_WAIT_MS);
    expect(getSelectedName()).toBe('Atendimento');
    advance(ROTATE_MS - PARTIAL_WAIT_MS);
    expect(getSelectedName()).toBe('Comercial');
  });

  it('keeps the pause toggle while the tabs are out of view, and it works there', () => {
    renderTabs({ isInView: false });

    fireEvent.click(getPauseToggle());

    expect(getPauseToggle()).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps the pause of the visitor through leaving the view and coming back', () => {
    renderTabs();
    fireEvent.click(getPauseToggle());

    setInView(false);
    setInView(true);

    expect(getPauseToggle()).toHaveAttribute('aria-pressed', 'true');
    expect(getBars()).toHaveLength(0);
    advance(ROTATE_MS * 3);
    expect(getSelectedName()).toBe('Atendimento');
  });

  it('keeps the tab the visitor picked, for good, through leaving the view and coming back', () => {
    renderTabs();
    fireEvent.click(getTab('Financeiro'));

    setInView(false);
    setInView(true);
    advance(ROTATE_MS * 3);

    expect(getSelectedName()).toBe('Financeiro');
    expect(getBars()).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /troca automática$/ })).not.toBeInTheDocument();
  });
});

describe('UseCaseTabs with a hidden document', () => {
  beforeEach(() => {
    stubMatchMedia();
    vi.useFakeTimers();
    setVisibility('visible');
  });

  afterEach(() => {
    vi.useRealTimers();
    // Restored after every test, also when one fails half way.
    Reflect.deleteProperty(document, 'visibilityState');
  });

  it('draws no bar and does not advance while the document is hidden', () => {
    renderTabs();
    expect(getBars()).toHaveLength(1);

    act(() => setVisibility('hidden'));

    expect(getBars()).toHaveLength(0);
    advance(ROTATE_MS * 3);
    expect(getSelectedName()).toBe('Atendimento');
  });

  it('draws a new bar when the document is visible again, and the countdown restarts from zero', () => {
    renderTabs();
    advance(PARTIAL_WAIT_MS);
    const before = getBars()[0];
    act(() => setVisibility('hidden'));

    act(() => setVisibility('visible'));

    expect(getBars()).toHaveLength(1);
    expect(getBars()[0]).not.toBe(before);
    advance(PARTIAL_WAIT_MS);
    expect(getSelectedName()).toBe('Atendimento');
    advance(ROTATE_MS - PARTIAL_WAIT_MS);
    expect(getSelectedName()).toBe('Comercial');
  });
});
