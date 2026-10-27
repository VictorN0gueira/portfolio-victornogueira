import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAIN_NAV, PRIMARY_CTA } from '../../data/navigation';
import { stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import Header from './Header';

const SCROLLED_Y = 100;
const AT_THRESHOLD_Y = 60;
const DESKTOP_NAV_QUERY = '(min-width: 1024px)';

function scrollTo(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
  act(() => {
    window.dispatchEvent(new Event('scroll'));
  });
}

function renderHeader(route = '/') {
  renderWithProviders(<Header />, { route });
  return screen.getByRole('banner');
}

function desktopNav() {
  return screen.getByRole('navigation', { name: 'Navegação principal', hidden: true });
}

describe('Header', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });

  describe('logo', () => {
    it('links home with a name that has no dash, and shows the artwork for light surfaces', () => {
      renderHeader();

      const home = screen.getByRole('link', { name: 'VN One, página inicial' });
      expect(home).toHaveAttribute('href', '/');
      expect(within(home).getByAltText('VN One').getAttribute('src')).toMatch(/vn-one-logo-dark\.webp$/);
    });

    it('is a single image, with no second copy for a scrolled state', () => {
      renderHeader();
      scrollTo(SCROLLED_Y);

      expect(screen.getAllByAltText('VN One')).toHaveLength(1);
    });
  });

  describe('data-scrolled', () => {
    it('is absent at the top of the page', () => {
      const header = renderHeader();

      expect(header).not.toHaveAttribute('data-scrolled');
    });

    it('is "true" after scrolling past 60px, and goes away when back at the top', async () => {
      const header = renderHeader();

      scrollTo(SCROLLED_Y);
      await waitFor(() => expect(header).toHaveAttribute('data-scrolled', 'true'));

      scrollTo(0);
      await waitFor(() => expect(header).not.toHaveAttribute('data-scrolled'));
    });

    it('needs more than 60px, exactly 60px is still the top', async () => {
      const header = renderHeader();

      scrollTo(AT_THRESHOLD_Y);
      await act(async () => {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      });

      expect(header).not.toHaveAttribute('data-scrolled');
    });

    it('starts scrolled when the page loads already scrolled (a reload mid page)', () => {
      Object.defineProperty(window, 'scrollY', { value: SCROLLED_Y, configurable: true });

      const header = renderHeader();

      expect(header).toHaveAttribute('data-scrolled', 'true');
    });

    it('listens passively and removes the listener on unmount', () => {
      const add = vi.spyOn(window, 'addEventListener');
      const remove = vi.spyOn(window, 'removeEventListener');
      const { unmount } = renderWithProviders(<Header />);

      expect(add).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });
      const listener = add.mock.calls.find(([type]) => type === 'scroll')?.[1];

      unmount();

      expect(remove).toHaveBeenCalledWith('scroll', listener);
    });

    it('updates once per frame however many scroll events fire', async () => {
      const header = renderHeader();
      const frame = vi.spyOn(window, 'requestAnimationFrame');

      scrollTo(SCROLLED_Y);
      scrollTo(SCROLLED_Y + 10);
      scrollTo(SCROLLED_Y + 20);

      expect(frame).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(header).toHaveAttribute('data-scrolled', 'true'));
    });
  });

  describe('position and shape', () => {
    it('sits below the notch, at 12px at least, through an inline style', () => {
      const header = renderHeader();

      expect(header.style.top).toBe('max(12px, env(safe-area-inset-top))');
      expect(header).toHaveClass('fixed', 'rounded-full', 'border-vn-gray-light', 'bg-vn-white/90');
    });

    it('is as wide as the screen minus a symmetric gutter, up to 1100px, and narrows to 860px once scrolled', () => {
      const header = renderHeader();

      expect(header).toHaveClass('max-w-[1100px]', 'data-[scrolled=true]:max-w-[860px]');
      expect(header).toHaveClass('mx-auto', 'inset-x-0');
    });

    it('keeps 12px from both side edges, or the notch inset when it is larger, so a landscape notch never clips it', () => {
      const header = renderHeader();

      expect(header).toHaveClass(
        'w-[calc(100%-2*max(12px,env(safe-area-inset-left),env(safe-area-inset-right)))]',
      );
    });

    it('transitions only max-width, translate and opacity', () => {
      const header = renderHeader();

      expect(header).toHaveClass('transition-[max-width,translate,opacity]');
    });

    it('moves 8px up and gets thinner on a phone held sideways', () => {
      const header = renderHeader();

      expect(header).toHaveClass(
        '[@media(max-height:480px)]:-translate-y-2',
        '[@media(max-height:480px)]:py-0.5',
      );
    });
  });

  describe('breakpoints', () => {
    it('shows the nav only from lg', () => {
      renderHeader();

      expect(desktopNav()).toHaveClass('hidden', 'lg:block');
    });

    it('shows the CTA from md', () => {
      renderHeader();

      const cta = screen.getByRole('link', { name: PRIMARY_CTA.label });
      expect(cta).toHaveAttribute('href', PRIMARY_CTA.to);
      expect(cta).toHaveClass('hidden', 'md:inline-flex');
    });

    it('shows the 44px menu button up to lg', () => {
      renderHeader();

      const button = screen.getByRole('button', { name: 'Abrir menu' });
      expect(button).toHaveClass('lg:hidden', 'size-11');
    });
  });

  describe('nav links', () => {
    it('renders every main nav item, lowercased by CSS, with its own href', () => {
      renderHeader();

      for (const item of MAIN_NAV) {
        const link = within(desktopNav()).getByRole('link', { name: item.label });
        expect(link).toHaveAttribute('href', item.to);
        expect(link).toHaveClass('lowercase', 'min-h-11');
      }
    });

    it('keeps the hash items as router links to the home page sections', () => {
      renderHeader('/servicos');

      expect(within(desktopNav()).getByRole('link', { name: 'Como funciona' })).toHaveAttribute('href', '/#metodo');
      expect(within(desktopNav()).getByRole('link', { name: 'Clientes' })).toHaveAttribute('href', '/#clientes');
    });

    it('marks the current page with aria-current', () => {
      renderHeader('/servicos');

      expect(within(desktopNav()).getByRole('link', { name: 'Serviços' })).toHaveAttribute('aria-current', 'page');
      expect(within(desktopNav()).getByRole('link', { name: 'Sobre' })).not.toHaveAttribute('aria-current');
    });

    it('keeps Projetos current on a project page', () => {
      renderHeader('/projetos/troco');

      expect(within(desktopNav()).getByRole('link', { name: 'Projetos' })).toHaveAttribute('aria-current', 'page');
    });

    it('never marks a hash item as current, not even on the home page', () => {
      renderHeader('/');

      const current = within(desktopNav())
        .getAllByRole('link')
        .filter((link) => link.hasAttribute('aria-current'));
      expect(current).toEqual([]);
    });

    it('does not mix up a path that only starts with the same letters', () => {
      renderHeader('/servicos-extra');

      expect(within(desktopNav()).getByRole('link', { name: 'Serviços' })).not.toHaveAttribute('aria-current');
    });
  });

  describe('when the viewport grows to the desktop nav', () => {
    it('closes an open menu, because its button disappears at lg', async () => {
      const media = stubMatchMedia();
      const user = userEvent.setup();
      renderHeader();
      await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
      expect(await screen.findByRole('dialog', { name: 'Menu de navegação' })).toBeInTheDocument();

      act(() => media.set(DESKTOP_NAV_QUERY, true));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('leaves an open menu alone while the viewport stays below lg', async () => {
      const media = stubMatchMedia();
      const user = userEvent.setup();
      renderHeader();
      await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
      await screen.findByRole('dialog', { name: 'Menu de navegação' });

      act(() => media.set('(min-width: 768px)', true));

      expect(screen.getByRole('dialog', { name: 'Menu de navegação' })).toBeInTheDocument();
    });
  });

  describe('menu button', () => {
    it('is named "Abrir menu" and points at the dialog it opens', () => {
      renderHeader();

      const button = screen.getByRole('button', { name: 'Abrir menu' });
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(button).toHaveAttribute('aria-controls');
    });

    it('opens the menu, switches to "Fechar menu" and reports aria-expanded', async () => {
      const user = userEvent.setup();
      renderHeader();
      const button = screen.getByRole('button', { name: 'Abrir menu' });
      const controls = button.getAttribute('aria-controls');

      await user.click(button);

      const dialog = await screen.findByRole('dialog', { name: 'Menu de navegação' });
      expect(dialog).toHaveAttribute('id', controls);
      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(button).toHaveAttribute('aria-label', 'Fechar menu');
    });
  });
});
