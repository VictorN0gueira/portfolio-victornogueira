import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { Project, ProjectShot } from '../data/projects';

// The cover takes a bit more than half of the 1280px page on desktop, the full window width on a phone.
const COVER_SIZES = '(min-width: 1280px) 720px, (min-width: 1024px) 56vw, 92vw';
// The two small shots are a third of the media column on desktop and about 40% of the window on a phone.
const STRIP_SIZES = '(min-width: 1280px) 260px, (min-width: 1024px) 22vw, 40vw';

interface FeaturedProjectCardProps {
  project: Project;
  /** The first card of the page loads its cover right away; the others wait for the scroll. */
  priority?: boolean;
}

function ShotImage({ shot, sizes, eager }: { shot: ProjectShot; sizes: string; eager?: boolean }) {
  const { image, alt } = shot;

  return (
    <img
      src={image.src}
      srcSet={image.srcSet}
      sizes={sizes}
      width={image.width}
      height={image.height}
      alt={alt}
      className="block w-full h-auto"
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
      decoding="async"
    />
  );
}

/* Large card of a featured project (DizPara, Hub081) on /projetos: the cover, the other two shots as an offset strip
   over its lower edge, and the text on the side. The whole card is one link to the case page. */
export default function FeaturedProjectCard({ project, priority = false }: FeaturedProjectCardProps) {
  const [cover, ...strip] = project.shots;
  const titleId = `featured-project-${project.slug}`;

  return (
    <Link
      to={`/projetos/${project.slug}`}
      aria-labelledby={titleId}
      className="group grid lg:grid-cols-[1.35fr_1fr] gap-8 lg:gap-12 p-4 md:p-6 lg:p-8 rounded-3xl md:rounded-[2.5rem] bg-zinc-950 text-white border border-white/10 shadow-2xl shadow-black/10 transition-transform duration-500 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-vn-ink dark:focus-visible:outline-white"
    >
      <div className="min-w-0">
        <div className="overflow-hidden rounded-2xl md:rounded-3xl bg-zinc-900 ring-1 ring-white/10">
          <ShotImage shot={cover} sizes={COVER_SIZES} eager={priority} />
        </div>
        <div className="relative -mt-6 md:-mt-10 ml-auto flex w-[88%] justify-end pr-2 md:pr-4">
          {strip.map((shot, index) => (
            <div
              key={shot.image.src}
              className={`w-[48%] overflow-hidden rounded-xl md:rounded-2xl bg-zinc-900 ring-2 ring-zinc-950 shadow-xl shadow-black/40 transition-transform duration-500 group-hover:-translate-y-1 ${index > 0 ? '-ml-[6%] translate-y-3' : ''}`}
            >
              <ShotImage shot={shot} sizes={STRIP_SIZES} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-col justify-center pb-4 pt-6 md:pt-8 lg:py-6 lg:pr-4">
        <p className="mb-3 text-[10px] md:text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">{project.category}</p>
        <h3 id={titleId} className="mb-4 font-display text-4xl font-bold italic tracking-tight md:text-6xl">
          {project.title}
        </h3>
        <p className="mb-4 text-lg font-medium leading-snug text-white md:text-2xl">{project.highlight}</p>
        <p className="mb-8 max-w-md text-sm font-light leading-relaxed text-zinc-400 md:text-base">{project.description}</p>
        <div className="mb-8 flex flex-wrap gap-2" aria-hidden="true">
          {project.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-medium text-zinc-300 md:text-xs">
              {tag}
            </span>
          ))}
        </div>
        <span className="inline-flex min-h-11 items-center gap-3 self-start rounded-full bg-white px-6 py-3 text-xs font-bold uppercase tracking-widest text-black transition-colors group-hover:bg-zinc-200">
          Ver detalhes
          <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
