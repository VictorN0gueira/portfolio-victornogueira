import { shellCopy } from '../../data/shellCopy';

/**
 * What shows while the 404 loads (it is a lazy chunk): the same black and the same full dynamic height as the 404 itself,
 * so the footer and the background do not jump when it arrives. The status region holds a text, because a live region
 * announces its content and not its name: the spinner is the picture and the text is for screen readers.
 */
export function NotFoundFallback() {
  return (
    <div role="status" aria-label={shellCopy.pageLoading} className="flex min-h-dvh items-center justify-center bg-vn-black">
      <div
        aria-hidden="true"
        className="size-10 rounded-full border-2 border-vn-gray-dark border-t-vn-gray-light motion-safe:animate-spin"
      />
      <span className="sr-only">{shellCopy.pageLoading}</span>
    </div>
  );
}
