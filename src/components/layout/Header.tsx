import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MAIN_NAV, PRIMARY_CTA } from '../../data/navigation';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import Button from '../ui/Button';
import Logo from '../ui/Logo';
import { isNavCurrent } from './isNavCurrent';
import MobileMenu from './MobileMenu';

const SCROLLED_AFTER_PX = 60;
// Six links and the CTA do not fit a tablet held upright, so the desktop nav starts at lg.
const DESKTOP_NAV_QUERY = '(min-width: 1024px)';

const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vn-ink';

// Inline because it compares the notch inset with 12px: pt-safe would replace the offset instead.
const HEADER_OFFSET = { top: 'max(12px, env(safe-area-inset-top))' } as const;

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
      style={HEADER_OFFSET}
      // max-width is the one layout property animated on the site. It is allowed here because the header is
      // a single fixed element and its inner flex row only re-centers, so no other box depends on its size.
      // Everything else moves with transform, translate and opacity only.
      className="fixed inset-x-0 z-50 mx-auto flex w-[calc(100%-24px)] max-w-[1100px] items-center justify-between gap-2 rounded-full border border-vn-gray-light bg-vn-white/90 py-1.5 pr-1.5 pl-4 backdrop-blur-md transition-[max-width,translate,opacity] duration-500 ease-out data-[scrolled=true]:max-w-[860px] min-[360px]:pl-5 [@media(max-height:480px)]:-translate-y-2 [@media(max-height:480px)]:py-0.5"
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
