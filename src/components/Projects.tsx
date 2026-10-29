import { motion } from 'motion/react';
import { projects } from '../data/projects';
import FeaturedProjectCard from './FeaturedProjectCard';
import ProjectCard from './ProjectCard';

const featuredProjects = projects.filter((project) => project.featured);
const regularProjects = projects.filter((project) => !project.featured);

const GRID_COLUMNS = 3;
const LAST_ROW_PAIR = 2;

/* On the three column grid a last row of two cards would leave a hole: those two take half of the width each. */
function columnSpan(index: number, total: number): string {
  const isInLastPair = total % GRID_COLUMNS === LAST_ROW_PAIR && index >= total - LAST_ROW_PAIR;
  return isInLastPair ? 'lg:col-span-3' : 'lg:col-span-2';
}

export default function Projects() {
  return (
    <section id="projetos" aria-labelledby="projetos-titulo" className="py-24 md:py-32 px-4 sm:px-6 md:px-12 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="mb-12 md:mb-20"
      >
        <div className="max-w-2xl">
          <h1 id="projetos-titulo" className="text-4xl md:text-6xl font-bold tracking-tight mb-6 font-display italic">Projetos</h1>
          <p className="text-zinc-500 text-lg md:text-xl font-light">
            Sistemas que a gente construiu, do <span className="text-black dark:text-white font-medium">atendimento no WhatsApp</span> aos dashboards de vendas. Cada um com as telas e o que faz.
          </p>
        </div>
      </motion.div>

      <ul className="grid gap-6 md:gap-10 mb-16 md:mb-24 list-none p-0">
        {featuredProjects.map((project, index) => (
          <li key={project.slug}>
            <FeaturedProjectCard project={project} priority={index === 0} />
          </li>
        ))}
      </ul>

      <ul className="grid md:grid-cols-2 lg:grid-cols-6 gap-x-6 md:gap-x-8 lg:gap-x-10 gap-y-12 md:gap-y-16 list-none p-0">
        {regularProjects.map((project, index) => (
          <li key={project.slug} className={columnSpan(index, regularProjects.length)}>
            <ProjectCard project={project} />
          </li>
        ))}
      </ul>
    </section>
  );
}
