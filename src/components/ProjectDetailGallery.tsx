import type { CSSProperties } from 'react';
import type { Project, ProjectShot } from '../data/projects';
import { BrowserShot } from '../sections/projects/BrowserShot';
import { galleryLabel } from './projectLabels';

// Widths measured on the layout: the gallery is the 7fr column of the body (5fr for the facts, a 64px gap) inside 48px
// gutters and a 1216px page, so it is 616px wide from a 1216px window and about 51vw between lg and there. Under lg it is
// one column: the window minus the gutters (96px from md, 32px under it). The large gallery of a featured project puts
// the two small shots side by side under the cover, with a gap of 24px from md and 16px under it: 296px each at 616px,
// about 24vw between lg and 1216px, half of the column below lg.
const COLUMN_SIZES =
  '(min-width: 1216px) 616px, (min-width: 1024px) 51vw, (min-width: 768px) calc(100vw - 96px), calc(100vw - 32px)';
const PAIR_SIZES =
  '(min-width: 1216px) 296px, (min-width: 1024px) 24vw, (min-width: 768px) calc((100vw - 120px) / 2), (min-width: 640px) calc((100vw - 48px) / 2), calc(100vw - 32px)';

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
        <Shot key={shot.image.src} shot={shot} slug={project.slug} index={index} sizes={COLUMN_SIZES} />
      ))}
    </div>
  );
}

/* The gallery of a featured project: the cover large on top, the two other shots side by side under it. */
function HeroGallery({ project }: { project: Project }) {
  const [cover, ...rest] = project.shots;

  return (
    <div role="group" aria-label={galleryLabel(project.title)} className="grid min-w-0 gap-4 md:gap-6">
      <Shot shot={cover} slug={project.slug} index={0} sizes={COLUMN_SIZES} />
      <div data-gallery-pair="" className="grid items-start gap-4 sm:grid-cols-2 md:gap-6">
        {rest.map((shot, index) => (
          <Shot key={shot.image.src} shot={shot} slug={project.slug} index={index + 1} sizes={PAIR_SIZES} />
        ))}
      </div>
    </div>
  );
}

/** The three screenshots of a case, in the layout of its kind: large cover and two shots, or three stacked. */
export function ProjectGallery({ project }: { project: Project }) {
  return project.featured ? <HeroGallery project={project} /> : <StackedGallery project={project} />;
}
