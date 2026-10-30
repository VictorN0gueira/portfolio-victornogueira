import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MAIN_NAV, PRIMARY_CTA } from '../../data/navigation';
import { CONTACT_EMAIL } from '../../lib/constants';
import { renderWithProviders } from '../../test/render';
import MobileMenu from './MobileMenu';

function Harness() {
  const [open, setOpen] = useState(false);

  return (
    <MobileMenu
      open={open}
      onOpenChange={setOpen}
      trigger={
        <button type="button" aria-label="Abrir menu">
          menu
        </button>
      }
    />
  );
}

function Pathname() {
  return <p data-testid="pathname">{useLocation().pathname}</p>;
}

function renderMenu(route = '/') {
  renderWithProviders(
    <>
      <Harness />
      <Pathname />
    </>,
    { route },
  );
  return userEvent.setup();
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
  return screen.findByRole('dialog', { name: 'Menu de navegação' });
}

describe('MobileMenu', () => {
  it('stays closed until the trigger is activated', () => {
    renderMenu();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens a modal dialog named "Menu de navegação" with a description', async () => {
    const user = renderMenu();

    const dialog = await openMenu(user);

    expect(dialog).toHaveAccessibleDescription(/links para as páginas do site/i);
    expect(screen.getByText('Menu de navegação')).toHaveClass('sr-only');
  });

  it('lists every main nav item as a big lowercase link, then the e-mail and the CTA', async () => {
    const user = renderMenu();
    const dialog = await openMenu(user);

    const nav = within(dialog).getByRole('navigation', { name: 'Menu principal' });
    for (const item of MAIN_NAV) {
      const link = within(nav).getByRole('link', { name: item.label });
      expect(link).toHaveAttribute('href', item.to);
      expect(link).toHaveClass('lowercase', 'min-h-14');
    }
    expect(within(dialog).getByRole('link', { name: CONTACT_EMAIL })).toHaveAttribute('href', `mailto:${CONTACT_EMAIL}`);
    expect(within(dialog).getByRole('link', { name: PRIMARY_CTA.label })).toHaveAttribute('href', PRIMARY_CTA.to);
  });

  it('is a black panel on the right that scrolls on its own and pads itself with the safe area', async () => {
    const user = renderMenu();
    const dialog = await openMenu(user);

    expect(dialog).toHaveClass('right-0', 'h-dvh', 'overflow-y-auto', 'bg-vn-black', 'text-vn-white');
    expect(dialog.style.paddingTop).toBe('max(16px, env(safe-area-inset-top))');
    expect(dialog.style.paddingRight).toBe('max(20px, env(safe-area-inset-right))');
    expect(dialog.style.paddingBottom).toBe('max(24px, env(safe-area-inset-bottom))');
  });

  it('fills the screen on a phone and is 24rem wide from 420px, so no strip of page shows beside it', async () => {
    const user = renderMenu();
    const dialog = await openMenu(user);

    expect(dialog).toHaveClass('w-full', 'min-[420px]:w-[24rem]');
    expect(dialog.className).not.toContain('w-[min(100%,24rem)]');
  });

  it('marks the current page, also on a sub page, and never a hash item', async () => {
    const user = renderMenu('/projetos/dizpara');
    const dialog = await openMenu(user);

    const current = within(dialog)
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page');
    expect(current.map((link) => link.textContent)).toEqual(['Projetos']);
  });

  it('closes with the explicit 44px button', async () => {
    const user = renderMenu();
    const dialog = await openMenu(user);
    const close = within(dialog).getByRole('button', { name: 'Fechar menu' });

    expect(close).toHaveClass('size-11');
    await user.click(close);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('closes on Escape and gives the focus back to the trigger', async () => {
    const user = renderMenu();
    await openMenu(user);

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveFocus();
  });

  it('closes when a link navigates to another page', async () => {
    const user = renderMenu();
    const dialog = await openMenu(user);

    await user.click(within(dialog).getByRole('link', { name: 'Sobre' }));

    expect(screen.getByTestId('pathname')).toHaveTextContent('/sobre');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('closes when the link of the page already open is followed', async () => {
    const user = renderMenu('/sobre');
    const dialog = await openMenu(user);

    await user.click(within(dialog).getByRole('link', { name: 'Sobre' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('closes when a hash link goes to a section of the home page', async () => {
    const user = renderMenu('/servicos');
    const dialog = await openMenu(user);

    await user.click(within(dialog).getByRole('link', { name: 'Como funciona' }));

    expect(screen.getByTestId('pathname')).toHaveTextContent('/');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('keeps the focus inside while Tab runs through every control, forwards and backwards', async () => {
    const user = renderMenu();
    const dialog = await openMenu(user);
    const stops = within(dialog).getAllByRole('link').length + 1;

    for (let press = 0; press < stops + 2; press += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    for (let press = 0; press < stops + 2; press += 1) {
      await user.tab({ shift: true });
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('stays open when the parent re-renders and hands it a new onOpenChange function', async () => {
    let rerenderParent: () => void = () => undefined;
    function InlineHandlerHarness() {
      const [open, setOpen] = useState(false);
      const [, setTick] = useState(0);
      rerenderParent = () => setTick((tick) => tick + 1);

      return (
        <MobileMenu
          open={open}
          onOpenChange={(next) => setOpen(next)}
          trigger={
            <button type="button" aria-label="Abrir menu">
              menu
            </button>
          }
        />
      );
    }
    const user = userEvent.setup();
    renderWithProviders(<InlineHandlerHarness />);
    await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
    await screen.findByRole('dialog', { name: 'Menu de navegação' });

    act(() => rerenderParent());
    act(() => rerenderParent());

    expect(screen.getByRole('dialog', { name: 'Menu de navegação' })).toBeInTheDocument();
  });

  it('hides the rest of the page from assistive tech while it is open', async () => {
    const user = renderMenu();
    await openMenu(user);

    expect(screen.queryByRole('button', { name: 'Abrir menu' })).not.toBeInTheDocument();
  });
});
