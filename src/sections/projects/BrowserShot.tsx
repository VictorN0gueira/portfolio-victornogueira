import type { CSSProperties } from 'react';
import { ProjectShotImage } from '../../components/ProjectShotImage';
import { WindowFrame } from '../../components/ui/WindowFrame';
import type { ProjectShot } from '../../data/projects';

interface BrowserShotProps {
  shot: ProjectShot;
  /** The slug of the project: it is the title of the frame, in mono, like a file name. No address is made up. */
  slug: string;
  /** The `sizes` attribute of the image: the width it takes at each breakpoint. */
  sizes: string;
  /** The first image of a page loads right away, with high priority. Every other one waits for the scroll. */
  priority?: boolean;
  /** Classes of the frame. */
  className?: string;
  /** Classes of the screenshot. The default shows it whole, at the width of the frame. */
  imageClassName?: string;
  /** Style of the screenshot: the case page reserves its box here, so nothing shifts when it loads. */
  imageStyle?: CSSProperties;
}

/**
 * A project screenshot inside the dark window frame of the brand. The image is the real one, with its srcset, size and
 * alt text (ProjectShotImage); the frame only adds the three dots and the slug in the title bar.
 */
export function BrowserShot({
  shot,
  slug,
  sizes,
  priority = false,
  className,
  imageClassName = 'h-auto w-full',
  imageStyle,
}: BrowserShotProps) {
  return (
    <WindowFrame title={slug} isTitleDecorative className={className}>
      <ProjectShotImage shot={shot} sizes={sizes} priority={priority} className={imageClassName} style={imageStyle} />
    </WindowFrame>
  );
}
