import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TAB_POSITION_STORAGE_KEY } from '../lib/tabPositionStorage';
import { stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import AccessibilityWidget from './AccessibilityWidget';

const TRIGGER_NAME = 'Abrir opções de acessibilidade';
const PANEL_NAME = 'Opções de acessibilidade';

beforeEach(() => {
  stubMatchMedia();
  window.localStorage.clear();
  Object.defineProperty(document, 'elementsFromPoint', { value: () => [], configurable: true, writable: true });
});

afterEach(() => {
  Reflect.deleteProperty(document, 'elementsFromPoint');
  window.localStorage.clear();
});

const stored = () => JSON.parse(window.localStorage.getItem(TAB_POSITION_STORAGE_KEY) ?? 'null') as { side: string; ratio: number } | null;

async function openPanel() {
  const user = userEvent.setup();
  renderWithProviders(<AccessibilityWidget />);
  await user.click(screen.getByRole('button', { name: TRIGGER_NAME }));
  const panel = await screen.findByRole('dialog', { name: PANEL_NAME });
  return { user, panel, group: within(panel).getByRole('group', { name: 'Posição do botão' }) };
}

describe('AccessibilityWidget position', () => {
  it('keeps the default place (the responsive CSS) when nothing was chosen, and stores nothing', async () => {
    const { panel } = await openPanel();
    const wrapper = panel.closest('aside') as HTMLElement;

    expect(wrapper).toHaveClass('right-0', 'flex-row-reverse', 'bottom-[calc(max(16px,env(safe-area-inset-bottom))+96px)]');
    expect(wrapper.style.top).toBe('');
    expect(stored()).toBeNull();
    expect(document.documentElement).not.toHaveAttribute('data-vn-tab-band');
  });

  it('moves the tab to the left with the buttons, opens the panel toward the inside and remembers the side', async () => {
    const { user, panel, group } = await openPanel();

    await user.click(within(group).getByRole('button', { name: 'Mover o botão para a esquerda' }));

    const wrapper = panel.closest('aside') as HTMLElement;
    expect(wrapper).toHaveClass('left-0');
    expect(wrapper).not.toHaveClass('right-0');
    expect(wrapper.style.top).not.toBe('');
    expect(stored()?.side).toBe('left');
    expect(screen.getByRole('button', { name: TRIGGER_NAME })).toHaveClass('rounded-r-xl');
    expect(panel.parentElement).toHaveClass('left-[calc(100%+8px)]');
  });

  it('moves up and down in steps and tells the stylesheet which edge to keep clear', async () => {
    const { user, group } = await openPanel();

    // jsdom has no layout, so the tab starts at the top: Descer is the move that shows.
    await user.click(within(group).getByRole('button', { name: 'Mover o botão para baixo' }));
    const first = stored();
    await user.click(within(group).getByRole('button', { name: 'Mover o botão para baixo' }));
    const second = stored();

    expect(first && second && second.ratio > first.ratio).toBe(true);
    // The tab is in the upper half: its top band only lasts while the keyboard moves the focus (see the band tests below).
    expect(document.documentElement.style.getPropertyValue('--vn-tab-pad')).not.toBe('');
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.documentElement.getAttribute('data-vn-tab-band')).toBe('top');
  });

  it('goes back to the default place and forgets the choice', async () => {
    const { user, panel, group } = await openPanel();
    await user.click(within(group).getByRole('button', { name: 'Mover o botão para a esquerda' }));

    await user.click(within(group).getByRole('button', { name: 'Voltar ao padrão' }));

    const wrapper = panel.closest('aside') as HTMLElement;
    expect(wrapper).toHaveClass('right-0', 'flex-row-reverse');
    expect(stored()).toBeNull();
    expect(document.documentElement).not.toHaveAttribute('data-vn-tab-band');
  });

  it('starts at the stored place', () => {
    window.localStorage.setItem(TAB_POSITION_STORAGE_KEY, JSON.stringify({ side: 'left', ratio: 0.3 }));

    renderWithProviders(<AccessibilityWidget />);

    expect(screen.getByRole('complementary', { name: PANEL_NAME })).toHaveClass('left-0');
  });

  it('falls back to the default place when the stored value is garbage', () => {
    window.localStorage.setItem(TAB_POSITION_STORAGE_KEY, '{"side":"top","ratio":7}');

    renderWithProviders(<AccessibilityWidget />);

    expect(screen.getByRole('complementary', { name: PANEL_NAME })).toHaveClass('right-0', 'flex-row-reverse');
  });

  // F1: a tab in the upper half used to push every in-page anchor 200px too low through scroll-padding-top.
  describe('the scroll band of a tab in the upper half', () => {
    const band = () => document.documentElement.getAttribute('data-vn-tab-band');

    beforeEach(() => {
      window.localStorage.setItem(TAB_POSITION_STORAGE_KEY, JSON.stringify({ side: 'right', ratio: 0.3 }));
      renderWithProviders(<AccessibilityWidget />);
    });

    it('is not set at rest, so a hash or an anchor lands where it does with the tab at its default place', () => {
      expect(band()).toBeNull();
    });

    it('is set while the keyboard moves the focus (Tab, Shift+Tab), so a focused control is scrolled clear of the tab', () => {
      fireEvent.keyDown(document, { key: 'Tab' });
      expect(band()).toBe('top');
      fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
      expect(band()).toBe('top');
    });

    it('goes away on a press and on any other key, so activating an anchor scrolls without it', () => {
      fireEvent.keyDown(document, { key: 'Tab' });
      fireEvent.pointerDown(document.body);
      expect(band()).toBeNull();
      fireEvent.keyDown(document, { key: 'Tab' });
      fireEvent.keyDown(document, { key: 'Enter' });
      expect(band()).toBeNull();
    });
  });

  it('keeps the bottom band always on, since padding at the bottom never moves an anchor', () => {
    window.localStorage.setItem(TAB_POSITION_STORAGE_KEY, JSON.stringify({ side: 'right', ratio: 0.9 }));

    renderWithProviders(<AccessibilityWidget />);

    expect(document.documentElement.getAttribute('data-vn-tab-band')).toBe('bottom');
  });

  // F3: the colours of the tab follow the page under it, which changes when the tab moves (not only on scroll and resize).
  it('reads the page under the tab again once it settles in a new place', async () => {
    const backdrop = document.createElement('div');
    Object.defineProperty(document, 'elementsFromPoint', { value: () => [backdrop], configurable: true, writable: true });
    backdrop.style.backgroundColor = 'rgb(255, 255, 255)';
    const { user, group } = await openPanel();
    const trigger = screen.getByRole('button', { name: TRIGGER_NAME });
    expect(trigger).toHaveClass('bg-zinc-950');

    backdrop.style.backgroundColor = 'rgb(0, 0, 0)';
    await user.click(within(group).getByRole('button', { name: 'Mover o botão para a esquerda' }));

    await waitFor(() => expect(trigger).toHaveClass('bg-white'));
  });
});
