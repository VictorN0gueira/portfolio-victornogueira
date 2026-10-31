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

  // On a short phone (320x568, 280x653, 360x640) the panel top went above the window and "Texto maior", the switch that
  // turns the large font off, could not be reached. The panel is capped by the window height, and its list scrolls.
  it('caps the panel by the height of the window, so it fits a short phone, and scrolls the list inside it', async () => {
    const { panel } = await openPanel();

    expect(panel).toHaveClass('max-h-[calc(100svh-112px-env(safe-area-inset-bottom))]', 'sm:max-h-[calc(100svh-8rem)]', 'flex', 'flex-col', 'overflow-hidden');
    expect(within(panel).getAllByRole('list')[0]).toHaveClass('overflow-y-auto');
  });

  // Escape from an option used to leave the focus on the body once the panel was gone.
  it('gives the focus back to the trigger when Escape closes the panel from inside it', async () => {
    const { user, panel } = await openPanel();
    const option = within(panel).getAllByRole('button')[0];
    option.focus();
    expect(document.activeElement).toBe(option);

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog', { name: PANEL_NAME })).toBeNull());
    expect(document.activeElement).toBe(screen.getByRole('button', { name: TRIGGER_NAME }));
  });

  it('centres the panel on the window when it is short (a phone on its side) and keeps it above the WhatsApp button', async () => {
    const { panel } = await openPanel();
    const wrapper = panel.parentElement as HTMLElement;

    expect(wrapper).toHaveClass(
      '[@media(max-height:30rem)]:bottom-auto',
      '[@media(max-height:30rem)]:top-1/2',
      '[@media(max-height:30rem)]:-translate-y-1/2',
    );
    expect(panel).toHaveClass(
      '[@media(max-height:30rem)]:max-h-[calc(100svh-92px)]',
      '[@media(max-height:30rem)]:mb-[60px]',
    );
  });

  // On a phone on its side the panel's 60px bottom margin is a transparent strip that lay over the WhatsApp button
  // (elementFromPoint at its centre returned the wrapper, so it could not be tapped while the panel was open): the
  // wrapper takes no pointer events and only the panel and the trigger do.
  it('lets the pointer through the wrapper, and takes it only on the panel and on the trigger', async () => {
    const { panel } = await openPanel();

    expect(panel.parentElement).toHaveClass('pointer-events-none');
    expect(panel).toHaveClass('pointer-events-auto');
    expect(screen.getByRole('button', { name: TRIGGER_NAME })).toHaveClass('pointer-events-auto');
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
