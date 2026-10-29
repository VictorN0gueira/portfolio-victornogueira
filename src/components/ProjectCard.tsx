import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { coverOf, type Project } from '../data/projects';

// The width the card image takes: a third of the 1280px page on desktop, half on a tablet, almost the full window on a phone.
const CARD_IMAGE_SIZES = '(min-width: 1280px) 400px, (min-width: 768px) 46vw, 92vw';

interface ProjectCardProps {
  project: Project;
}

/* Card of a regular project, on the /projetos grid.
   O pai controla a animação (variants ou layout), aqui é só apresentação. */
export default function ProjectCard({ project }: ProjectCardProps) {
  const cover = coverOf(project);
  const titleId = `project-card-${project.slug}`;

  return (
    <Link
      to={`/projetos/${project.slug}`}
      aria-labelledby={titleId}
      className="group block cursor-pointer rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-vn-ink dark:focus-visible:outline-white"
    >
      <div className="aspect-video md:aspect-[16/10] rounded-3xl md:rounded-4xl mb-6 md:mb-8 overflow-hidden relative shadow-sm transition-all duration-500 hover:shadow-2xl hover:shadow-black/10 hover:-translate-y-2 bg-zinc-900">
        <img
          src={cover.src}
          srcSet={cover.srcSet}
          sizes={CARD_IMAGE_SIZES}
          width={cover.width}
          height={cover.height}
          alt={project.shots[0].alt}
          className="relative z-10 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors duration-700 z-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent z-20 pointer-events-none" />
        <div className="absolute top-4 md:top-6 left-4 md:left-6 flex flex-wrap gap-2 z-30">
          {project.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="px-3 py-1 bg-white/95 text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm text-black opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-500">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-start gap-4 px-1 md:px-2">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{project.category}</p>
            {project.impact?.[0] && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-950 text-white text-[9px] font-bold rounded-full tracking-wide">
                <TrendingUp className="w-2.5 h-2.5" aria-hidden="true" />
                {project.impact[0].label}: {project.impact[0].value}
              </span>
            )}
          </div>
          <h3 id={titleId} className="text-xl md:text-2xl font-bold mb-3 font-display transition-colors group-hover:text-zinc-600 dark:group-hover:text-zinc-300">{project.title}</h3>
          <p className="text-zinc-500 font-light leading-relaxed max-w-sm line-clamp-3">{project.description}</p>
        </div>
        <div aria-hidden="true" className="w-12 h-12 md:w-14 md:h-14 rounded-full border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 group-hover:bg-black dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black group-hover:border-black dark:group-hover:border-white transition-colors duration-500">
          <ArrowRight className="w-5 h-5 md:w-6 md:h-6 transition-transform duration-500 group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}
