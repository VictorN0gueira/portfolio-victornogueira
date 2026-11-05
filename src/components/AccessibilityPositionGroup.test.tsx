import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AccessibilityPositionGroup } from './AccessibilityPositionGroup';

function setup() {
  const actions = { toSide: vi.fn(), step: vi.fn(), reset: vi.fn() };
  render(<AccessibilityPositionGroup {...actions} />);
  return { actions, group: screen.getByRole('group', { name: 'Posição do botão' }) };
}

describe('AccessibilityPositionGroup', () => {
  it('is a group named Posição do botão with five buttons, each with a clear name', () => {
    const { group } = setup();

    const names = within(group)
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label') ?? button.textContent);
    expect(names).toEqual([
      'Mover o botão para a esquerda',
      'Mover o botão para a direita',
      'Mover o botão para cima',
      'Mover o botão para baixo',
      'Voltar ao padrão',
    ]);
  });

  it('keeps every button at least 44px (min-h-11 and min-w-11) and in the tab order', () => {
    const { group } = setup();

    for (const button of within(group).getAllByRole('button')) {
      expect(button).toHaveClass('min-h-11');
      expect(button.tabIndex).toBe(0);
    }
  });

  it('moves the tab with a click and with the keyboard, the same actions as dragging', async () => {
    const user = userEvent.setup();
    const { actions, group } = setup();

    await user.click(within(group).getByRole('button', { name: 'Mover o botão para a esquerda' }));
    await user.click(within(group).getByRole('button', { name: 'Mover o botão para a direita' }));
    within(group).getByRole('button', { name: 'Mover o botão para cima' }).focus();
    await user.keyboard('{Enter}');
    within(group).getByRole('button', { name: 'Mover o botão para baixo' }).focus();
    await user.keyboard(' ');
    await user.click(within(group).getByRole('button', { name: 'Voltar ao padrão' }));

    expect(actions.toSide.mock.calls).toEqual([['left'], ['right']]);
    expect(actions.step.mock.calls).toEqual([['up'], ['down']]);
    expect(actions.reset).toHaveBeenCalledTimes(1);
  });

  it('announces nothing by itself: no live region and no status role', () => {
    const { group } = setup();

    expect(group.querySelector('[aria-live], [role="status"], [role="alert"]')).toBeNull();
  });

  it('writes no dash and no slash separator in its copy', () => {
    const { group } = setup();

    expect(group.textContent).not.toMatch(/[–—]| \/ /);
  });
});
