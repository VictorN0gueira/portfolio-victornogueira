import { Bot, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import type { CategoryTag } from './blogMeta';

interface ArticleTagsProps {
  /** The id the link of the card points at with aria-describedby. */
  id: string;
  tag: CategoryTag;
  /** What sits next to the two pills in the same row: the NOVO pill. It has an id of its own. */
  children?: ReactNode;
}

// The pills sit on a cover that is somebody else's picture, light or dark, so each one carries its own opaque black surface
// with white text, so the contrast holds over any cover.
const PILL_CLASSES =
  'inline-flex max-w-full items-center gap-1 rounded-full border border-vn-gray-dark bg-vn-black px-3 py-1 font-mono text-xs font-medium uppercase tracking-[.12em] text-vn-white';

/**
 * The language and topic pills over the corner of a cover, with what comes after them (NOVO) in the same wrapping row, so
 * the pieces never run under each other on a narrow card. The pills are the children of the `id` element, which has no box
 * of its own: it exists to be the description of the card.
 */
export function ArticleTags({ id, tag, children }: ArticleTagsProps) {
  const TopicIcon = tag.topicIcon === 'zap' ? Zap : Bot;

  return (
    <div className="absolute inset-x-3 top-3 flex flex-wrap items-start gap-2">
      <div id={id} className="contents">
        <span className={PILL_CLASSES}>{tag.langLabel}</span>
        <span className={PILL_CLASSES}>
          <TopicIcon className="size-3 shrink-0" />
          {tag.topicLabel}
        </span>
      </div>
      {children}
    </div>
  );
}
