import { useEffect, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { MAIN_NAV, PRIMARY_CTA } from '../../data/navigation';
import Button from '../ui/Button';

interface MenuFallbackProps {
  open: boolean;
  /** The id of the panel, which the menu button names in aria-controls. */
  id: string;
  onClose: () => void;
  /** The menu button: it keeps the focus, and gets it back on Escape. */
  returnFocusTo: RefObject<HTMLElement | null>;
}

// The header is fixed, so a panel taller than the window would hang below the fold with nothing to scroll: it keeps to
// the height that is left under the pill (about 5rem) and scrolls on its own, which a phone held sideways needs.
const PANEL =
  'pointer-events-auto absolute inset-x-0 top-full mt-2 max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain rounded-3xl bg-vn-black p-3 text-vn-white';
const LINK =
  'flex min-h-11 items-center rounded-full px-4 font-display text-lg font-bold lowercase text-vn-gray-light hover:text-vn-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vn-white';

/** Closes on Escape while the panel is open, and hands the focus back to the button that opened it. */
function useCloseOnEscape(open: boolean, onClose: () => void, returnFocusTo: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      onClose();
      returnFocusTo.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, returnFocusTo]);
}

/**
 * The menu when the code of the dialog could not be loaded: a plain panel under the header with the same links, no
 * focus trap and no scroll lock, which is all the dialog code was for. It is part of the header, so it costs no request.
 */
export function MenuFallback({ open, id, onClose, returnFocusTo }: MenuFallbackProps) {
  useCloseOnEscape(open, onClose, returnFocusTo);

  if (!open) return null;

  return (
    <div id={id} className={PANEL}>
      <nav aria-label="Menu principal">
        <ul>
          {MAIN_NAV.map((item) => (
            <li key={item.to}>
              <Link to={item.to} onClick={onClose} className={LINK}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <Button asChild tone="dark" size="lg" className="mt-2 w-full lowercase">
        <Link to={PRIMARY_CTA.to} onClick={onClose}>
          {PRIMARY_CTA.label}
        </Link>
      </Button>
    </div>
  );
}

export default MenuFallback;
