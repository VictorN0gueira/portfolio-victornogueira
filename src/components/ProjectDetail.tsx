import { motion } from 'motion/react';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
import { Project } from '../data/projects';

interface ProjectDetailProps {
  project: Project;
}

/* Conteúdo do case como seção de página — layout herdado do antigo ProjectModal,
   agora renderizado no fluxo normal (visível para SEO, deep-linkável) */
export default function ProjectDetail({ project }: ProjectDetailProps) {
  const images = [project.image, ...(project.gallery || [])];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="relative w-full max-w-6xl mx-auto bg-zinc-950 md:bg-zinc-900 rounded-3xl md:rounded-[2.5rem] flex flex-col md:flex-row shadow-2xl border border-white/10 overflow-hidden"
    >
      {/* Galeria de imagens */}
      <div className="w-full md:w-[60%] shrink-0 bg-zinc-950 relative flex flex-col border-b md:border-b-0 md:border-r border-white/5 min-h-[50vw] md:min-h-[480px]">
        <div
          className="absolute inset-0 bg-cover bg-center blur-2xl opacity-20 scale-110 pointer-events-none"
          style={{ backgroundImage: `url(${project.image})` }}
        />
        <div className="relative z-10 flex md:flex-col overflow-x-auto md:overflow-visible snap-x snap-mandatory scrollbar-hide p-4 md:p-6 gap-4 md:gap-6 h-full">
          {images.map((img, i) => (
            <div
              key={i}
              className="w-[85vw] md:w-full shrink-0 snap-center flex items-center justify-center"
            >
              <img
                src={img}
                alt={i === 0 ? `${project.title} — imagem principal` : `${project.title} — imagem ${i + 1}`}
                className="w-full object-contain rounded-2xl shadow-2xl"
                referrerPolicy="no-referrer"
                loading={i === 0 ? 'eager' : 'lazy'}
              />
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/90 px-4 py-2 rounded-full border border-white/10 md:hidden pointer-events-none z-50" aria-hidden="true">
            <motion.div animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
              <ChevronRight className="w-3 h-3 text-white" />
            </motion.div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white whitespace-nowrap">Deslize para ver mais</span>
          </div>
        )}
      </div>

      {/* Conteúdo textual */}
      <div className="flex-1 p-6 pb-10 md:p-16 flex flex-col bg-zinc-950 md:bg-zinc-900">
        {project.type === 'client' && (
          <span className="inline-block self-start px-3 py-1 bg-white/10 text-white/50 text-[9px] font-black uppercase tracking-[0.2em] rounded-full border border-white/10 mb-5">
            Projeto p/ Cliente
          </span>
        )}
        <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-[10px] mb-2">{project.category}</p>
        <h1 className="text-2xl md:text-5xl font-bold text-white mb-4 md:mb-6 font-display italic tracking-tight">{project.title}</h1>
        <div className="w-12 h-1 bg-white/20 mb-5 rounded-full" />
        <p className="text-zinc-400 text-sm md:text-xl font-light leading-relaxed mb-8">{project.description}</p>

        <div className="space-y-6 md:space-y-8">
          {project.impact && project.impact.length > 0 && (
            <div>
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-3">Resultados</p>
              <div className="flex flex-wrap gap-3">
                {project.impact.map((m) => (
                  <div key={m.label} className="px-4 py-3 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[9px] uppercase tracking-widest text-zinc-500 mb-1">{m.label}</p>
                    <p className="text-white font-bold text-sm">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-3">Tecnologias principais</p>
            <div className="flex flex-wrap gap-2">
              {project.tags.map((tag) => (
                <span key={tag} className="px-3 md:px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] md:text-xs text-zinc-300 font-medium hover:bg-white/10 transition-colors">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {project.link === '#' ? (
            <span className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs bg-zinc-800 text-zinc-500 cursor-default opacity-60">
              Acesso Restrito
            </span>
          ) : (
            <a
              href={project.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 px-8 md:px-10 py-4 md:py-5 rounded-full font-bold uppercase tracking-widest text-xs bg-white text-black hover:bg-zinc-200 shadow-xl active:scale-95 transition-all"
            >
              Acessar Projeto
              <ArrowUpRight className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}
