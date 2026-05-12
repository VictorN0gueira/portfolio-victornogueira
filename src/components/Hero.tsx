import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { Github, Linkedin, ArrowUpRight, ChevronDown } from 'lucide-react';
import HeroBackground from './HeroBackground';
import { PaperPlane, Sparkle, RotatingArrow } from './FloatingIcons';
import { isTouchDevice } from '../lib/constants';

export default function Hero() {
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(
    () => ["Automação", "Processos", "IA", "Inovação", "Resultados"],
    []
  );

  const { scrollY } = useScroll();
  const iconY1 = useTransform(scrollY, [0, 600], isTouchDevice ? [0, 0] : [0, -80]);
  const iconY2 = useTransform(scrollY, [0, 600], isTouchDevice ? [0, 0] : [0, -40]);
  const iconY3 = useTransform(scrollY, [0, 600], isTouchDevice ? [0, 0] : [0, -120]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2500);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  return (
    <section className="relative pt-32 pb-32 md:pb-20 px-6 md:px-12 w-full min-h-screen flex flex-col justify-center items-center text-center overflow-hidden">
      <HeroBackground />

      {/* Avião de papel — canto superior direito, oculto em telas muito pequenas */}
      <motion.div style={{ y: iconY1 }} className="absolute top-28 right-[6%] md:right-[12%] z-10 hidden sm:block" aria-hidden="true">
        <PaperPlane className="w-16 h-16 md:w-28 md:h-28 text-zinc-300 opacity-60" />
      </motion.div>

      {/* Asterisco / faísca — canto inferior esquerdo */}
      <motion.div style={{ y: iconY2 }} className="absolute bottom-40 left-[6%] md:left-[10%] z-10 hidden sm:block" aria-hidden="true">
        <Sparkle className="w-8 h-8 md:w-10 md:h-10 text-zinc-400 opacity-40" />
      </motion.div>

      {/* Aro giratório — canto superior esquerdo, apenas desktop */}
      <motion.div style={{ y: iconY3 }} className="absolute top-36 left-[8%] md:left-[14%] z-10 hidden md:block" aria-hidden="true">
        <RotatingArrow className="w-16 h-16 text-zinc-300 opacity-30" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="relative z-10 max-w-4xl flex flex-col items-center"
      >
        <div className="flex items-center gap-3 mb-8 flex-wrap justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="p-1 px-3 rounded-full bg-black/5 border border-black/10 backdrop-blur-sm shadow-sm"
          >
            <span className="text-zinc-500 font-medium tracking-[0.2em] uppercase text-[10px] md:text-xs">
              Soluções em Automação & IA
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="p-1 px-3 rounded-full bg-emerald-50 border border-emerald-200 backdrop-blur-sm shadow-sm"
          >
            <span className="text-emerald-600 font-medium tracking-[0.2em] uppercase text-[10px] md:text-xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Disponível para projetos
            </span>
          </motion.div>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-9xl font-bold tracking-tighter leading-none mb-8 font-display italic flex flex-col items-center select-none">
          <span className="block text-gradient pr-2">Victor Nogueira</span>
          <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-4 md:pt-1 not-italic text-zinc-400 min-h-[1.1em]">
            &nbsp;
            <AnimatePresence mode="popLayout">
              {titles.map((title, index) => (
                titleNumber === index && (
                  <motion.span
                    key={index}
                    className="absolute"
                    initial={{ opacity: 0, y: 80, filter: isTouchDevice ? 'blur(0px)' : 'blur(10px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -80, filter: isTouchDevice ? 'blur(0px)' : 'blur(10px)' }}
                    transition={{
                      type: "spring",
                      stiffness: 70,
                      damping: 20,
                      opacity: { duration: 0.4 }
                    }}
                  >
                    {title}
                  </motion.span>
                )
              ))}
            </AnimatePresence>
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.9 }}
          className="text-zinc-500 text-lg md:text-xl font-light max-w-2xl mb-12"
        >
          Automações com <span className="text-black font-medium">N8N e IA</span> que eliminam processos manuais e escalam operações — sem precisar de uma equipe de TI.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-4"
        >
          <a
            href="#contato"
            className="group w-full sm:w-auto bg-black text-white px-8 md:px-12 py-4 md:py-5 rounded-full font-medium hover:bg-zinc-800 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-black/20 active:scale-95"
          >
            Vamos conversar
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <ArrowUpRight className="w-5 h-5" />
            </motion.div>
          </a>

          <a
            href="#projetos"
            onClick={(e) => {
              e.preventDefault();
              document.querySelector('#projetos')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 md:px-10 py-4 md:py-5 rounded-full border border-zinc-200 bg-white/50 backdrop-blur-sm text-zinc-600 font-medium hover:border-black hover:text-black transition-all"
          >
            Ver Cases
            <ChevronDown className="w-4 h-4" />
          </a>

          <div className="flex items-center gap-4">
            <a
              href="https://www.linkedin.com/in/victornogueira-vn"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 md:p-4 rounded-full border border-zinc-200 bg-white/50 backdrop-blur-sm hover:border-black hover:text-black text-zinc-400 transition-all hover:scale-110 shadow-sm"
              title="LinkedIn"
              aria-label="Perfil no LinkedIn de Victor Nogueira"
            >
              <Linkedin className="w-5 h-5" />
            </a>
            <a
              href="https://github.com/VictorN0gueira"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 md:p-4 rounded-full border border-zinc-200 bg-white/50 backdrop-blur-sm hover:border-black hover:text-black text-zinc-400 transition-all hover:scale-110 shadow-sm"
              title="GitHub"
              aria-label="Repositório no GitHub de Victor Nogueira"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll Down Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-2"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">Descubra</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="w-5 h-8 border-2 border-zinc-200 rounded-full flex justify-center p-1"
        >
          <div className="w-1 h-2 bg-zinc-300 rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
}
