import { motion } from 'motion/react';
import { projects } from '../data/projects';
import FeaturedProjectCard from './FeaturedProjectCard';
import ProjectCard from './ProjectCard';
import { cardLayout } from './projectGrid';
import { PROJECTS_INTRO, PROJECTS_TITLE } from './projectLabels';

const featuredProjects = projects.filter((project) => project.featured);
const regularProjects = projects.filter((project) => !project.featured);


export default function Projects() {
  return (
    <section id="projetos" aria-labelledby="projetos-titulo" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 md:px-12 md:py-32">
      <motion.div
        initial={{ y: 30 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8 }}
        className="mb-12 md:mb-20"
      >
        <div className="max-w-2xl max-md:pr-14">
          <h1 id="projetos-titulo" className="mb-6 font-display text-4xl font-bold italic tracking-tight text-vn-ink md:text-6xl">
            {PROJECTS_TITLE}
          </h1>
          <p className="text-lg text-vn-gray-dark md:text-xl">{PROJECTS_INTRO}</p>
        </div>
      </motion.div>

      <ul role="list" className="mb-16 grid list-none gap-6 p-0 md:mb-24 md:gap-10">
        {featuredProjects.map((project, index) => (
          <li key={project.slug}>
            <FeaturedProjectCard project={project} priority={index === 0} />
          </li>
        ))}
      </ul>

      <ul role="list" className="grid list-none gap-x-6 gap-y-14 p-0 md:grid-cols-2 md:gap-x-8 md:gap-y-16 lg:grid-cols-6 lg:gap-x-10">
        {regularProjects.map((project, index) => {
          const { cellClassName, imageSizes } = cardLayout(index, regularProjects.length);
          return (
            <li key={project.slug} className={cellClassName}>
              <ProjectCard project={project} imageSizes={imageSizes} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
