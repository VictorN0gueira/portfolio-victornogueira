import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MAIN_NAV, PRIMARY_CTA } from '../../data/navigation';
import { CONTACT_EMAIL } from '../../lib/constants';
import Button from '../ui/Button';
import Logo from '../ui/Logo';
import { isNavCurrent } from './isNavCurrent';

interface MobileMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The element that opens the menu. It gets aria-expanded and aria-controls, and gets the focus back on close. */
  trigger: ReactNode;
}

// The panel pads itself with the safe area (notch, home indicator, a notch on the side of a phone held
// sideways). Inline because each side compares the inset with a minimum instead of replacing it.
const PANEL_PADDING = {
  paddingTop: 'max(16px, env(safe-area-inset-top))',
  paddingRight: 'max(20px, env(safe-area-inset-right))',
  paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
  paddingLeft: '20px',
} as const;

const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vn-white';

/**
 * The navigation of phones and tablets, as a Radix dialog: it traps focus, closes on Escape and marks
 * the rest of the page inert. The panel scrolls on its own, which a phone held sideways needs.
 * It closes by itself whenever the route changes, including a click on the link of the current page.
 */
export function MobileMenu({ open, onOpenChange, trigger }: MobileMenuProps) {
  const { pathname, key } = useLocation();
  const previousKey = useRef(key);

  // Only a real navigation closes the menu. Comparing the key (not just listing it as a dependency)
  // keeps a parent that passes a new onOpenChange function on every render from closing it by accident.
  useEffect(() => {
    if (previousKey.current === key) return;

    previousKey.current = key;
    onOpenChange(false);
  }, [key, onOpenChange]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="vn-menu-overlay fixed inset-0 z-[160] bg-vn-black/70" />
        <Dialog.Content
          style={PANEL_PADDING}
          className="vn-menu-panel fixed right-0 top-0 z-[170] flex h-dvh w-full min-[420px]:w-[24rem] flex-col overflow-y-auto overscroll-contain bg-vn-black text-vn-white outline-none"
        >
          <Dialog.Title className="sr-only">Menu de navegação</Dialog.Title>
          <Dialog.Description className="sr-only">
            Links para as páginas do site e para falar com a VN One.
          </Dialog.Description>

          <div className="flex items-center justify-between">
            <Logo variant="onDark" decorative className="h-8 w-auto" />
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Fechar menu"
                className={`-mr-2 grid size-11 place-items-center rounded-full text-vn-white hover:bg-vn-ink ${FOCUS_RING}`}
              >
                <X className="size-6" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          <nav aria-label="Menu principal" className="mt-6 [@media(max-height:480px)]:mt-2">
            <ul>
              {MAIN_NAV.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    aria-current={isNavCurrent(item.to, pathname) ? 'page' : undefined}
                    className={`flex min-h-14 items-center font-display text-[clamp(1.75rem,8vw,2.25rem)] font-bold lowercase leading-none tracking-[-0.03em] text-vn-gray-mid hover:text-vn-white aria-[current=page]:text-vn-white [@media(max-height:480px)]:min-h-11 [@media(max-height:480px)]:text-2xl ${FOCUS_RING}`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-auto flex flex-col gap-3 pt-8 [@media(max-height:480px)]:pt-4">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className={`inline-flex min-h-11 items-center font-mono text-sm text-vn-gray-light hover:text-vn-white [overflow-wrap:anywhere] ${FOCUS_RING}`}
            >
              {CONTACT_EMAIL}
            </a>
            <Button asChild tone="dark" size="lg" className="w-full lowercase">
              <Link to={PRIMARY_CTA.to}>{PRIMARY_CTA.label}</Link>
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default MobileMenu;
