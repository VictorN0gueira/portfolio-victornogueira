import type { Insets, Size } from './floatingLayout';

export interface FloatingView {
  viewport: Size;
  insets: Insets;
}

/** The safe area insets in px, read through a probe element, since CSS env() has no JavaScript API. */
function readInsets(): Insets {
  const probe = document.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)';
  document.body.appendChild(probe);
  const style = window.getComputedStyle(probe);
  const insets = { top: Number.parseFloat(style.paddingTop) || 0, bottom: Number.parseFloat(style.paddingBottom) || 0 };
  probe.remove();
  return insets;
}

/** The window the fixed buttons live in: width without a classic scrollbar, the height of the layout viewport. */
export function readFloatingView(): FloatingView {
  return {
    viewport: { width: document.documentElement.clientWidth || window.innerWidth, height: window.innerHeight },
    insets: readInsets(),
  };
}
