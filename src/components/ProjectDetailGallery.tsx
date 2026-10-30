import type { CSSProperties } from 'react';
import type { Project, ProjectShot } from '../data/projects';
import { coverOf } from '../data/projects';
import { galleryLabel } from './projectLabels';
import ProjectShotImage from './ProjectShotImage';

// The width a gallery image takes: 60% of the 1152px case on desktop, the window minus the paddings below that.
const STACK_SIZES = '(min-width: 1152px) 640px, (min-width: 768px) 55vw, 92vw';
// The large gallery of a featured project: the cover spans the case, the two other shots share a row.
const HERO_COVER_SIZES = '(min-width: 1152px) 1100px, 92vw';
const HERO_THUMB_SIZES = '(min-width: 1152px) 540px, (min-width: 640px) 46vw, 92vw';

const LANDSCAPE_CLASSES = 'h-auto w-full rounded-2xl shadow-2xl ring-1 ring-white/10';
const PORTRAIT_CLASSES = 'mx-auto h-auto rounded-2xl shadow-2xl ring-1 ring-white/10';
// A phone screenshot is tall: it keeps its proportions and stops at this height instead of filling the width.
const PORTRAIT_MAX_HEIGHT_REM = 32;

/** The size a shot reserves before it loads: its own proportions, and for a tall one a height limit. */
function reservedSize(shot: ProjectShot): CSSProperties {
  const { width, height } = shot.image;
  const style: CSSProperties = { aspectRatio: `${width} / ${height}` };
  if (height <= width) return style;
  return { ...style, width: `min(100%, ${((PORTRAIT_MAX_HEIGHT_REM * width) / height).toFixed(2)}rem)` };
}

function Shot({ shot, index, sizes, className }: { shot: ProjectShot; index: number; sizes: string; className?: string }) {
  const isPortrait = shot.image.height > shot.image.width;
  return (
    <ProjectShotImage
      shot={shot}
      sizes={sizes}
      priority={index === 0}
      className={className ?? (isPortrait ? PORTRAIT_CLASSES : LANDSCAPE_CLASSES)}
      style={reservedSize(shot)}
    />
  );
}

function Backdrop({ project, blur }: { project: Project; blur: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 scale-110 bg-cover bg-center opacity-20 ${blur}`}
      style={{ backgroundImage: `url(${coverOf(project).thumbSrc})` }}
    />
  );
}

/* The gallery of a regular project: the three shots one under the other, beside the text from md up. */
export function StackedGallery({ project }: { project: Project }) {
  return (
    <div
      role="group"
      aria-label={galleryLabel(project.title)}
      className="relative flex w-full shrink-0 flex-col gap-4 border-b border-white/5 bg-zinc-950 p-4 md:w-[60%] md:gap-6 md:border-b-0 md:border-r md:p-6"
    >
      <Backdrop project={project} blur="blur-2xl" />
      {project.shots.map((shot, index) => (
        <div key={shot.image.src} className="relative z-10">
          <Shot shot={shot} index={index} sizes={STACK_SIZES} />
        </div>
      ))}
    </div>
  );
}

/* The gallery of a featured project: the cover large on top, the two other shots side by side under it. */
export function HeroGallery({ project }: { project: Project }) {
  const [cover, ...rest] = project.shots;

  return (
    <div
      role="group"
      aria-label={galleryLabel(project.title)}
      className="relative border-b border-white/5 bg-zinc-950 p-4 md:p-8 lg:p-10"
    >
      <Backdrop project={project} blur="blur-3xl" />
      <div className="relative z-10 grid gap-4 md:gap-6">
        <Shot shot={cover} index={0} sizes={HERO_COVER_SIZES} className="h-auto w-full rounded-2xl shadow-2xl ring-1 ring-white/10 md:rounded-3xl" />
        <div className="grid items-start gap-4 sm:grid-cols-2 md:gap-6">
          {rest.map((shot, index) => (
            <Shot
              key={shot.image.src}
              shot={shot}
              index={index + 1}
              sizes={HERO_THUMB_SIZES}
              className="h-auto w-full rounded-xl shadow-xl ring-1 ring-white/10 md:rounded-2xl"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
