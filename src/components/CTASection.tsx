import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { MessageCircle, ArrowUpRight, Clock, MapPin } from 'lucide-react';
import { Cursor, Sparkle } from './FloatingIcons';

const WA_LINK = "https://wa.me/5581987348633?text=Ol%C3%A1%2C+Victor!+Quero+agendar+uma+conversa+sobre+automa%C3%A7%C3%B5es.";

export default function CTASection() {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const cursorY  = useTransform(scrollYProgress, [0, 1], ['10%', '-20%']);
  const sparkleY = useTransform(scrollYProgress, [0, 1], ['-5%', '15%']);
  const circle1Y = useTransform(scrollYProgress, [0, 1], ['8%', '-12%']);
  const circle2Y = useTransform(scrollYProgress, [0, 1], ['-8%', '10%']);

  return (
    <section ref={sectionRef} className="py-32 px-6 md:px-12 bg-zinc-950 relative overflow-hidden">

      {/* ── Formas geométricas crisp ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Semicírculo grande — base esquerda */}
        <motion.div
          style={{ y: circle1Y }}
          className="absolute -bottom-52 -left-32 w-[500px] h-[500px] rounded-full bg-white/[0.03]"
        />
        {/* Semicírculo médio — topo direito */}
        <motion.div
          style={{ y: circle2Y }}
          className="absolute -top-44 -right-28 w-[380px] h-[380px] rounded-full bg-white/[0.025]"
        />
        {/* Anel outline — centro-esquerda */}
        <div className="absolute top-1/2 left-[8%] -translate-y-1/2 w-[200px] h-[200px] rounded-full border border-white/[0.05]" />
        {/* Glow difuso emerald */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/5 blur-[120px] rounded-full" />
      </div>

      {/* ── Cursor flutuante — canto inferior direito ── */}
      <motion.div
        style={{ y: cursorY }}
        className="absolute bottom-16 right-[6%] md:right-[10%] z-10"
      >
        <Cursor className="w-20 h-24 md:w-28 md:h-32 text-white opacity-[0.07]" />
      </motion.div>

      {/* ── Asterisco — canto superior esquerdo ── */}
      <motion.div
        style={{ y: sparkleY }}
        className="absolute top-20 left-[8%] md:left-[14%] z-10"
      >
        <Sparkle className="w-10 h-10 md:w-12 md:h-12 text-emerald-400 opacity-20" />
      </motion.div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-10">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-emerald-400 font-bold text-[10px] uppercase tracking-[0.25em]">
              Conversa Gratuita
            </span>
          </div>

          {/* Headline */}
          <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-white font-display italic mb-8 leading-tight sm:leading-none">
            30 minutos para{' '}
            <span className="not-italic bg-clip-text text-transparent bg-linear-to-r from-emerald-400 to-emerald-300">
              transformar
            </span>
            <br />
            sua operação.
          </h2>

          {/* Subtitle */}
          <p className="text-zinc-400 text-lg md:text-xl font-light max-w-2xl mx-auto mb-12 leading-relaxed">
            Me conta o que está travando seu negócio. Mapeio as automações com{' '}
            <span className="text-white font-medium">maior ROI</span> e apresento um diagnóstico{' '}
            <span className="text-white font-medium">sem compromisso</span>.
          </p>

          {/* CTA Button */}
          <motion.a
            href={WA_LINK}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-white px-6 sm:px-10 py-4 sm:py-5 rounded-full font-bold text-xs sm:text-sm uppercase tracking-widest transition-colors shadow-2xl shadow-emerald-500/20 mb-10"
          >
            <MessageCircle className="w-5 h-5" />
            Falar no WhatsApp
            <ArrowUpRight className="w-4 h-4" />
          </motion.a>

          {/* Fine print */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-zinc-500 text-xs">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Respondo em até 1h
            </span>
            <span className="w-1 h-1 bg-zinc-700 rounded-full hidden sm:block" />
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              Remoto
            </span>
            <span className="w-1 h-1 bg-zinc-700 rounded-full hidden sm:block" />
            <span>Sem compromisso</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
