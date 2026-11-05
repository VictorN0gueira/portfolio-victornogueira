import { useState, type ReactNode } from 'react';
import { useMotionAllowed } from '../../hooks/useMotionAllowed';
import { cn } from '../../lib/utils';
import type { NewsArticle } from '../../utils/newsService';
import { FALLBACK_IMAGE } from './coverFallback';

interface ArticleCoverProps {
  article: NewsArticle;
  /** The box of the cover: its aspect ratio or its height. The picture fills it. */
  className?: string;
  /** What sits on the picture: the tags. */
  children?: ReactNode;
}

// The cover grows 5% under the pointer and on keyboard focus of the card: a transform, and only where motion is welcome.
const COVER_HOVER_CLASSES =
  'transition-transform duration-500 ease-out group-hover:scale-105 group-focus-visible:scale-105';

/**
 * The cover of an article. It is somebody else's picture: it is asked for with no Referer, decoded off the main thread and
 * loaded lazily, and when it is missing or fails the card shows the picture of the brand instead.
 */
export function ArticleCover({ article, className, children }: ArticleCoverProps) {
  const [hasFailed, setHasFailed] = useState(false);
  const isMotionAllowed = useMotionAllowed();

  return (
    <div className={cn('relative overflow-hidden bg-vn-ink', className)}>
      <img
        src={hasFailed || !article.image ? FALLBACK_IMAGE : article.image}
        onError={() => setHasFailed(true)}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        alt=""
        className={cn('absolute inset-0 h-full w-full object-cover', isMotionAllowed && COVER_HOVER_CLASSES)}
      />
      {children}
    </div>
  );
}
