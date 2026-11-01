import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

const FOOTER_COLUMN_TITLE = 'font-mono text-xs lowercase tracking-[0.18em] text-vn-gray-mid';
/** A footer link: 44px tall and wide at least, so a short word is a full touch target. */
export const FOOTER_LINK =
  'inline-flex min-h-11 min-w-11 items-center text-sm text-vn-gray-light hover:text-vn-white [overflow-wrap:anywhere] vn-focus-ring';

interface FooterColumnProps {
  title: string;
  /** A navigation landmark when it has a name, a plain block otherwise. */
  navLabel?: string;
  className?: string;
  children: ReactNode;
}

/** One column of the footer: a mono title over a list of the items given as `<li>` children. */
export function FooterColumn({ title, navLabel, className, children }: FooterColumnProps) {
  const content = (
    <>
      <h2 className={FOOTER_COLUMN_TITLE}>{title}</h2>
      <ul className="mt-3">{children}</ul>
    </>
  );

  if (navLabel) {
    return (
      <nav aria-label={navLabel} className={className}>
        {content}
      </nav>
    );
  }

  return <div className={cn(className)}>{content}</div>;
}
