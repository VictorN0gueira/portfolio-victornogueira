import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAIN_NAV, PRIMARY_CTA } from '../../data/navigation';
import { MD_QUERY } from '../../lib/breakpoints';
import { stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import Header from './Header';
import {
  HEADER_HEIGHT,
  HEADER_HEIGHT_LANDSCAPE,
  HEADER_LANDSCAPE_LIFT,
  HEADER_MAX_WIDTH,
  HEADER_SCROLLED_MAX_WIDTH,
  HEADER_SIDE_CUT,
  HEADER_TOP_OFFSET,
} from './headerMetrics';

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
      expect(header).toHaveClass('fixed');
    });

    it('draws an opaque white pill with a hairline, never a translucent or blurred one (headings must not bleed through)', () => {
      const header = renderHeader();

      const layers = Array.from(header.querySelectorAll('[data-header-pill] > span'));
      expect(layers).toHaveLength(2);
      expect(layers[0]).toHaveClass('bg-vn-gray-light', 'rounded-full');
      expect(layers[1]).toHaveClass('bg-vn-white', 'rounded-full');
      expect(header.innerHTML).not.toMatch(/bg-vn-white\/\d|backdrop-blur/);
      expect(header.querySelector('[data-header-pill]')?.className).toContain('drop-shadow');
    });

    it('lets the pointer through the pill, and takes it back on the links and buttons', () => {
      const header = renderHeader();

      expect(header).toHaveClass('pointer-events-none');
      expect(screen.getByRole('link', { name: 'VN One, página inicial' })).toHaveClass('pointer-events-auto');
      expect(screen.getByRole('button', { name: 'Menu' })).toHaveClass('pointer-events-auto');
    });

    it('is as wide as the screen minus a symmetric gutter, up to 1100px, and clips the pill to 860px once scrolled', () => {
      const header = renderHeader();

      // In rem, not px: 68.75rem is 1100px and 53.75rem is 860px at the normal font, and both grow with the
      // font when a11y-font-large is on, so the nav labels still fit in the pill.
      expect(HEADER_MAX_WIDTH).toBe('68.75rem');
      expect(HEADER_SCROLLED_MAX_WIDTH).toBe('53.75rem');
      expect(HEADER_SIDE_CUT).toContain(HEADER_SCROLLED_MAX_WIDTH);
      expect(header).toHaveClass(`max-w-[${HEADER_MAX_WIDTH}]`, 'mx-auto', 'inset-x-0');
      expect(header.className).not.toMatch(/max-w-\[\d+px\]|data-\[scrolled=true\]:max-w/);
      expect(header.className).toContain(HEADER_SIDE_CUT.replaceAll(', ', ',').replaceAll(' ', '_'));
    });

    it('keeps 12px from both side edges, or the notch inset when it is larger, so a landscape notch never clips it', () => {
      const header = renderHeader();

      const width = header.getAttribute('style') ?? '';

      expect(width).toContain('max(12px, env(safe-area-inset-left), env(safe-area-inset-right))');
      expect(width).toMatch(/width: calc\(100% - 2 \* max\(/);
    });

    it('takes the scrollbar a modal removes out of its width, and keeps the class that keeps it centred', () => {
      const header = renderHeader();

      // The viewport grows by the width of the bar and the class narrows the centring region by the same amount:
      // without the term in the width, the header would grow by the width of the bar while a modal is open.
      expect(header.getAttribute('style')).toContain('var(--removed-body-scroll-bar-size, 0px))');
      expect(header).toHaveClass('right-scroll-bar-position');
    });

    it('animates no layout property: the pill is clipped and the content slides, with transform like properties only', () => {
      const header = renderHeader();
      const transitions = Array.from(header.querySelectorAll('[data-header-pill] span, a[aria-label^="VN One"], header > div > div'))
        .concat(header)
        .flatMap((element) => element.className.match(/transition-\[([^\]]+)\]/)?.[1].split(',') ?? []);

      expect(transitions.length).toBeGreaterThan(0);
      for (const property of transitions) expect(['translate', 'clip-path', 'opacity']).toContain(property);
      expect(header.innerHTML).not.toContain('max-width');
    });

    it('takes its shadow color from a token and moves the landscape lift with the brand easing (R9)', () => {
      const header = renderHeader();

      expect(header.innerHTML).not.toMatch(/rgba?\(|#[0-9a-f]{3,8}/i);
      expect(header.querySelector('[data-header-pill]')?.className).toContain('var(--color-vn-black)');
      expect(header.className).toContain('ease-[cubic-bezier(.22,1,.36,1)]');
      expect(header.className).toContain('motion-reduce:transition-none');
    });

    it('moves 8px up and gets thinner on a phone held sideways', () => {
      const header = renderHeader();

      expect(header).toHaveClass('[@media(max-height:480px)]:-translate-y-2');
      expect(header.querySelector('[class*="max-height:480px)]:py-0.5"]')).not.toBeNull();
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

      const button = screen.getByRole('button', { name: 'Menu' });
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
      renderHeader('/projetos/dizpara');

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
      await user.click(screen.getByRole('button', { name: 'Menu' }));
      expect(await screen.findByRole('dialog', { name: 'Menu de navegação' })).toBeInTheDocument();

      act(() => media.set(DESKTOP_NAV_QUERY, true));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('leaves an open menu alone while the viewport stays below lg', async () => {
      const media = stubMatchMedia();
      const user = userEvent.setup();
      renderHeader();
      await user.click(screen.getByRole('button', { name: 'Menu' }));
      await screen.findByRole('dialog', { name: 'Menu de navegação' });

      act(() => media.set(MD_QUERY, true));

      expect(screen.getByRole('dialog', { name: 'Menu de navegação' })).toBeInTheDocument();
    });
  });

  describe('menu button', () => {
    it('keeps the constant name "Menu" and reports the state with aria-expanded', () => {
      renderHeader();

      const button = screen.getByRole('button', { name: 'Menu' });
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(button).toHaveAttribute('aria-haspopup', 'dialog');
      expect(button).not.toHaveAttribute('aria-controls');
    });

    it('is in the page before the menu code loads, and the dialog is not', () => {
      renderHeader();

      expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('opens the menu on the first tap, points at the dialog and keeps its name', async () => {
      const user = userEvent.setup();
      renderHeader();
      const button = screen.getByRole('button', { name: 'Menu' });

      await user.click(button);

      const dialog = await screen.findByRole('dialog', { name: 'Menu de navegação' });
      expect(dialog).toHaveAttribute('id', button.getAttribute('aria-controls'));
      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(button).toHaveAttribute('aria-label', 'Menu');
    });

    it('gives the focus back to the button when the menu closes', async () => {
      const user = userEvent.setup();
      renderHeader();
      await user.click(screen.getByRole('button', { name: 'Menu' }));
      await screen.findByRole('dialog', { name: 'Menu de navegação' });

      await user.keyboard('{Escape}');

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(screen.getByRole('button', { name: 'Menu' })).toHaveFocus();
    });

    it('does not reopen by itself when the viewport goes back below lg', async () => {
      const media = stubMatchMedia();
      const user = userEvent.setup();
      renderHeader();
      await user.click(screen.getByRole('button', { name: 'Menu' }));
      await screen.findByRole('dialog', { name: 'Menu de navegação' });

      act(() => media.set(DESKTOP_NAV_QUERY, true));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      act(() => media.set(DESKTOP_NAV_QUERY, false));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});

// The hero reads these to start its content below the header, so they have to follow the classes of the header.
describe('Header geometry', () => {
  it('exports the offset, the height and the landscape variants in rem, next to the classes they describe', () => {
    const header = renderHeader();

    expect(HEADER_TOP_OFFSET).toBe('max(12px, env(safe-area-inset-top))');
    expect(header.style.top).toBe(HEADER_TOP_OFFSET);
    // 44px controls (2.75rem) + 0.375rem of padding above and below + the 1px border on each side.
    expect(HEADER_HEIGHT).toBe('calc(3.5rem + 2px)');
    expect(header.querySelector('.py-1\\.5.border')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'VN One, página inicial' })).toHaveClass('min-h-11');
    // A phone held sideways: 0.125rem of padding instead of 0.375rem, and the pill lifted by 0.5rem.
    expect(HEADER_HEIGHT_LANDSCAPE).toBe('calc(3rem + 2px)');
    expect(HEADER_LANDSCAPE_LIFT).toBe('0.5rem');
    expect(header).toHaveClass('[@media(max-height:480px)]:-translate-y-2');
    expect(header.querySelector('[class*="max-height:480px)]:py-0.5"]')).not.toBeNull();
  });
});
