import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Github, Linkedin, ArrowUpRight } from 'lucide-react';

export default function Hero() {
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(
    () => ["Automação", "Processos", "IA", "Inovação", "Resultados"],
    []
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  return (
    <section className="pt-32 pb-20 px-6 md:px-12 max-w-7xl mx-auto min-h-[80vh] flex flex-col justify-center items-center text-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-4xl flex flex-col items-center"
      >
        <h2 className="text-zinc-500 font-medium tracking-[0.2em] uppercase text-[11px] md:text-xs mb-6 border-l-2 md:border-l-0 md:border-b-2 border-black pl-4 md:pl-0 md:pb-2">
          Soluções em Automação & IA
        </h2>
        <h1 className="text-5xl sm:text-6xl md:text-8xl font-bold tracking-tighter leading-[1.1] mb-8 font-display italic flex flex-col items-center">
          <span className="block">Victor Nogueira.</span>
          <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-4 md:pt-1 not-italic text-zinc-400 min-h-[1.2em]">
            &nbsp;
            <AnimatePresence mode="popLayout">
              {titles.map((title, index) => (
                titleNumber === index && (
                  <motion.span
                    key={index}
                    className="absolute"
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -100 }}
                    transition={{ type: "spring", stiffness: 50, damping: 15 }}
                  >
                    {title}
                  </motion.span>
                )
              ))}
            </AnimatePresence>
          </span>
        </h1>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-8 md:mt-12">
          <a 
            href="#contato" 
            className="w-full sm:w-auto bg-black text-white px-8 md:px-10 py-4 md:py-5 rounded-full font-medium hover:bg-zinc-800 transition-all flex items-center justify-center gap-3 shadow-lg shadow-black/10 hover:shadow-xl hover:-translate-y-1"
          >
            Vamos conversar <ArrowUpRight className="w-5 h-5" />
          </a>
          <div className="flex items-center gap-4">
            <a 
              href="https://www.linkedin.com/in/victornogueira-vn" 
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 md:p-4 rounded-full border border-zinc-200 hover:border-black hover:text-black text-zinc-500 transition-all hover:scale-110"
            >
              <Linkedin className="w-5 h-5" />
            </a>
            <a 
              href="https://github.com/VictorN0gueira" 
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 md:p-4 rounded-full border border-zinc-200 hover:border-black hover:text-black text-zinc-500 transition-all hover:scale-110"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
