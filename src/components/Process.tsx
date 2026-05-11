import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';

const isTouchDevice = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
import { Search, PenTool, Zap, Rocket, ChevronRight } from 'lucide-react';
import { PaperPlane } from './FloatingIcons';

const steps = [
  {
    number: '01',
    title: 'Descoberta',
    duration: '1 reunião · 30 min',
    description:
      'Mergulho nos seus processos atuais, identifico gargalos e mapeio oportunidades de automação com alto ROI.',
    icon: Search,
    color: '#8B5CF6',
  },
  {
    number: '02',
    title: 'Planejamento',
    duration: '1–2 dias',
    description:
      'Desenho a arquitetura da solução: fluxos de automação, integrações de IA e interfaces necessárias.',
    icon: PenTool,
    color: '#3B82F6',
  },
  {
    number: '03',
    title: 'Execução',
    duration: 'Sprints semanais',
    description:
      'Construo e testo cada fluxo em sprints rápidos. Entregas parciais para validação contínua com você.',
    icon: Zap,
    color: '#F59E0B',
  },
  {
    number: '04',
    title: 'Entrega & Suporte',
    duration: 'Contínuo',
    description:
      'Deploy, monitoramento e documentação completa. Suporte pós-entrega para ajustes e escalabilidade.',
    icon: Rocket,
    color: '#10B981',
  },
];

export default function Process() {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  // Formas geométricas com parallax — movem em velocidades diferentes
  const circleY1 = useTransform(scrollYProgress, [0, 1], isTouchDevice ? ['0%', '0%'] : ['15%', '-15%']);
  const circleY2 = useTransform(scrollYProgress, [0, 1], isTouchDevice ? ['0%', '0%'] : ['-10%', '20%']);
  const planeY   = useTransform(scrollYProgress, [0, 1], isTouchDevice ? ['0%', '0%'] : ['5%', '-25%']);

  return (
    <section
      id="processo"
      ref={sectionRef}
      className="py-32 px-6 md:px-12 bg-zinc-950 relative overflow-hidden"
    >
      {/* ── Formas geométricas de fundo ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Círculo grande — canto inferior esquerdo, parcialmente cortado */}
        <motion.div
          style={{ y: circleY1 }}
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full border border-white/[0.06] bg-white/[0.02]"
        />
        {/* Círculo médio — canto superior direito */}
        <motion.div
          style={{ y: circleY2 }}
          className="absolute -top-32 -right-32 w-[380px] h-[380px] rounded-full border border-white/[0.05] bg-white/[0.015]"
        />
        {/* Círculo pequeno sólido — centro-direita */}
        <div className="absolute top-1/2 right-[8%] -translate-y-1/2 w-48 h-48 rounded-full bg-white/[0.025]" />
      </div>

      {/* ── Avião de papel flutuante ── */}
      <motion.div
        style={{ y: planeY }}
        className="absolute top-16 right-[10%] md:right-[18%] z-10"
      >
        <PaperPlane className="w-20 h-20 md:w-24 md:h-24 text-white opacity-10" />
      </motion.div>

      <div className="max-w-7xl mx-auto relative z-10">

        {/* ── Cabeçalho ── */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-20">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <p className="text-xs font-bold uppercase tracking-[0.4em] text-zinc-500 mb-4">
              Metodologia
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold font-display italic tracking-tight text-white">
              Como eu trabalho
            </h2>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="text-zinc-500 text-base md:text-lg font-light max-w-sm md:text-right"
          >
            Processo estruturado para transformar operações manuais em{' '}
            <span className="text-white font-medium">máquinas de eficiência</span>.
          </motion.p>
        </div>

        {/* ── Cards + setas conectoras ── */}
        {/* Mobile: scroll horizontal com snap | Desktop: flex com largura igual */}
        <div className="flex items-stretch gap-0 overflow-x-auto pb-4 md:pb-0 snap-x snap-proximity md:snap-none scrollbar-hide overscroll-x-contain touch-pan-x md:touch-auto -mx-6 md:mx-0 px-6 md:px-0">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center gap-0 flex-shrink-0 md:flex-shrink md:flex-1">

              {/* ── Card ── */}
              <motion.div
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.7, delay: index * 0.12 }}
                className="group relative flex flex-col w-[280px] md:w-auto md:flex-1 min-h-[280px] p-8 rounded-2xl
                           bg-white/[0.03] border border-zinc-800
                           hover:border-zinc-600 hover:bg-white/[0.05]
                           transition-all duration-500 snap-start overflow-hidden"
              >
                {/* Número watermark */}
                <span
                  className="absolute bottom-4 right-6 text-[100px] font-black leading-none select-none
                             transition-all duration-500 group-hover:opacity-10"
                  style={{ color: `${step.color}18` }}
                >
                  {step.number}
                </span>

                {/* Ícone */}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110"
                  style={{ backgroundColor: `${step.color}15`, border: `1px solid ${step.color}25` }}
                >
                  <step.icon className="w-6 h-6" style={{ color: step.color }} />
                </div>

                {/* Conteúdo */}
                <h3 className="text-xl font-bold text-white mb-2 font-display">
                  {step.title}
                </h3>
                <span
                  className="inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-4 self-start"
                  style={{ backgroundColor: `${step.color}15`, color: step.color }}
                >
                  {step.duration}
                </span>
                <p className="text-zinc-500 font-light text-sm leading-relaxed">
                  {step.description}
                </p>
              </motion.div>

              {/* ── Seta conectora (apenas entre cards, desktop) ── */}
              {index < steps.length - 1 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.12 + 0.3 }}
                  className="hidden md:flex flex-shrink-0 items-center justify-center w-10"
                >
                  <ChevronRight className="w-5 h-5 text-zinc-700" />
                </motion.div>
              )}
            </div>
          ))}
        </div>

        {/* ── Indicador de scroll mobile ── */}
        <div className="flex justify-center gap-2 mt-6 md:hidden">
          {steps.map((step, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: step.color, opacity: 0.4 }}
            />
          ))}
        </div>

      </div>
    </section>
  );
}
