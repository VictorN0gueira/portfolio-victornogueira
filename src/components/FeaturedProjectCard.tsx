import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { Project } from '../data/projects';
import ProjectShotImage from './ProjectShotImage';

// The cover takes a bit more than half of the 1280px page on desktop, the full window width on a phone.
const COVER_SIZES = '(min-width: 1280px) 720px, (min-width: 1024px) 56vw, 92vw';
// The two small shots share the media column: half of it on desktop and a tablet, hidden on a phone.
const STRIP_SIZES = '(min-width: 1280px) 350px, (min-width: 1024px) 28vw, 44vw';

interface FeaturedProjectCardProps {
  project: Project;
  /** The first card of the page loads its cover right away; the others wait for the scroll. */
  priority?: boolean;
}

/* Large card of a featured project (DizPara, Hub081) on /projetos: the text on one side, the cover and the other two
   shots on the other (under the cover, never over it; on a phone the two small ones are left to the case page).
   The text comes first in the markup, so a screen reader meets the name before the long image descriptions. */
export default function FeaturedProjectCard({ project, priority = false }: FeaturedProjectCardProps) {
  const [cover, ...strip] = project.shots;
  const titleId = `featured-project-${project.slug}`;
  const ctaId = `${titleId}-cta`;

  return (
    <Link
      to={`/projetos/${project.slug}`}
      aria-labelledby={`${titleId} ${ctaId}`}
      className="group grid gap-8 rounded-3xl border border-white/10 bg-zinc-950 p-4 text-white shadow-2xl shadow-black/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-vn-ink motion-safe:transition-transform motion-safe:duration-500 motion-safe:hover:-translate-y-1 md:rounded-[2.5rem] md:p-6 lg:grid-cols-[1.35fr_1fr] lg:items-center lg:gap-12 lg:p-8"
    >
      <div className="order-2 flex min-w-0 flex-col justify-center pb-4 max-md:pr-14 lg:order-none lg:col-start-2 lg:row-start-1 lg:py-6 lg:pr-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">{project.category}</p>
        <h2 id={titleId} className="mb-4 font-display text-4xl font-bold italic tracking-tight md:text-6xl">
          {project.title}
        </h2>
        <p className="mb-4 text-lg font-medium leading-snug text-white md:text-2xl">{project.highlight}</p>
        <p className="mb-8 max-w-md leading-relaxed text-zinc-300">{project.description}</p>
        <ul role="list" className="mb-8 flex list-none flex-wrap gap-2 p-0">
          {project.tags.map((tag) => (
            <li key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300">
              {tag}
            </li>
          ))}
        </ul>
        <span className="inline-flex min-h-11 items-center gap-3 self-start rounded-full bg-white px-6 py-3 text-xs font-bold uppercase tracking-widest text-black transition-colors group-hover:bg-zinc-200">
          <span id={ctaId}>Ver detalhes</span>
          <ArrowRight className="size-4 motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:translate-x-1" aria-hidden="true" />
        </span>
      </div>

      <div className="order-1 min-w-0 lg:order-none lg:col-start-1 lg:row-start-1">
        <div className="overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-white/10 md:rounded-3xl">
          <ProjectShotImage shot={cover} sizes={COVER_SIZES} priority={priority} className="h-auto w-full" />
        </div>
        <div className="mt-3 hidden grid-cols-2 gap-3 sm:grid md:mt-4 md:gap-4">
          {strip.map((shot) => (
            <div key={shot.image.src} className="aspect-[2/1] overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-white/10 md:rounded-2xl">
              <ProjectShotImage shot={shot} sizes={STRIP_SIZES} className="h-full w-full object-cover object-left-top" />
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}
