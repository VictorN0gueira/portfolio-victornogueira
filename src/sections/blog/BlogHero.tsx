import { RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { PageHero } from '../shared/PageHero';
import { blogCopy } from './blogCopy';

interface BlogHeroProps {
  isLoading: boolean;
  /** Where the list on screen comes from, in words. Empty while a load runs. */
  status: string;
  onRefresh: () => void;
}

const REFRESH_CLASSES =
  'inline-flex min-h-11 items-center gap-2 rounded-full border border-vn-ink px-5 text-sm font-medium text-vn-ink hover:bg-vn-ink hover:text-vn-white aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-transparent aria-disabled:hover:text-vn-ink vn-focus-ring-ink';

/**
 * The top of /blog: the PageHero with the Atualizar button and the line that says where the list comes from. While a load
 * runs the button stays in the tab order, so the focus is not dropped to the body (WCAG 2.4.3): it says it is busy with
 * aria-disabled, and the page ignores the press.
 */
export function BlogHero({ isLoading, status, onRefresh }: BlogHeroProps) {
  return (
    <PageHero kicker={blogCopy.kicker} title={blogCopy.title} lead={blogCopy.lead}>
      <div className="mt-8">
        <button type="button" onClick={onRefresh} aria-disabled={isLoading} className={REFRESH_CLASSES}>
          <RefreshCw className={cn('size-4', isLoading && 'motion-safe:animate-spin')} />
          {blogCopy.refresh}
        </button>
        {/* Under the button, with the room of the longest message kept (three lines of its own line height on a phone, two from
            sm, so it follows a larger font): the text is empty while a load runs and comes back with the answer, and the page
            below must not move with it. */}
        <p role="status" className="mt-3 min-h-[3lh] max-w-md text-sm text-vn-gray-dark sm:min-h-[2lh]">
          {status}
        </p>
      </div>
    </PageHero>
  );
}
