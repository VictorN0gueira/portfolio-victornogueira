import { motion } from 'motion/react';
import type { Project } from '../data/projects';
import { HeroGallery, StackedGallery } from './ProjectDetailGallery';
import { FEATURES_LABEL, TAGS_LABEL } from './projectLabels';
import ProjectTitle from './ProjectTitle';

interface ProjectDetailProps {
  project: Project;
}

// The floating WhatsApp and accessibility buttons sit at the right edge of a phone: the text stays clear of them
// (36 px under 360 px so the column stays wide enough, 56 px up to the tablet layout, none from md up).
export const CLEAR_FLOATING_BUTTONS = 'pr-9 min-[360px]:pr-14 md:pr-0';
const LABEL_CLASSES = `mb-3 text-xs font-bold uppercase tracking-widest text-zinc-400 ${CLEAR_FLOATING_BUTTONS}`;

function Features({ items }: { items: readonly string[] }) {
  return (
    <section aria-labelledby="projeto-faz">
      <h2 id="projeto-faz" className={LABEL_CLASSES}>
        {FEATURES_LABEL}
      </h2>
      <ul role="list" className={`m-0 list-none space-y-3 p-0 ${CLEAR_FLOATING_BUTTONS}`}>
        {items.map((item) => (
          <li key={item} className="flex gap-3 leading-relaxed text-zinc-300 md:text-base">
            <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-white/40" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Tags({ tags }: { tags: readonly string[] }) {
  return (
    <section aria-labelledby="projeto-tecnologias">
      <h2 id="projeto-tecnologias" className={LABEL_CLASSES}>
        {TAGS_LABEL}
      </h2>
      <ul role="list" className={`m-0 flex list-none flex-wrap gap-2 p-0 ${CLEAR_FLOATING_BUTTONS}`}>
        {tags.map((tag) => (
          <li key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-300 md:px-4">
            {tag}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Heading({ project, large }: { project: Project; large: boolean }) {
  const size = large ? 'text-4xl md:text-6xl' : 'text-2xl md:text-4xl lg:text-5xl';

  return (
    <div className={`min-w-0 break-words ${CLEAR_FLOATING_BUTTONS}`}>
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">{project.category}</p>
      <h1 className={`${size} mb-4 font-display font-bold italic tracking-tight text-white md:mb-6`}>
        <ProjectTitle title={project.title} />
      </h1>
      <div className="mb-5 h-1 w-12 rounded-full bg-white/20" />
      {project.highlight && <p className="mb-4 text-lg font-medium leading-snug text-white md:text-2xl">{project.highlight}</p>}
      <p className="text-base leading-relaxed text-zinc-300 md:text-xl">{project.description}</p>
    </div>
  );
}

/* Conteúdo do case como seção de página, renderizado no fluxo normal (visível para SEO, deep-linkável).
   Os projetos em destaque (DizPara, Hub081) ganham a galeria grande no topo e a lista do que fazem. */
export default function ProjectDetail({ project }: ProjectDetailProps) {
  const isFeatured = Boolean(project.featured);
  const layout = isFeatured ? 'flex-col' : 'flex-col lg:flex-row';
  const textLayout = isFeatured ? 'grid min-w-0 gap-10 lg:grid-cols-2 lg:gap-16' : 'flex min-w-0 flex-col lg:sticky lg:top-28 lg:self-start';

  return (
    <motion.div
      initial={{ y: 16 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className={`relative mx-auto flex w-full max-w-6xl overflow-clip rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl md:rounded-[2.5rem] md:bg-zinc-900 ${layout}`}
    >
      {isFeatured ? <HeroGallery project={project} /> : <StackedGallery project={project} />}

      <div className="min-w-0 flex-1 bg-zinc-950 p-4 pb-8 min-[360px]:p-6 min-[360px]:pb-10 md:bg-zinc-900 md:p-10 xl:p-16">
        <div className={textLayout}>
          <Heading project={project} large={isFeatured} />
          <div className={`space-y-6 md:space-y-8 ${isFeatured ? '' : 'mt-8'}`}>
            {project.features && <Features items={project.features} />}
            <Tags tags={project.tags} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
