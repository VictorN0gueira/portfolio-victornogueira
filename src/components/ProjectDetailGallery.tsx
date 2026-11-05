import type { CSSProperties } from 'react';
import type { Project, ProjectShot } from '../data/projects';
import { BrowserShot } from '../sections/projects/BrowserShot';
import { galleryLabel } from './projectLabels';

// The width a gallery image takes: the right column of the 1216px page on desktop, the window below that.
const STACK_SIZES = '(min-width: 1280px) 700px, (min-width: 1024px) 56vw, 92vw';
// The large gallery of a featured project: the cover spans the column, the two other shots share a row.
const HERO_COVER_SIZES = '(min-width: 1280px) 700px, (min-width: 1024px) 56vw, 92vw';
const HERO_THUMB_SIZES = '(min-width: 1280px) 340px, (min-width: 1024px) 28vw, (min-width: 640px) 46vw, 92vw';

const LANDSCAPE_CLASSES = 'h-auto w-full';
const PORTRAIT_CLASSES = 'mx-auto h-auto';
// A phone screenshot is tall: it keeps its proportions and stops at this height instead of filling the width.
const PORTRAIT_MAX_HEIGHT_REM = 32;

/** The size a shot reserves before it loads: its own proportions, and for a tall one a height limit. */
function reservedSize(shot: ProjectShot): CSSProperties {
  const { width, height } = shot.image;
  const style: CSSProperties = { aspectRatio: `${width} / ${height}` };
  if (height <= width) return style;
  return { ...style, width: `min(100%, ${((PORTRAIT_MAX_HEIGHT_REM * width) / height).toFixed(2)}rem)` };
}

interface ShotProps {
  shot: ProjectShot;
  slug: string;
  index: number;
  sizes: string;
}

/** One screenshot in its browser frame. The first one of the page loads right away; the others wait for the scroll. */
function Shot({ shot, slug, index, sizes }: ShotProps) {
  const isPortrait = shot.image.height > shot.image.width;
  return (
    <BrowserShot
      shot={shot}
      slug={slug}
      sizes={sizes}
      priority={index === 0}
      imageClassName={isPortrait ? PORTRAIT_CLASSES : LANDSCAPE_CLASSES}
      imageStyle={reservedSize(shot)}
    />
  );
}

/* The gallery of a regular project: the three shots one under the other. */
function StackedGallery({ project }: { project: Project }) {
  return (
    <div role="group" aria-label={galleryLabel(project.title)} className="flex min-w-0 flex-col gap-4 md:gap-6">
      {project.shots.map((shot, index) => (
        <Shot key={shot.image.src} shot={shot} slug={project.slug} index={index} sizes={STACK_SIZES} />
      ))}
    </div>
  );
}

/* The gallery of a featured project: the cover large on top, the two other shots side by side under it. */
function HeroGallery({ project }: { project: Project }) {
  const [cover, ...rest] = project.shots;

  return (
    <div role="group" aria-label={galleryLabel(project.title)} className="grid min-w-0 gap-4 md:gap-6">
      <Shot shot={cover} slug={project.slug} index={0} sizes={HERO_COVER_SIZES} />
      <div data-gallery-pair="" className="grid items-start gap-4 sm:grid-cols-2 md:gap-6">
        {rest.map((shot, index) => (
          <Shot key={shot.image.src} shot={shot} slug={project.slug} index={index + 1} sizes={HERO_THUMB_SIZES} />
        ))}
      </div>
    </div>
  );
}

/** The three screenshots of a case, in the layout of its kind: large cover and two shots, or three stacked. */
export function ProjectGallery({ project }: { project: Project }) {
  return project.featured ? <HeroGallery project={project} /> : <StackedGallery project={project} />;
}
