import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MAIN_NAV, PRIMARY_CTA } from '../../data/navigation';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { KEEPS_PLACE_UNDER_SCROLL_LOCK, SCROLL_LOCK_BAR_SIZE } from '../../lib/scrollLock';
import Button from '../ui/Button';
import Logo from '../ui/Logo';
import { isNavCurrent } from './isNavCurrent';
import MobileMenu from './MobileMenu';

const SCROLLED_AFTER_PX = 60;
// Six links and the CTA do not fit a tablet held upright, so the desktop nav starts at lg.
const DESKTOP_NAV_QUERY = '(min-width: 1024px)';

const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vn-ink';

// Inline because it compares the notch inset with 12px: pt-safe would replace the offset instead.
export const HEADER_TOP_OFFSET = 'max(12px, env(safe-area-inset-top))';
// The width is the window minus a gutter on each side, and minus the scrollbar a modal removes: that one widens the
// viewport (the percentage) and the class of lib/scrollLock.ts narrows the region the header is centred in by the same
// amount, so without this term the header would grow by the width of the bar while a modal is open.
const HEADER_GUTTER = 'max(12px, env(safe-area-inset-left), env(safe-area-inset-right))';
const HEADER_STYLE = {
  top: HEADER_TOP_OFFSET,
  width: `calc(100% - 2 * ${HEADER_GUTTER} - ${SCROLL_LOCK_BAR_SIZE})`,
} as const;
// What a page needs to start its content below the header, in rem so it follows a larger font like the header does.
// The header is 44px controls (2.75rem), 0.375rem of padding above and below (py-1.5) and a 1px border on each side.
export const HEADER_HEIGHT = 'calc(3.5rem + 2px)';
// A phone held sideways: 0.125rem of padding (py-0.5) instead of 0.375rem, and the pill lifted by 0.5rem (-translate-y-2).
export const HEADER_HEIGHT_LANDSCAPE = 'calc(3rem + 2px)';
export const HEADER_LANDSCAPE_LIFT = '0.5rem';

function readScrolled(): boolean {
  return typeof window !== 'undefined' && window.scrollY > SCROLLED_AFTER_PX;
}

/** True once the page scrolled past the threshold. The listener is passive and throttled to one update per frame. */
function useScrolled(): boolean {
  const [isScrolled, setIsScrolled] = useState(readScrolled);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      setIsScrolled(readScrolled());
    };
    const handleScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return isScrolled;
}

/**
 * Floating pill that stays at the top. From lg it shows the nav and the CTA, between md and lg the CTA and
 * the menu button, and below md only the logo and the menu button. After 60px of scroll it narrows
 * (data-scrolled="true"). The nav links are plain router links, so `/#metodo` navigates and the page scrolls.
 */
export function Header() {
  const { pathname } = useLocation();
  const isScrolled = useScrolled();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isDesktop = useMediaQuery(DESKTOP_NAV_QUERY);

  // The menu button disappears at lg, so an open menu would have no visible way to be dismissed.
  useEffect(() => {
    if (isDesktop) setIsMenuOpen(false);
  }, [isDesktop]);

  const menuButton = (
    <button
      type="button"
      aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
      className={`grid size-11 shrink-0 place-items-center rounded-full text-vn-ink hover:bg-vn-cream lg:hidden ${FOCUS_RING}`}
    >
      {isMenuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
    </button>
  );

  return (
    <header
      data-scrolled={isScrolled ? 'true' : undefined}
      style={HEADER_STYLE}
      // max-width is the one layout property animated on the site. It is allowed here because the header is
      // a single fixed element and its inner flex row only re-centers, so no other box depends on its size.
      // Everything else moves with transform, translate and opacity only. The caps are in rem (68.75rem is
      // 1100px and 53.75rem is 860px at the normal font) so they grow with a11y-font-large, like the labels.
      className={`${KEEPS_PLACE_UNDER_SCROLL_LOCK} fixed inset-x-0 z-50 mx-auto flex max-w-[68.75rem] items-center justify-between gap-2 rounded-full border border-vn-gray-light bg-vn-white/90 py-1.5 pr-1.5 pl-4 backdrop-blur-md transition-[max-width,translate,opacity] duration-500 ease-out data-[scrolled=true]:max-w-[53.75rem] min-[360px]:pl-5 [@media(max-height:480px)]:-translate-y-2 [@media(max-height:480px)]:py-0.5`}
    >
      <Link
        to="/"
        aria-label="VN One, página inicial"
        className={`inline-flex min-h-11 shrink-0 items-center rounded-full ${FOCUS_RING}`}
      >
        <Logo variant="onLight" className="h-8 w-auto" />
      </Link>

      <nav aria-label="Navegação principal" className="hidden min-w-0 lg:block">
        <ul className="flex items-center">
          {MAIN_NAV.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-current={isNavCurrent(item.to, pathname) ? 'page' : undefined}
                className={`relative inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium lowercase text-vn-gray-dark after:absolute after:inset-x-3 after:bottom-2 after:h-0.5 after:origin-left after:scale-x-0 after:bg-vn-ink after:transition-transform after:duration-300 after:ease-out hover:text-vn-ink hover:after:scale-x-100 aria-[current=page]:text-vn-ink aria-[current=page]:after:scale-x-100 ${FOCUS_RING}`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex shrink-0 items-center gap-1">
        <Button asChild className="hidden lowercase md:inline-flex">
          <Link to={PRIMARY_CTA.to}>{PRIMARY_CTA.label}</Link>
        </Button>
        <MobileMenu open={isMenuOpen} onOpenChange={setIsMenuOpen} trigger={menuButton} />
      </div>
    </header>
  );
}

export default Header;
