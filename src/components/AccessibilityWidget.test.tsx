import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import AccessibilityWidget from './AccessibilityWidget';

const TRIGGER_NAME = 'Abrir opções de acessibilidade';
const PANEL_NAME = 'Opções de acessibilidade';
const A11Y_STORAGE_KEY = 'a11y-preferences';

beforeEach(() => {
  stubMatchMedia();
  window.localStorage.removeItem(A11Y_STORAGE_KEY);
  // The widget reads the colour under its button to pick its own; jsdom has no hit testing.
  Object.defineProperty(document, 'elementsFromPoint', { value: () => [], configurable: true, writable: true });
});

afterEach(() => {
  Reflect.deleteProperty(document, 'elementsFromPoint');
});

async function openPanel() {
  const user = userEvent.setup();
  renderWithProviders(<AccessibilityWidget />);
  await user.click(screen.getByRole('button', { name: TRIGGER_NAME }));
  return { user, panel: await screen.findByRole('dialog', { name: PANEL_NAME }) };
}

// The device matrix (e2e/devices.spec.ts) measured the option buttons at 40px from sm up and the reset button at 16px,
// and the count badge 3.8px past the right edge of the window with the larger font: these classes are the fixes.
describe('AccessibilityWidget', () => {
  it('makes every option button at least 44px tall', async () => {
    const { panel } = await openPanel();

    const options = within(panel).getAllByRole('button');
    expect(options).toHaveLength(6);
    for (const option of options) {
      expect(option, option.textContent ?? '').toHaveClass('min-h-11');
    }
  });

  it('makes the reset button at least 44px tall once an option is on', async () => {
    const { user, panel } = await openPanel();
    expect(within(panel).queryByRole('button', { name: /Resetar tudo/ })).toBeNull();

    await user.click(within(panel).getByRole('button', { name: /Sublinhar links/ }));

    expect(within(panel).getByRole('button', { name: /Resetar tudo/ })).toHaveClass('min-h-11');
  });

  it('keeps the count badge inside the button, at its right edge and not outside it', async () => {
    const { user, panel } = await openPanel();
    await user.click(within(panel).getByRole('button', { name: /Sublinhar links/ }));

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog', { name: PANEL_NAME })).toBeNull());
    const badge = screen.getByRole('button', { name: TRIGGER_NAME }).querySelector('span[aria-hidden="true"]');
    expect(badge).toHaveTextContent('1');
    expect(badge).toHaveClass('right-0');
    expect(badge).not.toHaveClass('-right-1');
  });
});
