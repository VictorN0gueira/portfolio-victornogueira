import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { projects } from '../data/projects';
import ProjectCard from './ProjectCard';

export default function Projects() {
  const [activeTab, setActiveTab] = useState<'personal' | 'client'>('personal');

  const filteredProjects = projects.filter(p => (p.type || 'personal') === activeTab);

  return (
    <section id="projetos" className="py-32 px-6 md:px-12 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="mb-20 md:flex justify-between items-end"
      >
        <div className="max-w-2xl">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 font-display italic">Cases de Sucesso</h2>
          <p className="text-zinc-500 text-lg md:text-xl font-light">
            Soluções personalizadas que combinam <span className="text-black dark:text-white font-medium">eficiência, IA e design</span> de ponta para escalar negócios.
          </p>
        </div>
      </motion.div>

      {/* Tab Selector */}
      <div className="flex flex-wrap justify-center gap-6 md:gap-8 mb-16 md:mb-24 px-4" role="tablist" aria-label="Filtros de projetos">
        <button
          onClick={() => setActiveTab('personal')}
          role="tab"
          aria-selected={activeTab === 'personal'}
          className={`relative px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 ${activeTab === 'personal' ? 'text-black dark:text-white' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
        >
          <span className="relative z-10 whitespace-nowrap">01. Produtos Próprios</span>
          {activeTab === 'personal' && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab('client')}
          role="tab"
          aria-selected={activeTab === 'client'}
          className={`relative px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 ${activeTab === 'client' ? 'text-black dark:text-white' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
        >
          <span className="relative z-10 whitespace-nowrap">02. Cases de Clientes</span>
          {activeTab === 'client' && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
        </button>
      </div>

      <motion.div layout className="grid md:grid-cols-2 gap-6 md:gap-12 lg:gap-20">
        <AnimatePresence mode="popLayout">
          {filteredProjects.map((project, index) => (
            <motion.div
              key={project.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <ProjectCard project={project} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
