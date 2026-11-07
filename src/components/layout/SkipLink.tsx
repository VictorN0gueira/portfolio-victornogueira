import type { MouseEvent } from 'react';

export const MAIN_CONTENT_ID = 'main-content';

/**
 * First focusable element of every page. It stays out of sight until it gets keyboard focus.
 * The click moves focus to the main landmark (which has tabIndex -1) without touching the URL hash,
 * so it never adds a history entry or triggers the hash scroll of a page.
 */
export function SkipLink() {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const main = document.getElementById(MAIN_CONTENT_ID);
    if (!main) return;

    event.preventDefault();
    requestAnimationFrame(() => {
      main.focus();
    });
  };

  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      onClick={handleClick}
      className="sr-only focus:not-sr-only focus:fixed focus:left-[max(16px,env(safe-area-inset-left))] focus:top-[max(16px,env(safe-area-inset-top))] focus:z-(--vn-z-skip) focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-full focus:border-2 focus:border-vn-ink focus:bg-vn-white focus:px-6 focus:text-sm focus:font-medium focus:text-vn-ink vn-focus-ring-ink"
    >
      Pular para o conteúdo
    </a>
  );
}
