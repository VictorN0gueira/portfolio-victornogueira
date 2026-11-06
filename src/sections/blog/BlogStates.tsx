import { AlertTriangle, Newspaper, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { Heading } from '../../components/ui/Heading';
import { blogCopy } from './blogCopy';

const CENTERED_CLASSES = 'flex flex-col items-center text-center';
const ICON_CIRCLE_CLASSES =
  'mb-6 flex size-20 items-center justify-center rounded-full border border-vn-gray-light bg-vn-white text-vn-ink';
const OUTLINE_BUTTON_CLASSES =
  'inline-flex min-h-11 items-center rounded-full border border-vn-ink px-6 text-sm font-medium text-vn-ink hover:bg-vn-ink hover:text-vn-white vn-focus-ring-ink';

const FRAME_CLASSES = `${CENTERED_CLASSES} py-[clamp(3rem,2rem+5vw,7rem)]`;

function StateFrame({ icon, role, children }: { icon: ReactNode; role?: 'alert'; children: ReactNode }) {
  return (
    <div role={role} className={FRAME_CLASSES}>
      <div className={ICON_CIRCLE_CLASSES}>{icon}</div>
      {children}
    </div>
  );
}

/** The sources failed. It says so in the words of the copy, never with the message of the error: it is for the visitor to read. */
export function ErrorState() {
  return (
    <StateFrame icon={<AlertTriangle className="size-8" />} role="alert">
      <Heading as="h2" size="m">
        {blogCopy.states.errorTitle}
      </Heading>
      <p className="mt-3 max-w-md break-words text-base text-vn-gray-dark">{blogCopy.states.errorFallback}</p>
    </StateFrame>
  );
}

/** No article at all, from any source. */
export function EmptyState() {
  return (
    <StateFrame icon={<Newspaper className="size-8" />}>
      <Heading as="h2" size="m">
        {blogCopy.states.emptyTitle}
      </Heading>
      <p className="mt-3 text-base text-vn-gray-dark">{blogCopy.states.emptyHint}</p>
    </StateFrame>
  );
}

/**
 * The filters left nothing. It is plain text: the count of the filters (a status region) already says it, and a second
 * live region would announce the same thing twice.
 */
export function NoMatchState({ onClear }: { onClear: () => void }) {
  return (
    <StateFrame icon={<Search className="size-8" />}>
      <p className="font-display text-[length:clamp(1.5rem,1.2rem+1vw,1.75rem)] font-bold lowercase leading-[.98] tracking-[-0.03em]">
        {blogCopy.states.noMatchTitle}
      </p>
      <p className="mt-3 text-base text-vn-gray-dark">{blogCopy.states.noMatchHint}</p>
      <button type="button" onClick={onClear} className={`${OUTLINE_BUTTON_CLASSES} mt-6`}>
        {blogCopy.filters.clear}
      </button>
    </StateFrame>
  );
}
