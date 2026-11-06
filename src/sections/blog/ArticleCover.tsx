import { useState, type ReactNode } from 'react';
import { useMotionAllowed } from '../../hooks/useMotionAllowed';
import { cn } from '../../lib/utils';
import type { NewsArticle } from '../../utils/newsService';
import { coverSource } from './articleLinks';
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

interface CoverImageProps {
  cover: string | undefined;
  isMotionAllowed: boolean;
}

/** The picture itself. It is keyed by its address in the cover, so a failed state never outlives the picture that failed. */
function CoverImage({ cover, isMotionAllowed }: CoverImageProps) {
  const [hasFailed, setHasFailed] = useState(false);

  return (
    <img
      src={hasFailed || !cover ? FALLBACK_IMAGE : cover}
      onError={() => setHasFailed(true)}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      alt=""
      className={cn('absolute inset-0 h-full w-full object-cover', isMotionAllowed && COVER_HOVER_CLASSES)}
    />
  );
}

/**
 * The cover of an article. It is somebody else's picture: it is asked for with no Referer, decoded off the main thread and
 * loaded lazily, and when it is missing, is not an http or https address or fails, the card shows the picture of the brand.
 */
export function ArticleCover({ article, className, children }: ArticleCoverProps) {
  const isMotionAllowed = useMotionAllowed();
  const cover = coverSource(article);

  return (
    <div className={cn('relative overflow-hidden bg-vn-ink', className)}>
      <CoverImage key={cover ?? 'none'} cover={cover} isMotionAllowed={isMotionAllowed} />
      {children}
    </div>
  );
}
