import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import type { Project, ProjectShot } from '../data/projects';
import { coverOf } from '../data/projects';

// The width a gallery image takes: 60% of the 1152px case on desktop, 85vw in the phone carousel.
const STACK_SIZES = '(min-width: 1152px) 640px, (min-width: 768px) 55vw, 85vw';
// The large gallery of a featured project: the cover spans the case, the two other shots share a row.
const HERO_COVER_SIZES = '(min-width: 1152px) 1100px, 92vw';
const HERO_THUMB_SIZES = '(min-width: 1152px) 540px, (min-width: 640px) 46vw, 92vw';

const LANDSCAPE_CLASSES = 'w-full h-auto object-contain rounded-2xl shadow-2xl';
// A phone screenshot is tall: it keeps its proportions and stops at a height, centered, instead of filling the width.
const PORTRAIT_CLASSES = 'h-auto w-auto max-h-[32rem] max-w-full object-contain mx-auto rounded-2xl shadow-2xl';

interface ShotFigureProps {
  shot: ProjectShot;
  index: number;
  sizes: string;
  className?: string;
}

function ShotFigure({ shot, index, sizes, className }: ShotFigureProps) {
  const { image, alt } = shot;
  const isPortrait = image.height > image.width;

  return (
    <img
      src={image.src}
      srcSet={image.srcSet}
      sizes={sizes}
      width={image.width}
      height={image.height}
      alt={alt}
      className={className ?? (isPortrait ? PORTRAIT_CLASSES : LANDSCAPE_CLASSES)}
      loading={index === 0 ? 'eager' : 'lazy'}
      fetchPriority={index === 0 ? 'high' : 'auto'}
      decoding="async"
    />
  );
}

/* The gallery of a regular project: the shots one under the other on desktop, a swipe carousel on a phone. */
export function StackedGallery({ project }: { project: Project }) {
  const { shots } = project;

  return (
    <div className="w-full md:w-[60%] shrink-0 bg-zinc-950 relative flex flex-col border-b md:border-b-0 md:border-r border-white/5 min-h-[50vw] md:min-h-[480px]">
      <div
        className="absolute inset-0 bg-cover bg-center blur-2xl opacity-20 scale-110 pointer-events-none"
        style={{ backgroundImage: `url(${coverOf(project).thumbSrc})` }}
      />
      <div
        tabIndex={0}
        role="group"
        aria-label={`Telas de ${project.title}`}
        className="relative z-10 flex md:flex-col overflow-x-auto md:overflow-visible snap-x snap-mandatory scrollbar-hide p-4 md:p-6 gap-4 md:gap-6 h-full focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white"
      >
        {shots.map((shot, index) => (
          <div key={shot.image.src} className="w-[85vw] md:w-full shrink-0 snap-center flex items-center justify-center">
            <ShotFigure shot={shot} index={index} sizes={STACK_SIZES} />
          </div>
        ))}
      </div>
      {shots.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/90 px-4 py-2 rounded-full border border-white/10 md:hidden pointer-events-none z-50" aria-hidden="true">
          <motion.div animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
            <ChevronRight className="w-3 h-3 text-white" />
          </motion.div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white whitespace-nowrap">Deslize para ver mais</span>
        </div>
      )}
    </div>
  );
}

/* The gallery of a featured project: the cover large on top, the two other shots side by side under it. */
export function HeroGallery({ project }: { project: Project }) {
  const [cover, ...rest] = project.shots;

  return (
    <div className="relative border-b border-white/5 bg-zinc-950 p-4 md:p-8 lg:p-10">
      <div
        className="absolute inset-0 bg-cover bg-center blur-3xl opacity-20 scale-110 pointer-events-none"
        style={{ backgroundImage: `url(${coverOf(project).thumbSrc})` }}
      />
      <div className="relative z-10 grid gap-4 md:gap-6">
        <ShotFigure
          shot={cover}
          index={0}
          sizes={HERO_COVER_SIZES}
          className="w-full h-auto rounded-2xl md:rounded-3xl shadow-2xl ring-1 ring-white/10"
        />
        <div className="grid gap-4 md:gap-6 sm:grid-cols-2">
          {rest.map((shot, index) => (
            <ShotFigure
              key={shot.image.src}
              shot={shot}
              index={index + 1}
              sizes={HERO_THUMB_SIZES}
              className="w-full h-auto rounded-xl md:rounded-2xl shadow-xl ring-1 ring-white/10"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
