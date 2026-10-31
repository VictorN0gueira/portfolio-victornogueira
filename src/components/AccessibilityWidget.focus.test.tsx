import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import AccessibilityWidget from './AccessibilityWidget';

const TRIGGER_NAME = 'Abrir opções de acessibilidade';
const PANEL_NAME = 'Opções de acessibilidade';
const A11Y_STORAGE_KEY = 'a11y-preferences';
// The glyphs the brand fonts lack, which the panel used as icons (Ruling R13).
const LEGACY_GLYPHS = [0x25d1, 0x2b1c, 0x23f8, 0x21ba, 0x332].map((code) => String.fromCodePoint(code));

beforeEach(() => {
  stubMatchMedia();
  window.localStorage.removeItem(A11Y_STORAGE_KEY);
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

describe('AccessibilityWidget order and landmark (X:I-3, X:M-3)', () => {
  it('puts the trigger before the panel in the DOM, and flips them with flex-row-reverse, not direction: rtl', async () => {
    const { panel } = await openPanel();
    const trigger = screen.getByRole('button', { name: TRIGGER_NAME });
    const wrapper = panel.parentElement as HTMLElement;

    expect(trigger.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(wrapper).toHaveClass('flex-row-reverse');
    expect(wrapper.style.direction).toBe('');
    expect(panel.style.direction).toBe('');
  });

  it('is a complementary landmark named Opções de acessibilidade that holds the trigger and the panel', async () => {
    const { panel } = await openPanel();
    const landmark = screen.getByRole('complementary', { name: PANEL_NAME });

    expect(landmark).toContainElement(screen.getByRole('button', { name: TRIGGER_NAME }));
    expect(landmark).toContainElement(panel);
  });

  it('keeps the trigger name and the dialog name that the e2e specs and the screen reader rely on', async () => {
    const { panel } = await openPanel();
    const trigger = screen.getByRole('button', { name: TRIGGER_NAME });

    expect(panel).toHaveAccessibleName(PANEL_NAME);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-controls', panel.id);
    expect(panel.id).not.toBe('');
  });

  it('does not claim aria-modal, since it does not trap the focus', async () => {
    const { panel } = await openPanel();

    expect(panel).not.toHaveAttribute('aria-modal');
  });
});

describe('AccessibilityWidget focus (X:I-3)', () => {
  it('moves the focus to the first option when the panel opens', async () => {
    const { panel } = await openPanel();

    await waitFor(() => expect(document.activeElement).toBe(within(panel).getAllByRole('button')[0]));
    expect(within(panel).getAllByRole('button')[0]).toHaveAccessibleName(/Texto maior/);
  });

  it('makes the first Tab from the trigger land inside the panel, in the DOM order', async () => {
    const { user, panel } = await openPanel();
    screen.getByRole('button', { name: TRIGGER_NAME }).focus();

    await user.tab();

    expect(panel).toContainElement(document.activeElement as HTMLElement);
  });

  it('closes the panel when the focus leaves the widget, and leaves the focus where it went', async () => {
    const { user } = await openPanel();
    const outside = document.createElement('button');
    outside.textContent = 'fora';
    document.body.append(outside);

    await user.click(outside);

    await waitFor(() => expect(screen.queryByRole('dialog', { name: PANEL_NAME })).toBeNull());
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  it('keeps the panel open while the focus moves between its own controls and the trigger', async () => {
    const { user, panel } = await openPanel();

    await user.tab();
    await user.tab();
    screen.getByRole('button', { name: TRIGGER_NAME }).focus();

    expect(screen.getByRole('dialog', { name: PANEL_NAME })).toBe(panel);
  });

  it('keeps the panel open when a pointer press lands on its header, which blurs the focused option', async () => {
    const { user, panel } = await openPanel();

    await user.click(within(panel).getByText('Acessibilidade'));

    expect(screen.getByRole('dialog', { name: PANEL_NAME })).toBeInTheDocument();
  });

  it('gives the focus back to the trigger when the trigger itself closes the panel', async () => {
    const { user } = await openPanel();
    const trigger = screen.getByRole('button', { name: TRIGGER_NAME });

    await user.click(trigger);

    await waitFor(() => expect(screen.queryByRole('dialog', { name: PANEL_NAME })).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });
});

describe('AccessibilityWidget closure gaps (C2-4)', () => {
  const OPTION_NAMES = ['Texto maior', 'Alto contraste', 'Escala de cinza', 'Pausar animações', 'Sublinhar links', 'Fonte legível'];

  it('gives every option aria-pressed, false at first and true after a press, and false again after the next', async () => {
    const { user, panel } = await openPanel();

    for (const name of OPTION_NAMES) {
      expect(within(panel).getByRole('button', { name, pressed: false })).toBeInTheDocument();
      await user.click(within(panel).getByRole('button', { name, pressed: false }));
      expect(within(panel).getByRole('button', { name, pressed: true })).toBeInTheDocument();
    }
    for (const name of OPTION_NAMES) {
      await user.click(within(panel).getByRole('button', { name, pressed: true }));
      expect(within(panel).getByRole('button', { name, pressed: false })).toBeInTheDocument();
    }
  });

  it('counts only the six known options when the stored value carries a key it does not know', async () => {
    window.localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({ fontSize: true, evil: true }));
    const { user } = await openPanel();
    const trigger = screen.getByRole('button', { name: TRIGGER_NAME });

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog', { name: PANEL_NAME })).toBeNull());
    expect(trigger).toHaveAccessibleDescription('1 opção ativa');
    expect(trigger.querySelector('span[aria-hidden="true"]')).toHaveTextContent('1');
  });

  it('points aria-controls at the dialog only while the panel exists', async () => {
    const { user, panel } = await openPanel();
    const trigger = screen.getByRole('button', { name: TRIGGER_NAME });

    expect(panel.id).not.toBe('');
    expect(trigger).toHaveAttribute('aria-controls', panel.id);

    await user.click(trigger);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: PANEL_NAME })).toBeNull());

    expect(trigger).not.toHaveAttribute('aria-controls');
  });

  it('shows the count badge on the trigger while the panel is closed and hides it while it is open', async () => {
    window.localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({ underlineLinks: true }));
    const user = userEvent.setup();
    renderWithProviders(<AccessibilityWidget />);
    const trigger = screen.getByRole('button', { name: TRIGGER_NAME });
    const badge = () => trigger.querySelector('span[aria-hidden="true"]');

    expect(badge()).toHaveTextContent('1');

    await user.click(trigger);
    await screen.findByRole('dialog', { name: PANEL_NAME });
    expect(badge()).toBeNull();

    await user.click(trigger);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: PANEL_NAME })).toBeNull());
    expect(badge()).toHaveTextContent('1');
  });

  it('closes the panel when a Tab leaves the last option for the next control of the page', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <AccessibilityWidget />
        <button type="button">depois do widget</button>
      </>,
    );
    await user.click(screen.getByRole('button', { name: TRIGGER_NAME }));
    const panel = await screen.findByRole('dialog', { name: PANEL_NAME });
    within(panel).getByRole('button', { name: 'Fonte legível' }).focus();

    await user.tab();

    expect(screen.getByRole('button', { name: 'depois do widget' })).toHaveFocus();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: PANEL_NAME })).toBeNull());
  });
});

describe('AccessibilityWidget announcement and look (X:M-1, X:M-4, X:M-5)', () => {
  it('describes the trigger with how many options are on, only while some are', async () => {
    const { user, panel } = await openPanel();
    const trigger = screen.getByRole('button', { name: TRIGGER_NAME });
    expect(trigger).not.toHaveAttribute('aria-describedby');

    await user.click(within(panel).getByRole('button', { name: /Sublinhar links/ }));
    await user.click(within(panel).getByRole('button', { name: /Alto contraste/ }));
    expect(trigger).toHaveAccessibleDescription('2 opções ativas');

    await user.click(within(panel).getByRole('button', { name: /Alto contraste/ }));
    expect(trigger).toHaveAccessibleDescription('1 opção ativa');
  });

  it('draws every option and the reset button with an icon, and none of the glyphs the brand fonts lack', async () => {
    const { user, panel } = await openPanel();
    await user.click(within(panel).getByRole('button', { name: /Sublinhar links/ }));

    for (const button of within(panel).getAllByRole('button')) {
      expect(button.querySelector('svg'), button.textContent ?? '').not.toBeNull();
      for (const glyph of LEGACY_GLYPHS) expect(button.textContent).not.toContain(glyph);
    }
  });

  it('shows a focus ring on every control of the panel, white on the dark surface', async () => {
    const { user, panel } = await openPanel();
    await user.click(within(panel).getByRole('button', { name: /Sublinhar links/ }));

    for (const button of within(panel).getAllByRole('button')) {
      expect(button, button.textContent ?? '').toHaveClass('focus-visible:outline-2', 'focus-visible:outline-white');
    }
  });

  it('keeps informative text at text-xs or larger, in rem, so the larger font grows it', async () => {
    const { user, panel } = await openPanel();
    await user.click(within(panel).getByRole('button', { name: /Sublinhar links/ }));
    const html = screen.getByRole('complementary', { name: PANEL_NAME }).outerHTML;

    expect(html).not.toMatch(/text-\[\d+px\]/);
  });
});

describe('AccessibilityWidget trigger ring (X:M-1)', () => {
  function stubBackdrop(color: string) {
    const backdrop = document.createElement('div');
    backdrop.style.backgroundColor = color;
    document.body.append(backdrop);
    Object.defineProperty(document, 'elementsFromPoint', { value: () => [backdrop], configurable: true, writable: true });
    return backdrop;
  }

  it('draws a dark ring over a light page', async () => {
    const light = stubBackdrop('rgb(255, 255, 255)');
    renderWithProviders(<AccessibilityWidget />);

    await waitFor(() => expect(screen.getByRole('button', { name: TRIGGER_NAME })).toHaveClass('focus-visible:outline-zinc-950'));
    light.remove();
  });

  it('turns the ring white when the page under the trigger is dark', async () => {
    const dark = stubBackdrop('rgb(0, 0, 0)');
    renderWithProviders(<AccessibilityWidget />);

    await waitFor(() => expect(screen.getByRole('button', { name: TRIGGER_NAME })).toHaveClass('focus-visible:outline-white'));
    dark.remove();
  });
});

describe('AccessibilityWidget stacking with the WhatsApp button (contract 3, X:M-6, V:D9)', () => {
  it('sits right above the WhatsApp button below sm: its offset plus 52px plus a 12px gap, safe area aware', async () => {
    const { panel } = await openPanel();
    const wrapper = panel.parentElement as HTMLElement;

    expect(wrapper).toHaveClass('bottom-[calc(max(16px,env(safe-area-inset-bottom))+64px)]');
    expect(wrapper).toHaveClass('items-end', 'sm:items-center');
  });

  it('keeps its place from sm up, centred on the right edge', async () => {
    const { panel } = await openPanel();

    expect(panel.parentElement).toHaveClass('sm:bottom-auto', 'sm:top-1/2', 'sm:-translate-y-1/2', 'right-0');
  });

  it('keeps centring on a short window, where the WhatsApp button is at the corner', async () => {
    const { panel } = await openPanel();

    expect(panel.parentElement).toHaveClass('[@media(max-height:30rem)]:items-center');
  });
});
