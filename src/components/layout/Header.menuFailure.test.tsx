import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAIN_NAV, PRIMARY_CTA } from '../../data/navigation';
import { renderWithProviders } from '../../test/render';
import Header from './Header';

// The code of the menu is a chunk that a flaky network can fail to load: the dynamic import rejects. The header, the
// page and the button have to survive it, and the menu has to degrade to a plain list of the same links.
vi.mock('./menuLoader', () => ({
  loadMobileMenu: () => Promise.reject(new Error('Failed to fetch dynamically imported module')),
}));

describe('Header when the menu chunk fails to load', () => {
  let unhandled: unknown[] = [];
  const onUnhandled = (reason: unknown) => unhandled.push(reason);

  beforeEach(() => {
    unhandled = [];
    process.on('unhandledRejection', onUnhandled);
    // React reports the error the boundary caught: that is the expected message here.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.off('unhandledRejection', onUnhandled);
    vi.restoreAllMocks();
  });

  it('keeps the header, the logo and the button in the page', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Header />);

    await user.click(screen.getByRole('button', { name: 'Menu' }));

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'VN One, página inicial' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
  });

  it('falls back to a plain list of the same links, with the call to action, and no dialog', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Header />);
    const button = screen.getByRole('button', { name: 'Menu' });

    await user.click(button);

    const nav = await screen.findByRole('navigation', { name: 'Menu principal' });
    for (const item of MAIN_NAV) {
      expect(within(nav).getByRole('link', { name: item.label })).toHaveAttribute('href', item.to);
    }
    const panel = nav.closest('[id]') as HTMLElement;
    expect(within(panel).getByRole('link', { name: PRIMARY_CTA.label })).toHaveAttribute('href', PRIMARY_CTA.to);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveAttribute('aria-controls', panel.id);
  });

  it('closes the fallback with Escape, with the button, and when a link is followed', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Header />);
    const button = screen.getByRole('button', { name: 'Menu' });

    await user.click(button);
    await screen.findByRole('navigation', { name: 'Menu principal' });
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('navigation', { name: 'Menu principal' })).not.toBeInTheDocument());
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();

    await user.click(button);
    await screen.findByRole('navigation', { name: 'Menu principal' });
    await user.click(button);
    expect(screen.queryByRole('navigation', { name: 'Menu principal' })).not.toBeInTheDocument();

    await user.click(button);
    const nav = await screen.findByRole('navigation', { name: 'Menu principal' });
    await user.click(within(nav).getByRole('link', { name: MAIN_NAV[0].label }));
    expect(screen.queryByRole('navigation', { name: 'Menu principal' })).not.toBeInTheDocument();
  });

  it('gives the focus back to the button on Escape pressed from a link of the panel', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Header />);
    const button = screen.getByRole('button', { name: 'Menu' });
    await user.click(button);
    const nav = await screen.findByRole('navigation', { name: 'Menu principal' });
    const firstLink = within(nav).getByRole('link', { name: MAIN_NAV[0].label });
    firstLink.focus();
    expect(firstLink).toHaveFocus();

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('navigation', { name: 'Menu principal' })).not.toBeInTheDocument());
    expect(button).toHaveFocus();
  });

  it('keeps the panel inside a short viewport: it has a maximum height and scrolls on its own', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Header />);
    await user.click(screen.getByRole('button', { name: 'Menu' }));

    const panel = (await screen.findByRole('navigation', { name: 'Menu principal' })).closest('[id]') as HTMLElement;

    expect(panel.className).toContain('max-h-[calc(100dvh-');
    expect(panel).toHaveClass('overflow-y-auto', 'overscroll-contain');
  });

  it('prefetches on pointer and focus without an unhandled rejection', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Header />);
    const button = screen.getByRole('button', { name: 'Menu' });

    await user.hover(button);
    button.focus();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(unhandled).toEqual([]);
  });
});
