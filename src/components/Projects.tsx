import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUpRight, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { projects, Project } from '../data/projects';

export default function Projects() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<'personal' | 'client'>('personal');
  
  const filteredProjects = projects.filter(p => (p.type || 'personal') === activeTab);
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (selectedProject) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup function
    return () => {
      document.body.style.overflow = 'unset';
    };
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
          <h3 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 font-display italic">Cases de Sucesso</h3>
          <p className="text-zinc-500 text-lg md:text-xl font-light">
            Soluções personalizadas que combinam <span className="text-black font-medium">eficiência, IA e design</span> de ponta para escalar negócios.
          </p>
        </div>
      </motion.div>

      {/* Tab Selector */}
      <div className="flex flex-wrap justify-center gap-6 md:gap-8 mb-16 md:mb-24 px-4">
        <button 
          onClick={() => setActiveTab('personal')}
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

      <motion.div 
        layout
        className="grid md:grid-cols-2 gap-12 lg:gap-20"
      >
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
            <div className="aspect-16/10 rounded-4xl mb-8 overflow-hidden relative shadow-sm transition-all duration-500 hover:shadow-2xl hover:shadow-black/10 hover:-translate-y-2 flex items-center justify-center bg-black">
              {/* Blurred Background Layer (Optimized Premium Effect) */}
              <div 
                className="absolute inset-0 bg-cover bg-center blur-xl opacity-40 transform scale-110 will-change-transform"
                style={{ backgroundImage: `url(${project.image})` }}
              />
              
              <img 
                src={project.image} 
                alt={project.title}
                className="relative z-10 w-full h-full object-contain transition-transform duration-1000 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              
              <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors duration-700 z-20" />
              {project.type === 'client' && (
                <div className="absolute top-6 right-6 px-3 py-1 bg-black/80 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-xl border border-white/10 z-30">
                  Case de Cliente
                </div>
              )}

              {/* Gradient for Text Legibility */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent z-20 pointer-events-none" />

              {/* Floating Tags */}
              <div className="absolute top-6 left-6 flex flex-wrap gap-2 z-30">
                {project.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-white/90 backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm text-black opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    {tag}
                  </span>
                ))}
              </div>

              {/* View Case Indicator */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="bg-white text-black px-6 py-3 rounded-full font-bold uppercase tracking-widest text-[10px] shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                  Ver Projeto
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-start px-2">
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">{project.category}</p>
                <h4 className="text-2xl font-bold mb-3 font-display transition-colors group-hover:text-zinc-600">{project.title}</h4>
                <p className="text-zinc-500 font-light leading-relaxed max-w-sm line-clamp-2">{project.description}</p>
              </div>
              <div className="w-14 h-14 rounded-full border border-zinc-200 flex items-center justify-center group-hover:bg-black group-hover:text-white group-hover:border-black transition-all duration-500 transform group-hover:rotate-45">
                <ArrowUpRight className="w-6 h-6" />
              </div>
            </div>
          </motion.div>
        ))}
        </AnimatePresence>
      </motion.div>

      {/* Project Detail Modal */}
      <AnimatePresence>
        {selectedProject && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-0 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProject(null)}
              className="absolute inset-0 bg-black/98 backdrop-blur-2xl"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{ willChange: 'transform, opacity' }}
              className="relative w-full h-full md:h-auto md:max-w-6xl md:max-h-[85vh] bg-zinc-950 md:bg-zinc-900 md:rounded-[2.5rem] overflow-hidden flex flex-col md:flex-row shadow-2xl md:border border-white/10"
            >
              <button 
                onClick={() => setSelectedProject(null)}
                className="absolute top-6 right-6 z-50 w-10 h-10 md:w-12 md:h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all backdrop-blur-md border border-white/10"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>

              {/* Gallery Side */}
              <div className="w-full md:w-[60%] h-[45vh] md:h-auto bg-zinc-950 relative flex flex-col overflow-hidden shrink-0 border-b md:border-b-0 md:border-r border-white/5">
                {/* Dynamic Background Blur for Modal (Optimized) */}
                <div 
                  className="absolute inset-0 bg-cover bg-center blur-2xl opacity-20 transform scale-110 pointer-events-none will-change-transform"
                  style={{ backgroundImage: `url(${selectedProject.image})` }}
                />
                
                <div className="relative z-10 flex md:flex-col overflow-x-auto md:overflow-y-auto snap-x snap-mandatory scrollbar-hide p-4 md:p-6 space-x-4 md:space-x-0 md:space-y-6 h-full">
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
                        alt={`${selectedProject.title} ${i}`} 
                        className="w-full h-full object-contain rounded-2xl shadow-2xl"
                        referrerPolicy="no-referrer"
                      />
                    </motion.div>
                  ))}
                </div>
                
                {/* Mobile swipe indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-xl px-5 py-2.5 rounded-full border border-white/10 md:hidden pointer-events-none shadow-2xl z-50">
                  <motion.div 
                    animate={{ x: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <ChevronRight className="w-3 h-3 text-white" />
                  </motion.div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white whitespace-nowrap">Deslize para ver mais</span>
                </div>
              </div>

              {/* Content Side */}
              <div className="flex-1 p-8 md:p-16 flex flex-col overflow-y-auto bg-zinc-950 md:bg-zinc-900 custom-scrollbar">
                <div className="mb-8 md:mb-12">
                  {selectedProject.type === 'client' && (
                    <span className="inline-block px-3 py-1 bg-white/10 text-white/50 text-[9px] font-black uppercase tracking-[0.2em] rounded-full border border-white/10 mb-6">
                      Projeto p/ Cliente
                    </span>
                  )}
                  <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-[10px] mb-3 md:mb-4">{selectedProject.category}</p>
                  <h3 className="text-3xl md:text-5xl font-bold text-white mb-4 md:mb-6 font-display italic tracking-tight">{selectedProject.title}</h3>
                  <div className="w-12 h-1 bg-white/20 mb-6 rounded-full" />
                  <p className="text-zinc-400 text-base md:text-xl font-light leading-relaxed mb-6 md:mb-8">
                    {selectedProject.description}
                  </p>

                  <div className="space-y-8 md:space-y-10">
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

                      <a 
                        href={selectedProject.link === '#' ? undefined : selectedProject.link}
                        target={selectedProject.link === '#' ? undefined : "_blank"}
                        rel={selectedProject.link === '#' ? undefined : "noopener noreferrer"}
                        className={`inline-flex items-center justify-center gap-3 px-10 py-5 rounded-full font-bold uppercase tracking-widest text-[10px] md:text-xs transition-all ${
                          selectedProject.link === '#' 
                          ? 'bg-zinc-800 text-zinc-400 cursor-default opacity-50' 
                          : 'bg-white text-black hover:bg-zinc-200 shadow-xl shadow-white/5 active:scale-95'
                        }`}
                      >
                        {selectedProject.link === '#' ? 'Acesso Restrito' : 'Acessar Projeto'} 
                        {selectedProject.link !== '#' && <ArrowUpRight className="w-4 h-4" />}
                      </a>
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
