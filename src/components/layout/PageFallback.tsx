import { shellCopy } from '../../data/shellCopy';

/**
 * Fallback of a whole page: min-h-dvh avoids a flash and layout shift while a lazy page loads between routes
 * (AnimatePresence mode="wait"). The status region holds a text, because a live region announces its content and not
 * its name: the spinner is the picture and the text is for screen readers.
 */
export function PageFallback() {
  return (
    <div role="status" aria-label={shellCopy.pageLoading} className="flex min-h-dvh items-center justify-center bg-vn-cream">
      <div aria-hidden="true" className="size-10 animate-spin rounded-full border-2 border-vn-gray-light border-t-vn-gray-mid" />
      <span className="sr-only">{shellCopy.pageLoading}</span>
    </div>
  );
}
