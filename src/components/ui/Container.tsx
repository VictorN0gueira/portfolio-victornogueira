import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface ContainerProps {
  children: ReactNode;
  className?: string;
}

/** Centers content at 1216px with gutters that grow from 16px (280px screens) to 48px. */
export function Container({ children, className }: ContainerProps) {
  return (
    <div className={cn('mx-auto w-full max-w-[1216px] px-4 min-[360px]:px-5 md:px-12', className)}>
      {children}
    </div>
  );
}
