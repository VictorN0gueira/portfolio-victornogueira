import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface WindowFrameProps {
  /** Shown in the title bar in the mono font, like a file name. */
  title: string;
  /** Optional pill at the right of the title bar. */
  status?: string;
  /** Optional controls at the right end of the title bar, after the status (a pause button, for example). */
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/**
 * Static app window chrome: a dark frame with three gray dots, a mono title and an optional status pill.
 * Palette colors only, and the status is not the accent (the accent is spent once per section elsewhere).
 * The title and the status wrap onto their own lines on narrow screens instead of being cut. The body has
 * no padding: the content decides its own. Controls go in `actions`, at the right end of the title bar.
 */
export function WindowFrame({ title, status, actions, className, children }: WindowFrameProps) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-vn-gray-dark bg-vn-ink text-vn-white', className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-vn-gray-dark px-4 py-3">
        <span aria-hidden="true" className="flex shrink-0 items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-vn-gray-dark" />
          <span className="size-2.5 rounded-full bg-vn-gray-dark" />
          <span className="size-2.5 rounded-full bg-vn-gray-dark" />
        </span>
        <span className="min-w-0 break-words font-mono text-xs text-vn-gray-light">{title}</span>
        {status ? (
          <span className="ml-auto shrink-0 rounded-full border border-vn-gray-mid px-2.5 py-0.5 font-mono text-xs text-vn-gray-light">
            {status}
          </span>
        ) : null}
        {actions ? <div className={cn('flex shrink-0 items-center', !status && 'ml-auto')}>{actions}</div> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
