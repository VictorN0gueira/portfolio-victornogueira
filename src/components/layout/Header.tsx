import { Menu } from 'lucide-react';
import { Suspense, useId, useRef, useState, type Ref, type RefObject } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MAIN_NAV, MENU_BUTTON_NAME, PRIMARY_CTA } from '../../data/navigation';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { lazyWithRetry } from '../../lib/lazyWithRetry';
import { KEEPS_PLACE_UNDER_SCROLL_LOCK } from '../../lib/scrollLock';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';
import { DESKTOP_NAV_QUERY, HEADER_STYLE } from './headerMetrics';
import { isNavCurrent } from './isNavCurrent';
import { MenuBoundary } from './MenuBoundary';
import { MenuFallback } from './MenuFallback';
import { loadMobileMenu } from './menuLoader';
import { useScrolled } from './useScrolled';

const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vn-ink';

// The menu is a Radix dialog: it loads on the first tap, or earlier when the pointer or the focus reaches the button.
// A failed load must not leave an unhandled rejection (the prefetch) nor blank the page (MenuBoundary, below).
// One retry for a transient failure; the menu never reloads the page (canReload off), its boundary shows the links.
const prefetchMobileMenu = () => {
  loadMobileMenu().catch(() => undefined);
};
const MobileMenu = lazyWithRetry(loadMobileMenu, { canReload: false });

// The two halves of the pill are clipped by the same amount, a hairline layer under a white one, so the hairline
// follows the rounded ends while the pill narrows. Only clip-path and translate move: no layout property.
const PILL_EASE = 'duration-500 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none';
const PILL_LAYER = `absolute inset-0 rounded-full transition-[clip-path] ${PILL_EASE}`;
// HEADER_SIDE_CUT of headerMetrics.ts, written out because Tailwind reads class names as plain text.
const CUT_VAR = '[--cut:max(0px,calc((100cqw_-_53.75rem)_/_2))]';
// The content keeps the layout of the wide pill and slides inward by the same cut, so it never reflows.
const SLIDE = `transition-[translate] ${PILL_EASE}`;

/** The pill behind the content: opaque white (headings never show through) with a hairline and a soft shadow. */
function PillBackground() {
  return (
    <span
      aria-hidden="true"
      data-header-pill=""
      className={`pointer-events-none absolute inset-0 drop-shadow-[0_6px_18px_color-mix(in_srgb,var(--color-vn-black)_8%,transparent)] ${CUT_VAR}`}
    >
      <span
        className={`${PILL_LAYER} bg-vn-gray-light [clip-path:inset(0_0_round_9999px)] group-data-[scrolled=true]/header:[clip-path:inset(0_var(--cut)_round_9999px)]`}
      />
      <span
        className={`${PILL_LAYER} bg-vn-white [clip-path:inset(1px_1px_round_9999px)] group-data-[scrolled=true]/header:[clip-path:inset(1px_calc(var(--cut)+1px)_round_9999px)]`}
      />
    </span>
  );
}

interface MenuButtonProps {
  ref: Ref<HTMLButtonElement>;
  isOpen: boolean;
  controlsId: string;
  onToggle: () => void;
}

/** The 44px button of the phone and tablet menu. Its name is constant, aria-expanded tells the state. */
function MenuButton({ ref, isOpen, controlsId, onToggle }: MenuButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={MENU_BUTTON_NAME}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-controls={isOpen ? controlsId : undefined}
      onClick={onToggle}
      onPointerEnter={prefetchMobileMenu}
      onFocus={prefetchMobileMenu}
      className={`pointer-events-auto grid size-11 shrink-0 place-items-center rounded-full text-vn-ink hover:bg-vn-cream lg:hidden ${FOCUS_RING}`}
    >
      <Menu className="size-5" aria-hidden="true" />
    </button>
  );
}

/** The six links of the desktop nav, from lg. The current page carries aria-current and the underline. */
function DesktopNav() {
  const { pathname } = useLocation();

  return (
    <nav aria-label="Navegação principal" className="pointer-events-auto hidden min-w-0 lg:block">
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
  );
}

interface MenuSlotProps {
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusTo: RefObject<HTMLElement | null>;
}

/** The menu once it was asked for: the lazy dialog, with the plain link panel in its place if its code fails to load. */
function MenuSlot({ id, open, onOpenChange, returnFocusTo }: MenuSlotProps) {
  const close = () => onOpenChange(false);

  return (
    <MenuBoundary fallback={<MenuFallback open={open} id={id} onClose={close} returnFocusTo={returnFocusTo} />}>
      <Suspense fallback={null}>
        <MobileMenu id={id} open={open} onOpenChange={onOpenChange} returnFocusTo={returnFocusTo} />
      </Suspense>
    </MenuBoundary>
  );
}

/**
 * The state of the phone and tablet menu. It opens on the first press (and stays mounted after that), and it closes
 * by itself at lg, because its button disappears there and an open menu would have no visible way to be dismissed.
 * The dialog covers the button while it is open, so a second press only reaches it in the fallback panel.
 */
function useMenuState(isDesktop: boolean) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  if (isDesktop && isOpen) setIsOpen(false);

  const toggle = () => {
    setHasOpened(true);
    setIsOpen((wasOpen) => !wasOpen);
  };

  return { isOpen, hasOpened, toggle, setIsOpen };
}

/**
 * Floating pill that stays at the top. From lg it shows the nav and the CTA, between md and lg the CTA and
 * the menu button, and below md only the logo and the menu button. After 60px of scroll it narrows
 * (data-scrolled="true"). The nav links are plain router links, so `/#metodo` navigates and the page scrolls.
 */
export function Header() {
  const isScrolled = useScrolled();
  const menu = useMenuState(useMediaQuery(DESKTOP_NAV_QUERY));
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  return (
    <header
      data-scrolled={isScrolled ? 'true' : undefined}
      style={HEADER_STYLE}
      // The header is the wide pill, up to 68.75rem (1100px). Scrolled, the background is clipped to 53.75rem (860px)
      // and the logo and the right side slide in by the same cut, so only clip-path and translate move. It is its own
      // size container to read its width (cqw) and lets the pointer through where the pill is cut away.
      className={`group/header ${KEEPS_PLACE_UNDER_SCROLL_LOCK} pointer-events-none fixed inset-x-0 z-50 mx-auto max-w-[68.75rem] ${SLIDE} [container-type:inline-size] [@media(max-height:480px)]:-translate-y-2 ${CUT_VAR}`}
    >
      <PillBackground />
      <div className="relative flex items-center justify-between gap-2 border border-transparent py-1.5 pr-1.5 pl-4 min-[360px]:pl-5 [@media(max-height:480px)]:py-0.5">
        <Link
          to="/"
          aria-label="VN One, página inicial"
          className={`pointer-events-auto inline-flex min-h-11 shrink-0 items-center rounded-full group-data-[scrolled=true]/header:translate-x-[var(--cut)] ${SLIDE} ${FOCUS_RING}`}
        >
          <Logo variant="onLight" className="h-8 w-auto" />
        </Link>

        <DesktopNav />

        <div
          className={`flex shrink-0 items-center gap-1 group-data-[scrolled=true]/header:-translate-x-[var(--cut)] ${SLIDE}`}
        >
          <Button asChild className="pointer-events-auto hidden lowercase md:inline-flex">
            <Link to={PRIMARY_CTA.to}>{PRIMARY_CTA.label}</Link>
          </Button>
          <MenuButton ref={menuButtonRef} isOpen={menu.isOpen} controlsId={menuId} onToggle={menu.toggle} />
        </div>
      </div>
      {menu.hasOpened ? (
        <MenuSlot id={menuId} open={menu.isOpen} onOpenChange={menu.setIsOpen} returnFocusTo={menuButtonRef} />
      ) : null}
    </header>
  );
}
