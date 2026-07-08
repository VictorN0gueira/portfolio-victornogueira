import { Link } from 'react-router-dom';
import { ArrowUpRight, TrendingUp } from 'lucide-react';
import { Project } from '../data/projects';

interface ProjectCardProps {
  project: Project;
}

/* Card compartilhado entre a galeria (/projetos) e o teaser da home.
   O pai controla a animação (variants ou layout) — aqui é só apresentação. */
export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link to={`/projetos/${project.slug}`} className="group block cursor-pointer">
      <div className="aspect-video md:aspect-[16/10] rounded-3xl md:rounded-4xl mb-6 md:mb-8 overflow-hidden relative shadow-sm transition-all duration-500 hover:shadow-2xl hover:shadow-black/10 hover:-translate-y-2 bg-zinc-900">
        <img
          src={project.image}
          alt={`Screenshot do projeto ${project.title}`}
          className="relative z-10 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors duration-700 z-20" />
        {project.type === 'client' && (
          <div className="absolute top-4 md:top-6 right-4 md:right-6 px-3 py-1 bg-black/90 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-xl border border-white/10 z-30">
            Case de Cliente
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent z-20 pointer-events-none" />
        <div className="absolute top-4 md:top-6 left-4 md:left-6 flex flex-wrap gap-2 z-30">
          {project.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="px-3 py-1 bg-white/95 text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm text-black opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              {tag}
            </span>
          ))}
        </div>
        <div className="absolute inset-0 flex items-center justify-center z-30 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-500">
          <div className="bg-white text-black px-5 md:px-6 py-2.5 md:py-3 rounded-full font-bold uppercase tracking-widest text-[10px] shadow-2xl translate-y-0 md:translate-y-4 md:group-hover:translate-y-0 transition-transform duration-500">
            Ver Projeto
          </div>
        </div>
      </div>

      <div className="flex justify-between items-start px-1 md:px-2">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{project.category}</p>
            {project.impact?.[0] && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-950 text-white text-[9px] font-bold rounded-full tracking-wide">
                <TrendingUp className="w-2.5 h-2.5 text-emerald-400" />
                {project.impact[0].label}: {project.impact[0].value}
              </span>
            )}
          </div>
          <h3 className="text-xl md:text-2xl font-bold mb-3 font-display transition-colors group-hover:text-zinc-600 dark:group-hover:text-zinc-300">{project.title}</h3>
          <p className="text-zinc-500 font-light leading-relaxed max-w-sm line-clamp-2">{project.description}</p>
        </div>
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 group-hover:bg-black dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black group-hover:border-black dark:group-hover:border-white transition-all duration-500 transform group-hover:rotate-45">
          <ArrowUpRight className="w-5 h-5 md:w-6 md:h-6" />
        </div>
      </div>
    </Link>
  );
}
