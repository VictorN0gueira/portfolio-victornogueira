import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUpRight, X, ChevronRight, TrendingUp } from 'lucide-react';
import { projects, Project } from '../data/projects';

export default function Projects() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<'personal' | 'client'>('personal');
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const filteredProjects = projects.filter(p => (p.type || 'personal') === activeTab);

  const closeModal = () => setSelectedProject(null);

  // Lock body scroll + Escape key + focus management
  useEffect(() => {
    if (selectedProject) {
      document.body.style.overflow = 'hidden';
      // Move focus to close button when modal opens
      setTimeout(() => closeButtonRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [selectedProject]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedProject) closeModal();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [selectedProject]);

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
            Soluções personalizadas que combinam <span className="text-black font-medium">eficiência, IA e design</span> de ponta para escalar negócios.
          </p>
        </div>
      </motion.div>

      {/* Tab Selector */}
      <div className="flex flex-wrap justify-center gap-6 md:gap-8 mb-16 md:mb-24 px-4" role="tablist" aria-label="Filtros de projetos">
        <button
          onClick={() => setActiveTab('personal')}
          role="tab"
          aria-selected={activeTab === 'personal'}
          className={`relative px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 ${activeTab === 'personal' ? 'text-black' : 'text-zinc-400 hover:text-zinc-600'}`}
        >
          <span className="relative z-10 whitespace-nowrap">01. Produtos Próprios</span>
          {activeTab === 'personal' && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab('client')}
          role="tab"
          aria-selected={activeTab === 'client'}
          className={`relative px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 ${activeTab === 'client' ? 'text-black' : 'text-zinc-400 hover:text-zinc-600'}`}
        >
          <span className="relative z-10 whitespace-nowrap">02. Cases de Clientes</span>
          {activeTab === 'client' && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
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
              style={{ willChange: 'transform, opacity' }}
              className="group cursor-pointer"
              onClick={() => setSelectedProject(project)}
            >
              <div className="aspect-video md:aspect-[16/10] rounded-3xl md:rounded-4xl mb-6 md:mb-8 overflow-hidden relative shadow-sm transition-all duration-500 hover:shadow-2xl hover:shadow-black/10 hover:-translate-y-2 bg-zinc-900">
                <img
                  src={project.image}
                  alt={`Screenshot do projeto ${project.title}`}
                  className="relative z-10 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors duration-700 z-20" />
                {project.type === 'client' && (
                  <div className="absolute top-4 md:top-6 right-4 md:right-6 px-3 py-1 bg-black/90 md:bg-black/80 backdrop-blur-none md:backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-xl border border-white/10 z-30">
                    Case de Cliente
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent z-20 pointer-events-none" />
                <div className="absolute top-4 md:top-6 left-4 md:left-6 flex flex-wrap gap-2 z-30">
                  {project.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="px-3 py-1 bg-white/95 md:bg-white/90 backdrop-blur-none md:backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm text-black opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      {tag}
                    </span>
                  ))}
                </div>
                {/* Ver Projeto — visível por padrão em touch, hover no desktop */}
                <div className="absolute inset-0 flex items-center justify-center z-30
                                opacity-100 md:opacity-0 md:group-hover:opacity-100
                                transition-opacity duration-500">
                  <div className="bg-white text-black px-5 md:px-6 py-2.5 md:py-3 rounded-full font-bold uppercase tracking-widest text-[10px] shadow-2xl
                                  translate-y-0 md:translate-y-4 md:group-hover:translate-y-0
                                  transition-transform duration-500
                                  md:bg-white md:opacity-100">
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
                  <h3 className="text-xl md:text-2xl font-bold mb-3 font-display transition-colors group-hover:text-zinc-600">{project.title}</h3>
                  <p className="text-zinc-500 font-light leading-relaxed max-w-sm line-clamp-2">{project.description}</p>
                </div>
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border border-zinc-200 flex items-center justify-center shrink-0 group-hover:bg-black group-hover:text-white group-hover:border-black transition-all duration-500 transform group-hover:rotate-45">
                  <ArrowUpRight className="w-5 h-5 md:w-6 md:h-6" />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {selectedProject && (
          <div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-start p-4 md:p-8 overflow-y-auto custom-scrollbar"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="fixed inset-0 bg-black/98 md:bg-black/90 backdrop-blur-none md:backdrop-blur-2xl"
              aria-hidden="true"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{ willChange: 'transform, opacity' }}
              className="relative w-full h-auto min-h-full md:min-h-0 md:max-w-6xl bg-zinc-950 md:bg-zinc-900 md:rounded-[2.5rem] overflow-hidden flex flex-col md:flex-row shadow-2xl md:border border-white/10 md:mt-[5vh] md:mb-[5vh] shrink-0"
            >
              <button
                ref={closeButtonRef}
                onClick={closeModal}
                aria-label="Fechar modal"
                className="absolute top-4 right-4 md:top-6 md:right-6 z-50 w-11 h-11 md:w-12 md:h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all backdrop-blur-none md:backdrop-blur-md border border-white/10"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>

              {/* Gallery */}
              <div className="w-full md:w-[60%] shrink-0 bg-zinc-950 relative flex flex-col overflow-hidden border-b md:border-b-0 md:border-r border-white/5">
                <div
                  className="absolute inset-0 bg-cover bg-center blur-2xl opacity-20 transform scale-110 pointer-events-none will-change-transform"
                  style={{ backgroundImage: `url(${selectedProject.image})` }}
                />
                <div className="relative z-10 flex md:flex-col overflow-x-auto md:overflow-y-auto snap-x snap-mandatory scrollbar-hide p-4 md:p-6 space-x-4 md:space-x-0 md:space-y-6 md:h-full">
                  {[selectedProject.image, ...(selectedProject.gallery || [])].map((img, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="w-[85vw] md:w-full shrink-0 snap-center flex items-center justify-center"
                    >
                      <img
                        src={img}
                        alt={i === 0 ? `${selectedProject.title} — imagem principal` : `${selectedProject.title} — imagem ${i + 1}`}
                        className="w-full h-full object-contain rounded-2xl shadow-2xl"
                        referrerPolicy="no-referrer"
                      />
                    </motion.div>
                  ))}
                </div>
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/90 backdrop-blur-none px-5 py-2.5 rounded-full border border-white/10 md:hidden pointer-events-none shadow-2xl z-50" aria-hidden="true">
                  <motion.div animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                    <ChevronRight className="w-3 h-3 text-white" />
                  </motion.div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white whitespace-nowrap">Deslize para ver mais</span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 p-6 pb-12 md:p-16 flex flex-col bg-zinc-950 md:bg-zinc-900">
                <div className="mb-8 md:mb-12">
                  {selectedProject.type === 'client' && (
                    <span className="inline-block px-3 py-1 bg-white/10 text-white/50 text-[9px] font-black uppercase tracking-[0.2em] rounded-full border border-white/10 mb-6">
                      Projeto p/ Cliente
                    </span>
                  )}
                  <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-[10px] mb-3 md:mb-4">{selectedProject.category}</p>
                  <h3 id="modal-title" className="text-2xl md:text-5xl font-bold text-white mb-4 md:mb-6 font-display italic tracking-tight">{selectedProject.title}</h3>
                  <div className="w-12 h-1 bg-white/20 mb-6 rounded-full" />
                  <p className="text-zinc-400 text-sm md:text-xl font-light leading-relaxed mb-6 md:mb-8">
                    {selectedProject.description}
                  </p>

                  <div className="space-y-6 md:space-y-10">
                    {selectedProject.impact && selectedProject.impact.length > 0 && (
                      <div>
                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-[9px] md:text-[10px] mb-4">Resultados</p>
                        <div className="flex flex-wrap gap-3">
                          {selectedProject.impact.map((m) => (
                            <div key={m.label} className="px-4 py-3 bg-white/5 rounded-2xl border border-white/10">
                              <p className="text-[9px] uppercase tracking-widest text-zinc-500 mb-1">{m.label}</p>
                              <p className="text-white font-bold text-sm">{m.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-zinc-500 font-bold uppercase tracking-widest text-[9px] md:text-[10px] mb-4">Tecnologias principais</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedProject.tags.map((tag) => (
                          <span key={tag} className="px-3 md:px-5 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] md:text-xs text-zinc-300 font-medium hover:bg-white/10 transition-colors">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {selectedProject.link === '#' ? (
                      <span className="inline-flex items-center justify-center gap-3 px-8 md:px-10 py-4 md:py-5 rounded-full font-bold uppercase tracking-widest text-[10px] md:text-xs bg-zinc-800 text-zinc-500 cursor-default opacity-60">
                        Acesso Restrito
                      </span>
                    ) : (
                      <a
                        href={selectedProject.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-3 px-8 md:px-10 py-4 md:py-5 rounded-full font-bold uppercase tracking-widest text-[10px] md:text-xs bg-white text-black hover:bg-zinc-200 shadow-xl shadow-white/5 active:scale-95 transition-all"
                      >
                        Acessar Projeto
                        <ArrowUpRight className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
