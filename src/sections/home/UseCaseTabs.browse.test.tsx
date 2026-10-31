import { fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCases } from '../../data/useCases';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from '../../test/matchMedia';
import { AllProviders } from '../../test/render';
import {
  ROTATE_MS,
  advance,
  copy,
  getPanelGroup,
  getPauseToggle,
  getSelectedName,
  getTab,
  getTablist,
  getWidget,
  renderTabs,
  setInView,
} from '../../test/useCaseTabsKit';
import { UseCaseTabs } from './UseCaseTabs';

const COARSE_POINTER_QUERY = '(pointer: coarse)';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  localStorage.clear();
});

describe('UseCaseTabs rotation speed (WCAG 2.2.2, I-2)', () => {
  beforeEach(() => {
    stubMatchMedia();
    vi.useFakeTimers();
  });

  it('gives each tab 9 seconds, long enough to read a panel of about fifty words', () => {
    expect(ROTATE_MS).toBe(9000);
  });

  it('does not change the tab before 9 seconds have passed, and changes it at 9 seconds', () => {
    renderTabs();

    advance(8999);
    expect(getSelectedName()).toBe('Atendimento');
    advance(1);
    expect(getSelectedName()).toBe('Comercial');
  });
});

describe('UseCaseTabs on a touch screen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('starts with the rotation paused when the main pointer is coarse, and the toggle shows it as pressed', () => {
    stubMatchMedia({ [COARSE_POINTER_QUERY]: true });
    renderTabs();

    advance(ROTATE_MS * 3);

    expect(getSelectedName()).toBe('Atendimento');
    expect(getPauseToggle()).toHaveAttribute('aria-pressed', 'true');
  });

  it('lets the visitor start the rotation with the toggle, and pause it again', () => {
    stubMatchMedia({ [COARSE_POINTER_QUERY]: true });
    renderTabs();

    fireEvent.click(getPauseToggle());
    advance(ROTATE_MS);
    expect(getSelectedName()).toBe('Comercial');
    expect(getPauseToggle()).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(getPauseToggle());
    advance(ROTATE_MS * 3);
    expect(getSelectedName()).toBe('Comercial');
  });

  it('starts running when the pointer is fine', () => {
    stubMatchMedia();
    renderTabs();

    advance(ROTATE_MS);

    expect(getSelectedName()).toBe('Comercial');
    expect(getPauseToggle()).toHaveAttribute('aria-pressed', 'false');
  });

  it('has no toggle and no rotation without motion, also on a coarse pointer', () => {
    stubMatchMedia({ [COARSE_POINTER_QUERY]: true, [REDUCED_MOTION_QUERY]: true });
    renderTabs();

    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('UseCaseTabs order and structure', () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  it('puts the pause toggle before the tablist in the DOM, so it is the first stop of the widget', () => {
    renderTabs();

    expect(getPauseToggle().compareDocumentPosition(getTablist()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps the pause toggle outside the scroller (the tablist) and inside the widget', () => {
    renderTabs();

    expect(getTablist()).not.toContainElement(getPauseToggle());
    expect(getWidget()).toContainElement(getPauseToggle());
  });

  it('makes the first Tab press land on the pause toggle and the second on the selected tab', () => {
    renderTabs();

    expect(getPauseToggle().tabIndex).toBe(0);
    expect(getTab('Atendimento').tabIndex).toBe(0);
    expect(getTab('Comercial').tabIndex).toBe(-1);
  });

  it('fades the right edge of the tab row below sm, as a hint that it scrolls, and not from sm up', () => {
    renderTabs();

    const classes = getTablist().className;

    expect(classes).toMatch(/\[mask-image:linear-gradient\(/);
    expect(classes).toMatch(/sm:\[mask-image:none\]/);
  });

  it('draws the unselected tabs with the gray mid border', () => {
    renderTabs();

    expect(getTab('Comercial')).toHaveClass('border-vn-gray-mid');
    expect(getTab('Comercial')).not.toHaveClass('border-vn-gray-light');
  });
});

describe('UseCaseTabs layout stability after the visitor picks a tab (C2-1)', () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  it('keeps a 44px aria-hidden placeholder where the toggle was, so the tab row does not move', () => {
    renderTabs();
    const row = getTablist().parentElement as HTMLElement;
    expect(row.firstElementChild).toBe(getPauseToggle());
    // While the rotation is automatic the row holds the toggle and the tablist, and no placeholder.
    expect(row.children).toHaveLength(2);

    fireEvent.click(getTab('Financeiro'));

    expect(screen.queryByRole('button', { name: copy.pause })).toBeNull();
    const placeholder = row.firstElementChild as HTMLElement;
    expect(placeholder).not.toBe(getTablist());
    expect(placeholder).toHaveAttribute('aria-hidden', 'true');
    expect(placeholder).toHaveClass('size-11', 'shrink-0');
    expect(placeholder.children).toHaveLength(0);
    expect(placeholder.nextElementSibling).toBe(getTablist());
    // The placeholder takes the place of the toggle: still two boxes, never three.
    expect(row.children).toHaveLength(2);
  });

  it('has no placeholder without motion, where there never was a toggle', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });
    renderTabs();

    const row = getTablist().parentElement as HTMLElement;

    expect(row.firstElementChild).toBe(getTablist());
    expect(row.children).toHaveLength(1);

    // A pick ends the automatic mode, which must not leave a stray 44px gap where no toggle ever was.
    fireEvent.click(getTab('Financeiro'));

    expect(row.children).toHaveLength(1);
    expect(row.firstElementChild).toBe(getTablist());
  });
});

describe('UseCaseTabs reveal', () => {
  beforeEach(() => {
    stubMatchMedia();
    vi.useFakeTimers();
  });

  it('does not replay the reveal when the rotation changes the tab by itself', () => {
    renderTabs();
    const before = getPanelGroup();

    advance(ROTATE_MS);

    expect(getSelectedName()).toBe('Comercial');
    expect(getPanelGroup()).toBe(before);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(useCases[1].title);
  });

  it('replays the reveal when the visitor picks a tab', () => {
    renderTabs();
    const before = getPanelGroup();

    fireEvent.click(getTab('Financeiro'));

    expect(getPanelGroup()).not.toBe(before);
  });

  it('keeps the same tab elements across rotations (stable refs, no null then node churn)', () => {
    renderTabs();
    const tabs = screen.getAllByRole('tab');

    advance(ROTATE_MS);

    expect(screen.getAllByRole('tab')).toEqual(tabs);
  });
});

describe('UseCaseTabs in StrictMode', () => {
  beforeEach(() => {
    stubMatchMedia();
    vi.useFakeTimers();
  });

  it('rotates once per interval, and stops with the area out of view', () => {
    render(
      <StrictMode>
        <AllProviders>
          <UseCaseTabs />
        </AllProviders>
      </StrictMode>,
    );
    setInView(true);

    advance(ROTATE_MS);
    expect(getSelectedName()).toBe('Comercial');

    setInView(false);
    advance(ROTATE_MS * 3);
    expect(getSelectedName()).toBe('Comercial');
  });
});
