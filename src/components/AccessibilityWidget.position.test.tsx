import { screen, within } from '@testing-library/react';
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
});
