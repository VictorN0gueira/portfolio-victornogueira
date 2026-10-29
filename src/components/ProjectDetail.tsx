import { motion } from 'motion/react';
import type { Project } from '../data/projects';
import { HeroGallery, StackedGallery } from './ProjectDetailGallery';

interface ProjectDetailProps {
  project: Project;
}

const LABEL_CLASSES = 'text-zinc-400 font-bold uppercase tracking-widest text-[10px] mb-3';

function Impact({ items }: { items: NonNullable<Project['impact']> }) {
  return (
    <div>
      <p className={LABEL_CLASSES}>Resultados</p>
      <div className="flex flex-wrap gap-3">
        {items.map((metric) => (
          <div key={metric.label} className="px-4 py-3 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-1">{metric.label}</p>
            <p className="text-white font-bold text-sm">{metric.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Features({ items }: { items: readonly string[] }) {
  return (
    <div>
      <h2 className={LABEL_CLASSES}>O que faz</h2>
      <ul className="space-y-3 list-none p-0 m-0">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm md:text-base font-light leading-relaxed text-zinc-300">
            <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-white/40" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tags({ tags }: { tags: readonly string[] }) {
  return (
    <div>
      <p className={LABEL_CLASSES}>Tecnologias principais</p>
      <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
        {tags.map((tag) => (
          <li key={tag} className="px-3 md:px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] md:text-xs text-zinc-300 font-medium">
            {tag}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Heading({ project, large }: { project: Project; large: boolean }) {
  const size = large ? 'text-4xl md:text-6xl' : 'text-2xl md:text-5xl';

  return (
    <div>
      <p className="text-zinc-400 font-bold uppercase tracking-[0.3em] text-[10px] mb-2">{project.category}</p>
      <h1 className={`${size} font-bold text-white mb-4 md:mb-6 font-display italic tracking-tight`}>{project.title}</h1>
      <div className="w-12 h-1 bg-white/20 mb-5 rounded-full" />
      {project.highlight && <p className="text-white text-lg md:text-2xl font-medium leading-snug mb-4">{project.highlight}</p>}
      <p className="text-zinc-400 text-sm md:text-xl font-light leading-relaxed">{project.description}</p>
    </div>
  );
}

/* Conteúdo do case como seção de página, renderizado no fluxo normal (visível para SEO, deep-linkável).
   Os projetos em destaque (DizPara, Hub081) ganham a galeria grande no topo e a lista do que fazem. */
export default function ProjectDetail({ project }: ProjectDetailProps) {
  const isFeatured = Boolean(project.featured);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className={`relative w-full max-w-6xl mx-auto bg-zinc-950 md:bg-zinc-900 rounded-3xl md:rounded-[2.5rem] flex shadow-2xl border border-white/10 overflow-hidden ${isFeatured ? 'flex-col' : 'flex-col md:flex-row'}`}
    >
      {isFeatured ? <HeroGallery project={project} /> : <StackedGallery project={project} />}

      <div
        className={`flex-1 p-6 pb-10 md:p-16 bg-zinc-950 md:bg-zinc-900 ${isFeatured ? 'grid gap-10 lg:grid-cols-2 lg:gap-16' : 'flex flex-col'}`}
      >
        <Heading project={project} large={isFeatured} />
        <div className={`space-y-6 md:space-y-8 ${isFeatured ? '' : 'mt-8'}`}>
          {project.features && <Features items={project.features} />}
          {project.impact && project.impact.length > 0 && <Impact items={project.impact} />}
          <Tags tags={project.tags} />
        </div>
      </div>
    </motion.div>
  );
}
