import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { Project } from '../data/projects';
import ProjectShotImage from './ProjectShotImage';

interface ProjectCardProps {
  project: Project;
  /** The `sizes` attribute of the cover: the width the card takes at each breakpoint (see projectGrid.ts). */
  imageSizes: string;
}

/* Card of a regular project on the /projetos grid. The whole card is one link to the case page. */
export default function ProjectCard({ project, imageSizes }: ProjectCardProps) {
  const titleId = `project-card-${project.slug}`;
  const ctaId = `${titleId}-cta`;

  return (
    <Link
      to={`/projetos/${project.slug}`}
      aria-labelledby={`${titleId} ${ctaId}`}
      className="group block rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-vn-ink"
    >
      <div className="mb-6 aspect-[2.1/1] overflow-hidden rounded-3xl bg-zinc-900 shadow-sm transition-shadow duration-500 group-hover:shadow-2xl group-hover:shadow-black/10 motion-safe:transition-transform motion-safe:group-hover:-translate-y-2">
        <ProjectShotImage
          shot={project.shots[0]}
          sizes={imageSizes}
          className="h-full w-full object-cover object-left-top motion-safe:transition-transform motion-safe:duration-1000 motion-safe:group-hover:scale-105"
        />
      </div>

      <div className="min-w-0 px-1 max-md:pr-14 md:px-2">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-vn-gray-dark">{project.category}</p>
        <h2 id={titleId} className="mb-3 font-display text-xl font-bold italic text-vn-ink md:text-2xl">
          {project.title}
        </h2>
        <p className="mb-4 max-w-md leading-relaxed text-vn-gray-dark">{project.description}</p>
        <ul role="list" className="mb-5 flex list-none flex-wrap gap-2 p-0">
          {project.tags.map((tag) => (
            <li key={tag} className="rounded-full border border-vn-gray-light px-3 py-1 text-xs font-medium text-vn-gray-dark">
              {tag}
            </li>
          ))}
        </ul>
        <span className="inline-flex min-h-11 items-center gap-2 text-sm font-bold uppercase tracking-widest text-vn-ink">
          <span id={ctaId}>Ver detalhes</span>
          <ArrowRight className="size-4 motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:translate-x-1" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
