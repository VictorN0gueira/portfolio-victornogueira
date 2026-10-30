import type { CSSProperties } from 'react';
import type { ProjectShot } from '../data/projects';
import { cn } from '../lib/utils';

interface ProjectShotImageProps {
  shot: ProjectShot;
  /** The `sizes` attribute: the width the image takes at each breakpoint. */
  sizes: string;
  /** The first image of the page loads right away, with high priority. Every other one waits for the scroll. */
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** A project screenshot with every size the manifest knows: srcset, width and height, so nothing shifts when it loads. */
export default function ProjectShotImage({ shot, sizes, priority = false, className, style }: ProjectShotImageProps) {
  const { image, alt } = shot;

  return (
    <img
      src={image.src}
      srcSet={image.srcSet}
      sizes={sizes}
      width={image.width}
      height={image.height}
      alt={alt}
      className={cn('block', className)}
      style={style}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
    />
  );
}
