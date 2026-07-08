import { useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { featuredProjects } from '../data/projects';
import ProjectCard from './ProjectCard';

const gridContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};
const gridItem = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

export default function ProjectsTeaser() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' });

  return (
    <section id="projetos" className="py-32 px-6 md:px-12 max-w-7xl mx-auto">
      <motion.div
        ref={sectionRef}
        variants={gridContainer}
        initial="hidden"
        animate={isInView ? 'show' : 'hidden'}
      >
        <motion.div variants={gridItem} className="mb-16 md:mb-20 md:flex justify-between items-end gap-8">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 font-display italic">Cases em Destaque</h2>
            <p className="text-zinc-500 text-lg md:text-xl font-light">
              Soluções que combinam <span className="text-black dark:text-white font-medium">eficiência, IA e design</span> para escalar negócios.
            </p>
          </div>
          <Link
            to="/projetos"
            className="hidden md:inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 hover:text-black dark:hover:text-white transition-colors shrink-0 group"
          >
            Ver todos os projetos
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </Link>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {featuredProjects.map((project) => (
            <motion.div key={project.id} variants={gridItem}>
              <ProjectCard project={project} />
            </motion.div>
          ))}
        </div>

        <motion.div variants={gridItem} className="mt-14 text-center md:hidden">
          <Link
            to="/projetos"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-zinc-200 dark:border-zinc-700 text-xs font-bold uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-300 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-all"
          >
            Ver todos os projetos
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
